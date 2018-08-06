const EventEmitter = require('events')
  Winston = require('winston'),
  SerialPort = require('serialport'),
  Protocol = require('./maestro-protocol-constants');
  ByteUtils = require('./byte-utils'),
  IoSequencer = require('./io-sequencer');

// Configure logs
Winston.loggers.add('Maestro', {
  console: { level: 'info', colorize: true, label: 'Maestro' }
});
const LOG = Winston.loggers.get('Maestro');


module.exports = class Maestro {
  constructor() {
    this.port = null;
    this.sequencer = null;
  }

  connect() {
    return this._findMaestroPort().then((portData) => {
      return new Promise((resolve, reject) => {
        this.port = new SerialPort(portData.comName, { autoOpen: false });
        LOG.debug('Connecting...');
        this.port.open((error) => {
          if (error) {
            LOG.error('Failed to open port', error);
            return reject(error);
          }
          this.sequencer = new IoSequencer(this.port);
          return resolve();
        });
      });
    });
  }

  _findMaestroPort() {
    LOG.debug('Searching for port...');
    return SerialPort.list().then((ports) => {
      LOG.debug('Listing available ports:', ports);
      return new Promise((resolve, reject) => {
          const port = ports.find(port => port.vendorId === Protocol.VENDOR_ID);
          if (typeof port === 'undefined') {
            return reject(new Error('Did not find serial port with expected vendor id: '+ Protocol.VENDOR_ID));
          }
          LOG.debug('Found port:', port);
          return resolve(port);
      });
    });
  }

  setTarget(channel, target) {
    LOG.debug('Setting target', channel, target);
    return this._checkConnection()
    .then(() => {
      return this._checkValueInRange('Channel', channel, 0, 5)
    })
    .then(() => {
      return this._checkValueInRange('Target', target, 640, 2304)
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        const command = Protocol.CMD_SET_TARGET;
        const commandBytes = [ command.firstByte, channel ].concat(ByteUtils.toLowAndHighBits(target * 4));
        this.sequencer.writeAndRead(commandBytes, command.responseSize, () => {
          return resolve();
        });
      });
    });
  }

  setTargets(params) {
    const promises = params.map(param => {
      return this.setTarget(param.channel, param.target);
    });
    return Promise.all(promises);
  }

  getPosition(channel) {
    return this._checkConnection()
    .then(() => {
      return this._checkValueInRange('Channel', channel, 0, 5)
    })
    .then(() => {
      return new Promise((resolve, reject) => {
        const command = Protocol.CMD_GET_POSITION;
        const commandBytes = [ command.firstByte, channel ];
        this.sequencer.writeAndRead(commandBytes, command.responseSize, (data) => {
          const position = ByteUtils.fromLowAndHigh8Bits(data) / 4;
          LOG.debug('Read position', channel, position);
          return resolve(position);
        });
      });
    });
  }

  goHome() {
    LOG.debug('Go home');
    return this._checkConnection()
    .then(() => {
      return new Promise((resolve, reject) => {
        const command = Protocol.CMD_HOME;
        const commandBytes = [ command.firstByte ];
        this.sequencer.writeAndRead(commandBytes, command.responseSize, () => {
          return resolve();
        });
      });
    });
  }

  isMoving() {
    return this._checkConnection()
    .then(() => {
      return new Promise((resolve, reject) => {
        const command = Protocol.CMD_GET_MOVING_STATE;
        const commandBytes = [ command.firstByte ];
        this.sequencer.writeAndRead(commandBytes, command.responseSize, (data) => {
          LOG.debug('Is moving:', data[0]);
          return resolve(data[0] ? true : false);
        });
      });
    });
  }

  _checkConnection() {
    return new Promise((resolve, reject) => {
      if (this.port === null || !this.port.binding.isOpen) {
        const message = 'Cannot issue command, SerialPort is not connected';
        LOG.error(message);
        return reject(new Error(message));
      }
      return resolve();
    });
  }

  _checkValueInRange(label, value, min, max) {
    return new Promise((resolve, reject) => {
      if (typeof value !== 'number') {
        const message = label +' value should be a number, was: '+ value;
        LOG.error(message);
        return reject(new Error(message));
      }
      if (value < min || value > max) {
        const message = label +' value should be '+ min +'-'+ max +', was: '+ value;
        LOG.error(message);
        return reject(new Error(message));
      }
      return resolve();
    });
  }

  disconnect() {
    LOG.debug('Disconnecting...');
    return new Promise((resolve, reject) => {
      this.port.close((error) => {
        if (error) {
          return reject(error);
        }
        return resolve();
      });
    });
  }
}
