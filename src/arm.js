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
      {channel: 0, target: 415},
      {channel: 1, target: 440},
      {channel: 2, target: 290},
      {channel: 3, target: 330},
      {channel: 4, target: 345},
      {channel: 5, target: 320},
    ]
  },
  positionToCapturePicture: { // Move above object, lower arm, rotate wrist and open claw
    'arm-1': [
      {channel: 0, target: 415},
      {channel: 1, target: 420},
      {channel: 2, target: 290},
      {channel: 3, target: 330},
      {channel: 4, target: 345},
      {channel: 5, target: 320},
    ]
  },
  closeClaw: {
    'arm-1': [
      {channel: 5, target: 250},
    ]
  },
  movePayloadPlastic: {
    'arm-1': [
      {channel: 0, target: 400},
      {channel: 1, target: 420},
    ]
  },
  movePayloadPaper: { 
    'arm-1': [
      {channel: 0, target: 406},
      {channel: 1, target: 343},
      {channel: 2, target: 321},
    ]
  },
  movePayloadMetal: { 
    'arm-1': [
      {channel: 0, target: 430},
      {channel: 1, target: 330},
    ]
  },
  moveToTrain: { 
    'arm-1': [
      {channel: 0, target: 355},
      {channel: 1, target: 340},
      {channel: 2, target: 340},
    ]
  },
  dropOnTrain: {
    'arm-1':[
      {channel: 1, target: 340},
      {channel: 2, target: 320},
      {channel: 5, target: 310},
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
    var thingsFound = new Array(); 
    const probabilities = JSON.parse(eventData.Prediction__c).probabilities;
    //var movePickupPayload = TARGETS.movePayloadPaper[this.hostname];

    probabilities.forEach(probability => {
        thingsFound.push(probability.label);
    });
    console.log('i found' + thingsFound)

    console.log(probabilities);
    if(thingsFound.includes(eventData.Payload__c)){
      switch (eventData.Payload__c){
        case 'paper':
          movePickupPayload = TARGETS.movePayloadPaper[this.hostname];
          console.log('should be paper' + movePickupPayload)
        break;
        case 'plastic':
          movePickupPayload = TARGETS.movePayloadPlastic[this.hostname];
          console.log('should be plastic' + movePickupPayload)
        break;
        case 'plastic':
          movePickupPayload = TARGETS.movePayloadMetal[this.hostname];
          console.log('should be metal' +movePickupPayload)
        break;
      }
    }

    return this.setTargets(TARGETS.movePayloadMetal[this.hostname])
      .then(() => sleep(7))

      .then(() => this.setTargets(TARGETS.closeClaw[this.hostname]))
      .then(() => sleep(2))

      .then(() => this.setTargets(TARGETS.moveToTrain[this.hostname]))
      .then(() => sleep(6))

      .then(() => this.setTargets(TARGETS.dropOnTrain[this.hostname]))
      .then(() => sleep(6))

      .then(() => this.goHome())
  }

  

  setTarget(channel, target) {
    return this.driver.setPWM(channel, 0, target);
  }

  setTargets(targets) {
    const promises = targets.map(target => this.driver.setPWM(target.channel, 0, target.target));
    return Promise.all(promises);
  }
}
