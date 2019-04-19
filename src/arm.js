const Winston = require('winston'),
  { PwmDriver, usleep } = require('adafruit-i2c-pwm-driver-async'),
  Raspistill = require('node-raspistill').Raspistill;

// Configure logs
Winston.loggers.add('ARM', {
  console: { level: 'info', colorize: true, label: 'ARM' }
});
const LOG = Winston.loggers.get('ARM');


const TARGETS = {
  home: { // Move to home position
    'arm-1': [
      {channel: 0, target: 1500},
      {channel: 1, target: 1500},
      {channel: 2, target: 1500},
      {channel: 3, target: 1500},
      {channel: 4, target: 1500},
      {channel: 5, target: 1500},
    ]
  },

  positionToCapturePicture: { // Move above object, lower arm, rotate wrist and open claw
    'arm-1': [
      {channel: 0, target: 1220},
      {channel: 1, target: 1400},
      {channel: 2, target: 1330},
      {channel: 3, target: 1840},
      {channel: 4, target: 1430},
      {channel: 5, target: 2000},
    ]
  },

  lowerArmToGrabPayload: { // Lower arm to grab payload
    'arm-1': [
      {channel: 1, target: 1050},
      {channel: 2, target: 1500},
    ]
  },

  movePayload1: { // Turns away from object and raise arm
    'arm-1': [
      {channel: 1, target: 1500},
    ]
  },

  movePayload2: { // Turns away from object and raise arm
    'arm-1': [
      {channel: 0, target: 1600},
      {channel: 1, target: 1440},
      {channel: 2, target: 1600},
    ]
  },
}

const SLEEPS = {
  movePayload1: {
    'arm-1': 6000,
  },
  dropPayload: {
    'arm-1': 4400,
  }
}


module.exports = class ARM {

  constructor(hostname, isMockArm) {
    this.hostname = hostname;
    this.driver = new PwmDriver({address: 0x40, device: '/dev/i2c-1', debug: true, i2cDebug: false, isMockDriver: isMockArm});
    if (isMockArm) {
      this.camera = null;
    } else {
      this.camera = new Raspistill({
        noFileSave: true,
        verticalFlip: false,
        width: 800,
        height: 600,
        time: 100
      });
    }
  }

  init() {
    LOG.debug('Connecting to ARM');
    return this.driver.init()
      .then(this.driver.setPWMFreq(50))
      .then(this.goHome())
      .then(usleep(6000));
  }

  disconnect() {
    LOG.debug('Disconnecting');
    return this.driver.stop();
  }

  goHome() {
    LOG.debug('Moving to home position');
    return this.setTargets(TARGETS.home[this.hostname]);
  }

  positionToCapturePicture() {
    LOG.debug('Moving to capture picture');
    // Move above object, lower arm, rotate wrist and open claw
    return this.setTargets(TARGETS.positionToCapturePicture[this.hostname]);
  }

  capturePicture() {
    LOG.debug('Capturing picture');
    if (this.camera === null) {
      return new Promise(resolve => resolve());
    }
    return this.camera.takePhoto();
  }

  grabAndTransferPayload(eventData) {
    LOG.debug('Grabing and tranfering payload');
    // Get object position
    const probabilities = JSON.parse(eventData.Prediction__c).probabilities;
    probabilities.forEach(probability => {
      const box = probability.boundingBox;
      probability.center = {
        x : box.maxX - box.minX,
        y : box.maxY - box.minY,
      };
    });
    console.log(probabilities);
    // TODO: do something with object position

    // Lower arm
    return this.setTargets(TARGETS.lowerArmToGrabPayload[this.hostname])
      .then(usleep(6500))
      // Close claw
      .then(this.setTarget(5, 1150))
      .then(usleep(1000))
      // Start to raise arm
      .then(this.setTargets(TARGETS.movePayload1[this.hostname]))
      .then(usleep(SLEEPS.movePayload1[this.hostname]))
      // Turn away from object and raise arm
      .then(this.setTargets(TARGETS.movePayload2[this.hostname]))
      .then(usleep(SLEEPS.dropPayload[this.hostname]))
      // Open claw
      .then(this.setTarget(5, 1700))
      .then(usleep(2000))
      // Go home
      .then(this.goHome())
  }

  setTarget(channel, target) {
    return this.driver.setPWM(channel, 0, target);
  }

  setTargets(targets) {
    const promises = targets.map(target => this.driver.setPWM(target.channel, 0, target.target));
    return Promise.all(promises);
  }
}
