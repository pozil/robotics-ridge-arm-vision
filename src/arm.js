const Winston = require('winston'),
  Maestro = require('./maestro'),
  Raspistill = require('node-raspistill').Raspistill;

// Configure logs
Winston.loggers.add('ARM', {
  console: { level: 'info', colorize: true, label: 'ARM' }
});
const LOG = Winston.loggers.get('ARM');

const TARGETS = {
  home: {
    'arm-1': [
      {channel: 0, target: 1500},
      {channel: 1, target: 1500},
      {channel: 2, target: 1500},
      {channel: 3, target: 1500},
      {channel: 4, target: 1500},
      {channel: 5, target: 1500},
    ],
    'arm-2': [
      {channel: 0, target: 1500},
      {channel: 1, target: 1600},
      {channel: 2, target: 1500},
      {channel: 3, target: 1300},
      {channel: 4, target: 1500},
      {channel: 5, target: 1500},
    ],
  },

  positionToCapturePicture: { // Move above object, lower arm, rotate wrist and open claw
    'arm-1': [
      {channel: 0, target: 1220},
      {channel: 1, target: 1400},
      {channel: 2, target: 1330},
      {channel: 3, target: 1840},
      {channel: 4, target: 1430},
      {channel: 5, target: 2000},
    ],
    'arm-2': [
      {channel: 0, target: 1780},
      {channel: 1, target: 1550},
      {channel: 2, target: 1600},
      {channel: 3, target: 1500},
      {channel: 4, target: 1600},
      {channel: 5, target: 2000},
    ],
  },

  lowerArmToGrabPayload: { // Lower arm to grab payload
    'arm-1': [
      {channel: 1, target: 1050},
      {channel: 2, target: 1500},
    ],
    'arm-2': [
      {channel: 1, target: 1350},
      {channel: 2, target: 1700},
    ],
  },

  movePayload1: { // Turns away from object and raise arm
    'arm-1': [
      {channel: 1, target: 1500},
    ],
    'arm-2': [
      {channel: 0, target: 1400},
      {channel: 1, target: 1850},
    ],
  },

  movePayload2: { // Turns away from object and raise arm
    'arm-1': [
      {channel: 0, target: 1600},
      {channel: 1, target: 1440},
      {channel: 2, target: 1600},
    ],
    'arm-2': [
      {channel: 0, target: 1370},
      {channel: 1, target: 1780},
      {channel: 2, target: 1700},
    ],
  },
}

const SLEEPS = {
  movePayload1: {
    'arm-1': 6000,
    'arm-2': 10200,
  },
  dropPayload: {
    'arm-1': 4000,
    'arm-2': 3500,
  }
}


function sleep(duration) {
  return new Promise((resolve, reject) => {
    LOG.debug('Sleep', duration);
    setTimeout(() => {
      resolve();
    }, duration);
  });
}


module.exports = class ARM {

  constructor(hostname) {
    this.hostname = hostname;
    this.maestro = new Maestro();
    this.camera = new Raspistill({
      noFileSave: true,
      verticalFlip: false,
      width: 1296,
      height: 972,
      time: 0
    });
  }

  init(shouldReturnToHome=true) {
    LOG.debug('Connecting to Maestro');
    if (shouldReturnToHome) {
      return this.maestro.connect()
      .then(() => {
        return this.goHome();
      })
      .then(() => {
        return sleep(6000);
      });
    }
    else {
      return this.maestro.connect();
    }
  }

  disconnect() {
    LOG.debug('Disconnecting');
    return this.maestro.disconnect();
  }

  goHome() {
    LOG.debug('Moving to home position');
    return this.maestro.setTargets(TARGETS.home[this.hostname]);
  }

  positionToCapturePicture() {
    LOG.debug('Moving to capture picture');
    // Move above object, lower arm, rotate wrist and open claw
    return this.maestro.setTargets(TARGETS.positionToCapturePicture[this.hostname]);
  }

  capturePicture() {
    LOG.debug('Capturing picture');
    return this.camera.takePhoto();
  }

  grabAndTransferPayload() {
    LOG.debug('Grabing and tranfering payload');
    // Lower arm
    return this.maestro.setTargets(TARGETS.lowerArmToGrabPayload[this.hostname])
    .then(() => {
      return sleep(6500);
    })
    .then(() => {
      // Close claw
      return this.maestro.setTarget(5, 1150);
    })
    .then(() => {
      return sleep(1000);
    })
    .then(() => {
      // Start to raise arm
      return this.maestro.setTargets(TARGETS.movePayload1[this.hostname]);
    })
    .then(() => {
      return sleep(SLEEPS.movePayload1[this.hostname]);
    })
    .then(() => {
      // Turns away from object and raise arm
      return this.maestro.setTargets(TARGETS.movePayload2[this.hostname]);
    })
    .then(() => {
      return sleep(SLEEPS.dropPayload[this.hostname]);
    })
    .then(() => {
      // Open claw
      return this.maestro.setTarget(5, 1700);
    })
    .then(() => {
      return sleep(2000);
    })
    .then(() => {
      return this.goHome();
    })
  }
}
