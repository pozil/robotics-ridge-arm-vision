const Winston = require('winston'),
  Sinon = require('sinon'),
  JsHamcrest = require('jshamcrest').JsHamcrest,
  Protocol = require('../src/maestro-protocol-constants');
  ByteUtils = require('../src/byte-utils'),
  IoSequencer = require('../src/io-sequencer'),
  SerialPort = require('serialport/test'),
  MockBinding = SerialPort.Binding;

// Configure logs
Winston.default.transports.console.level='debug';
Winston.loggers.add('IoSequencerTest', {
  console: { level: 'info', colorize: true, label: 'IoSequencerTest' }
});
const LOG = Winston.loggers.get('IoSequencerTest');
// Configure system events
process.on('warning', e => LOG.warn(e.stack));
process.on('unhandledRejection', (reason, p) => {
  LOG.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
// Configure tests
JsHamcrest.Integration.Nodeunit();


module.exports = {
	setUp: function (done) {
		MockBinding.createPort('/dev/testMock', { echo: false, record: false });
    this.port = new SerialPort('/dev/testMock', { autoOpen: false });

    this.simulatedTraffic = [{ // When checking for error, report no error
			input: [ Protocol.CMD_CHECK_ERROR.firstByte ],
			output: [0x00, 0x00]
		}];

		// Simulates IO sequences based on simulatedTraffic variable
    Sinon.stub(this.port, 'write').callsFake((writtenBytes) => {
      const bytesIn = Array.isArray(writtenBytes) ? writtenBytes : [writtenBytes];
      const trafficSequence = this.simulatedTraffic.find((sequence) => ByteUtils.compareByteArrays(sequence.input, bytesIn));
      if (trafficSequence) {
        this.port.binding.emitData(trafficSequence.output);
      }
    });

    this.ioSequencer = new IoSequencer(this.port);

		done();
	},

	tearDown: function (done) {
    MockBinding.reset();
    this.port.write.restore();
		done();
  },

  'Should process operation without response': function (test) {
    this.port.open(() => {
      this.ioSequencer.writeAndRead([0x01], 0, (data) => {
        test.ok(typeof data === 'undefined', 'Should not return response data');
        test.done();
      });
    });
  },

  'Should process chained operations': function (test) {
    this.simulatedTraffic.push({
      input: [0x01],
			output: [0x02, 0x03]
    });
    this.simulatedTraffic.push({
      input: [0x04],
			output: [0x05]
    });

    let parsedBytes = 0;

    this.port.open(() => {
      this.ioSequencer.writeAndRead([0x01], 2, (data) => {
        LOG.debug('Parse 1', ByteUtils.bytesToString(data));
        parsedBytes += data.length;
        test.deepEqual([0x02, 0x03], data, 'Invalid data read on first parse');
      });

      this.ioSequencer.writeAndRead([0x04], 1, (data) => {
        LOG.debug('Parse 2', ByteUtils.bytesToString(data));
        parsedBytes += data.length;
        test.deepEqual([0x05], data, 'Invalid data read on second parse');
      });
    });

    setTimeout(() => {
      test.equal(3, parsedBytes, 'Has not parsed enough bytes');
      test.done();
    }, 500);
  },

  'Should report error': function (test) {
    this.simulatedTraffic = [{ // When checking for error, report error
			input: [ Protocol.CMD_CHECK_ERROR.firstByte ],
			output: [0x01, 0x00]
		}, {
      input: [0x01],
			output: [0x02, 0x03]
    }];

    this.ioSequencer.once('error', (errorCode, message) => {
      test.equal(1, errorCode, 'Invalid error code');
      test.equal(Protocol.ERRORS[0].message, message, 'Invalid error message');
      test.done();
    });

    this.port.open(() => {
      this.ioSequencer.writeAndRead([0x01], 2, (data) => {
        test.deepEqual([0x02, 0x03], data, 'Invalid data read');
      });
    });
  },

  'Should read timeout': function (test) {
    this.simulatedTraffic = [];

    this.ioSequencer.once('readTimeout', (writtenBytes, expectedResponseSize) => {
      test.deepEqual([0x01], writtenBytes, 'Invalid written bytes');
      test.equal(2, expectedResponseSize, 'Invalid expected response size');
      test.done();
    });

    this.port.open(() => {
      this.ioSequencer.writeAndRead([0x01], 2, (data) => {
        test.ok(false, 'Should not process request');
      });
    });
  },
}
