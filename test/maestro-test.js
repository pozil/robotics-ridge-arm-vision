const Winston = require('winston'),
  Sinon = require('sinon'),
  JsHamcrest = require('jshamcrest').JsHamcrest,
  Protocol = require('../src/maestro-protocol-constants');
  Maestro = require('../src/maestro'),
  SerialPort = require('serialport/test'),
  MockBinding = SerialPort.Binding;

// Configure logs
Winston.default.transports.console.level='debug';
Winston.loggers.add('MaestroTest', {
  console: { level: 'info', colorize: true, label: 'MaestroTest' }
});
const LOG = Winston.loggers.get('MaestroTest');
// Configure system events
process.on('warning', e => LOG.warn(e.stack));
process.on('unhandledRejection', (reason, p) => {
  LOG.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
// Configure tests
JsHamcrest.Integration.Nodeunit();

const MOCK_PORT_PATH = '/dev/testMock';

module.exports = {
	setUp: function (done) {
		MockBinding.createPort(MOCK_PORT_PATH, { echo: false, record: false });
    this.maestro = new Maestro();

    this.mockPortData = [{
      comName: MOCK_PORT_PATH,
      vendorId: Protocol.VENDOR_ID,
    }];

    Sinon.stub(SerialPort, 'list').callsFake(() => {
      return new Promise((resolve, reject) => {
        return resolve(this.mockPortData);
      });
    });

    done();
	},

	tearDown: function (done) {
    MockBinding.reset();
    SerialPort.list.restore();
    done();
  },

  'Should find Maestro port when available': function (test) {
    this.maestro._findMaestroPort().then((port) => {
      test.equal(MOCK_PORT_PATH, port.comName, 'Invalid port path');
      test.equal(Protocol.VENDOR_ID, port.vendorId, 'Invalid port vendor id');
      test.done();
    });
  },

  'Should not find Maestro port when invalid vendor id': function (test) {
    this.mockPortData = [{
      comName: MOCK_PORT_PATH,
      vendorId: 'invalid',
    }];

    this.maestro._findMaestroPort().then((port) => {
      test.ok(false, 'Should not find Maestro port');
      test.done();
    })
    .catch((error) => {
      test.done();
    });
  },

  'Should connect when port is available': function (test) {
    this.maestro.connect()
    .then(() => {
      test.ok(this.maestro.port.binding.isOpen, 'SerialPort should be open');
      test.done();
    });
  },

  'Should setTarget work': function (test) {
    this.maestro.connect()
    .then(() => {
      Sinon.spy(this.maestro.sequencer, 'writeAndRead');
      return this.maestro.setTarget(2, 1500);
    })
    .then(() => {
      test.deepEqual([ Protocol.CMD_SET_TARGET.firstByte, 0x02, 0x70, 0x2E ], this.maestro.sequencer.writeAndRead.getCall(0).args[0], 'Invalid bytes sent');
      test.done();
    });
  },

  'Should setTarget fail when not connected': function (test) {
    this.maestro.setTarget(0, 1000)
    .catch((error) => {
      test.done();
    });
  },

  'Should setTarget fail when channel out of range': function (test) {
    this.maestro.connect()
    .then(() => {
      return this.maestro.setTarget(6, 1000);
    })
    .catch((error) => {
      test.done();
    });
  },

  'Should setTarget fail when target out of range': function (test) {
    this.maestro.connect()
    .then(() => {
      return this.maestro.setTarget(0, 200);
    })
    .catch((error) => {
      test.done();
    });
  },

  'Should getPosition work': function (test) {
    this.maestro.connect()
    .then(() => {
      Sinon.stub(this.maestro.sequencer, 'writeAndRead').callsFake((writtenBytes, readByteLength, callback) => {
        if (ByteUtils.compareByteArrays([ Protocol.CMD_GET_POSITION.firstByte, 0x02 ], writtenBytes)) {
          callback([0x07, 0x0A]);
        }
      });
      return this.maestro.getPosition(2);
    })
    .then((postion) => {
      test.equal(641.75, postion, 'Invalid position');
      test.done();
    });
  },

  'Should getPosition fail when not connected': function (test) {
    this.maestro.getPosition(2)
    .catch((error) => {
      test.done();
    });
  },

  'Should getPosition fail when channel out of range': function (test) {
    this.maestro.connect()
    .then(() => {
      return this.maestro.getPosition(6);
    })
    .catch((error) => {
      test.done();
    });
  },

  'Should goHome work': function (test) {
    this.maestro.connect()
    .then(() => {
      Sinon.spy(this.maestro.sequencer, 'writeAndRead');
      return this.maestro.goHome();
    })
    .then(() => {
      test.deepEqual([ Protocol.CMD_HOME.firstByte ], this.maestro.sequencer.writeAndRead.getCall(0).args[0], 'Invalid bytes sent');
      test.done();
    });
  },

  'Should goHome fail when not connected': function (test) {
    this.maestro.goHome()
    .catch((error) => {
      test.done();
    });
  },

  'Should isMoving work when moving': function (test) {
    this.maestro.connect()
    .then(() => {
      Sinon.stub(this.maestro.sequencer, 'writeAndRead').callsFake((writtenBytes, readByteLength, callback) => {
        if (ByteUtils.compareByteArrays([ Protocol.CMD_GET_MOVING_STATE.firstByte ], writtenBytes)) {
          callback([0x01]);
        }
      });
      return this.maestro.isMoving();
    })
    .then((isMoving) => {
      test.equal(true, isMoving, 'Invalid motion state');
      test.done();
    });
  },

  'Should isMoving work when not moving': function (test) {
    this.maestro.connect()
    .then(() => {
      Sinon.stub(this.maestro.sequencer, 'writeAndRead').callsFake((writtenBytes, readByteLength, callback) => {
        if (ByteUtils.compareByteArrays([ Protocol.CMD_GET_MOVING_STATE.firstByte ], writtenBytes)) {
          callback([0x00]);
        }
      });
      return this.maestro.isMoving();
    })
    .then((isMoving) => {
      test.equal(false, isMoving, 'Invalid motion state');
      test.done();
    });
  },

  'Should isMoving fail when not connected': function (test) {
    this.maestro.isMoving()
    .catch((error) => {
      test.done();
    });
  },

  'Should disconnect work': function (test) {
    this.maestro.connect()
    .then(() => {
      return this.maestro.disconnect()
    })
    .then(() => {
        test.done();
    });
  },
}
