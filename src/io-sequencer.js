const EventEmitter = require('events')
  Winston = require('winston'),
  SerialPort = require('serialport'),
  Protocol = require('./maestro-protocol-constants');
  ByteUtils = require('./byte-utils');

// Configure logs
Winston.loggers.add('IoSequencer', {
  console: { level: 'info', colorize: true, label: 'IoSequencer' }
});
const LOG = Winston.loggers.get('IoSequencer');

const ByteLength = SerialPort.parsers.ByteLength;


module.exports = class IoSequencer extends EventEmitter {
  constructor(port) {
    super();

    this.port = port;
    this.queue = [];
    this.isLocked = false;
    this.readTimeout = null;

    this.errorCheckSequence = {
      writtenBytes: [ Protocol.CMD_CHECK_ERROR.firstByte ],
      readByteLength: Protocol.CMD_CHECK_ERROR.responseSize,
      callback: (data) => {
        this.processErrorResponse(data);
      }
    };
  }

  writeAndRead(writtenBytes, readByteLength, callback=null) {
    this.queue.push({
      writtenBytes: Array.isArray(writtenBytes) ? writtenBytes : [writtenBytes],
      readByteLength: readByteLength,
      callback: callback,
    });
    this.queue.push(this.errorCheckSequence);
    this.processQueue();
  }

  processQueue() {
    if (this.isLocked || this.queue.length === 0) {
      return;
    }

    // Process next IO sequence
    this.isLocked = true;
    const ioSequence = this.queue.shift();

    // Wait for response if needed
    if (ioSequence.readByteLength > 0) {
      const parser = new ByteLength({length: ioSequence.readByteLength});
      this.port.pipe(parser);
      parser.once('data', (readData) => {
        LOG.debug('Reading', ByteUtils.bytesToString(readData));
        this.port.unpipe(parser);
        if (this.readTimeout !== null) {
          clearTimeout(this.readTimeout);
          this.readTimeout = null;
        }
        if (ioSequence.callback) {
          ioSequence.callback(readData);
        }
        // Unlock queue and check for next IO sequence
        this.isLocked = false;
        this.processQueue();
      });
    }

    // Send request
    LOG.debug('Writing', ByteUtils.bytesToString(ioSequence.writtenBytes));
    this.port.write(ioSequence.writtenBytes);

    // Wait for write to be completed
    this.port.drain((error) => {
      if (error) {
        throw error;
      }

      // Do not wait for response if none is expected
      if (ioSequence.readByteLength === 0) {
        if (ioSequence.callback) {
          ioSequence.callback();
        }
        // Unlock queue and check for next IO sequence
        this.isLocked = false;
        this.processQueue();
      } else {
        // Set response read timeout
        this.readTimeout = setTimeout(() => {
          LOG.error('Response read timeout. Request:', ByteUtils.bytesToString(ioSequence.writtenBytes), 'Expected response size:', ioSequence.readByteLength);
          this.emit('readTimeout', ioSequence.writtenBytes, ioSequence.readByteLength);
        }, Protocol.READ_TIMEOUT);
      }
    });
  }

  processErrorResponse(data) {
    const code = ByteUtils.fromLowAndHigh8Bits(data);
    if (code !== 0) {
			for (let i=0; i<Protocol.ERRORS.length; i++) {
				if (code & Protocol.ERRORS[i].code) {
					LOG.error(Protocol.ERRORS[i].message);
          this.emit('error', code, Protocol.ERRORS[i].message);
          return;
				}
			}
		}
  }
}
