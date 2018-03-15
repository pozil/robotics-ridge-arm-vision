const Winston = require('winston'),
  Maestro = require('./maestro'),
  Raspistill = require('node-raspistill').Raspistill;

// Configure logs
Winston.loggers.add('ARM', {
  console: { level: 'info', colorize: true, label: 'ARM' }
});
const LOG = Winston.loggers.get('ARM');


function sleep(duration) {
  return new Promise((resolve, reject) => {
    LOG.debug('Sleep', duration);
    setTimeout(() => {
      resolve();
    }, duration);
  });
}


module.exports = class ARM {

  constructor() {
    this.maestro = new Maestro();
    this.camera = new Raspistill({
      noFileSave: true,
      verticalFlip: false,
      width: 1296,
      height: 972,
      time: 0
    });
  }

  init() {
    LOG.debug('Connecting to Maestro');
    return this.maestro.connect()
    .then(() => {
      return this.goHome();
    })
    .then(() => {
      return sleep(6000);
    });
  }

  disconnect() {
    LOG.debug('Disconnecting');
    return this.maestro.disconnect();
  }

  goHome() {
    LOG.debug('Moving to home position');
    const targets = [];
    for (let i=0; i<6; i++) {
      const channel = i;
      targets.push({channel: channel, target: 1500});
    }
    return this.maestro.setTargets(targets);
  }

  positionToCapturePicture() {
    LOG.debug('Moving to capture picture');
    // Move above object, lower arm, rotate wrist and open claw
    return this.maestro.setTargets([
      {channel: 0, target: 1700},
      {channel: 1, target: 1300},
      {channel: 4, target: 1450},
      {channel: 5, target: 2000},
    ]);
  }

  capturePicture() {
    LOG.debug('Capturing picture');
    return this.camera.takePhoto();
  }

  grabAndTransferPayload() {
    LOG.debug('Grabing and tranfering payload');
    // Lower arm
    return this.maestro.setTarget(1, 1100)
    .then(() => {
      return sleep(1500);
    })
    .then(() => {
      // Close claw
      return this.maestro.setTarget(5, 1325);
    })
    .then(() => {
      return sleep(1000);
    })
    .then(() => {
      // Turns away from object and raise arm
      return this.maestro.setTargets([
        {channel: 0, target: 1500},
        {channel: 1, target: 1350},
      ]);
    })
    .then(() => {
      return sleep(5000);
    })
    .then(() => {
      // Open claw
      return this.maestro.setTarget(5, 1700);
    })
    .then(() => {
      return sleep(1000);
    })
  }
}
