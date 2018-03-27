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
    const target0 = (this.hostname === 'arm-1') ? 1220 : 1780;
    return this.maestro.setTargets([
      {channel: 0, target: target0},
      {channel: 1, target: 1400},
      {channel: 2, target: 1330},
      {channel: 3, target: 1840},
      {channel: 4, target: 1430},
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
    return this.maestro.setTargets([
      {channel: 1, target: 1050},
      {channel: 2, target: 1500},
    ])
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
      return this.maestro.setTarget(1, 1500);
    })
    .then(() => {
      return sleep(6000);
    })
    .then(() => {
      // Turns away from object and raise arm
      const target0 = (this.hostname === 'arm-1') ? 1600 : 1400;
      return this.maestro.setTargets([
        {channel: 0, target: target0},
        {channel: 1, target: 1440},
        {channel: 2, target: 1600},
      ]);
    })
    .then(() => {
      return sleep(3800);
    })
    .then(() => {
      // Open claw
      return this.maestro.setTarget(5, 1700);
    })
    .then(() => {
      return sleep(1000);
    })
  }

  calibrateMin() {
    LOG.debug('Calibrating min');
    return this.maestro.setTargets([
      {channel: 0, target: 1500},
      {channel: 1, target: 1000},
      {channel: 2, target: 1000},
      {channel: 3, target: 1000},
      {channel: 4, target: 1000},
      {channel: 5, target: 1000},
    ]);
  }

  calibrateMax() {
    LOG.debug('Calibrating max');
    return this.maestro.setTargets([
      {channel: 0, target: 1500},
      {channel: 1, target: 2000},
      {channel: 2, target: 2000},
      {channel: 3, target: 2000},
      {channel: 4, target: 2000},
      {channel: 5, target: 2000},
    ]);
  }
}
