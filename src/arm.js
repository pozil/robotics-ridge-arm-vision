const Winston = require('winston'),
  { PwmDriver, usleep, sleep } = require('adafruit-i2c-pwm-driver-async'),
  Raspistill = require('node-raspistill').Raspistill;

// Configure logs
Winston.loggers.add('ARM', {
  console: { level: 'info', colorize: true, label: 'ARM' }
});
const LOG = Winston.loggers.get('ARM');

const TARGETS = {
  home: { // Move to home position
    'arm-1': [
      {channel: 0, target: 410},
      {channel: 1, target: 450},
      {channel: 2, target: 300},
      {channel: 3, target: 495},
      {channel: 4, target: 450},
      {channel: 5, target: 330},
    ]
  },
  positionToCapturePicture: { // Move above object, lower arm, rotate wrist and open claw
    'arm-1': [
      {channel: 0, target: 365},
      {channel: 1, target: 435},
      {channel: 2, target: 300},
      {channel: 3, target: 495},
      {channel: 4, target: 345},
      {channel: 5, target: 330},
    ]
  },
  closeClaw: {
    'arm-1': [
      {channel: 5, target: 250},
    ]
  },
  movePayloadPlastic: {
    'arm-1': [
      {channel: 0, target: 378},
      {channel: 1, target: 348},
      {channel: 2, target: 348},
      {channel: 3, target: 495},
      {channel: 4, target: 360},
      {channel: 5, target: 330},
    ]
  },
  movePayloadPaper: {
    'arm-1': [
      {channel: 0, target: 356},
      {channel: 1, target: 364},
      {channel: 2, target: 320},
      {channel: 3, target: 495},
      {channel: 4, target: 386},
      {channel: 5, target: 330},
    ]
  },
  movePayloadMetal: {
    'arm-1': [
      {channel: 0, target: 366},
      {channel: 1, target: 360},
      {channel: 2, target: 328},
      {channel: 3, target: 495},
      {channel: 4, target: 367},
      {channel: 5, target: 330},
    ]
  },
  movePayloadUp: {
    'arm-1': [
      {channel: 1, target: 401},
    ]
  },
  movePayloadToTrain: {
    'arm-1': [
      {channel: 0, target: 328},
      {channel: 1, target: 365},
      {channel: 2, target: 343},
      {channel: 3, target: 495},
      {channel: 4, target: 337},
    ]
  },
  lowerOnTrain: {
    'arm-1':[
      {channel: 1, target: 353},
    ]
  },
  dropOnTrain: {
    'arm-1':[
      {channel: 5, target: 330},
    ]
  }
}

const SLEEPS = {
  closeClaw: {
    'arm-1': 1000,
  },
  movePayload: {
    'arm-1': 6000,
  },
  moveToTrain: {
    'arm-1': 6000,
  },
  dropOnTrain: {
    'arm-1': 4400,
  },
}


module.exports = class ARM {

  constructor(hostname, isMockArm) {
    this.hostname = hostname;
    this.driver = new PwmDriver({address: 0x40, device: '/dev/i2c-1', debug: false, i2cDebug: false, isMockDriver: isMockArm});
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
      .then(() => this.driver.setPWMFreq(50))
      .then(() => this.goHome())
      .then(() => sleep(6));
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
    return this.setTargets(TARGETS.positionToCapturePicture[this.hostname])
      .then(() => sleep(2.5));
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
    var movePickupPayload;
    var foundItem = false;
    const probabilities = JSON.parse(eventData.Prediction__c).probabilities;

    probabilities.forEach(probability => {
        if(probability.label == eventData.Payload__c) {
          foundItem = true;
        }
    });

    if(foundItem){
      switch (eventData.Payload__c){
        case 'paper':
          movePickupPayload = TARGETS.movePayloadPaper[this.hostname];
        break;
        case 'plastic':
          movePickupPayload = TARGETS.movePayloadPlastic[this.hostname];
        break;
        case 'metal':
          movePickupPayload = TARGETS.movePayloadMetal[this.hostname];
        break;
      }
    }
    else{
      return sfdc.notifyPickup('ARM_Pickup_Rejected');
    }

    return this.setTargets(movePickupPayload)
      .then(() => sleep(7.5))

      .then(() => this.setTargets(TARGETS.closeClaw[this.hostname]))
      .then(() => sleep(2))

      .then(() => this.setTargets(TARGETS.movePayloadUp[this.hostname]))
      .then(() => sleep(2))

      .then(() => this.setTargets(TARGETS.movePayloadToTrain[this.hostname]))
      .then(() => sleep(5))

      .then(() => this.setTargets(TARGETS.lowerOnTrain[this.hostname]))
      .then(() => sleep(3.2))

      .then(() => this.setTargets(TARGETS.dropOnTrain[this.hostname]))
      .then(() => sleep(2))
      .then(() => this.setTargets(TARGETS.movePayloadUp[this.hostname]))
  }

  setTarget(channel, target) {
    return this.driver.setPWM(channel, 0, target);
  }

  setTargets(targets) {
    const promises = targets.map(target => this.driver.setPWM(target.channel, 0, target.target));
    return Promise.all(promises);
  }
}
