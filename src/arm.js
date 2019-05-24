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
      {channel: 0, target: 370},
      {channel: 1, target: 440},
      {channel: 2, target: 290},
      {channel: 3, target: 330},
      {channel: 4, target: 330},
      {channel: 5, target: 320},
    ]
  },
  positionToCapturePicture: { // Move above object, lower arm, rotate wrist and open claw
    'arm-1': [
      {channel: 0, target: 330},
      {channel: 1, target: 420},
      {channel: 2, target: 290},
      {channel: 3, target: 330},
      {channel: 4, target: 330},
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
      {channel: 0, target: 330},
      {channel: 1, target: 330},
    ]
  },
  movePayloadPaper: { 
    'arm-1': [
      {channel: 0, target: 330},
      {channel: 1, target: 330},
    ]
  },
  movePayloadMetal: { 
    'arm-1': [
      {channel: 0, target: 330},
      {channel: 1, target: 330},
    ]
  },
  moveToTrain: { 
    'arm-1': [
      {channel: 0, target: 370},
      {channel: 1, target: 340},
      {channel: 2, target: 300},
    ]
  },
  dropOnTrain: {
    'arm-1':[
      {channel: 1, target: 330},
      {channel: 5, target: 310},
    ]
  }
}

const SLEEPS = {
  closeClaw: {
    'arm-1': 1000,
  },
  movePayloadPlastic: {
    'arm-1': 6000,
  },
  movePayloadPaper: {
    'arm-1': 6000,
  },
  movePayloadMetal: {
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
    var thingsFound = new Array(); 
    const probabilities = JSON.parse(eventData.Prediction__c).probabilities;

    probabilities.forEach(probability => {
        thingsFound.push(probability.label);
    });

    console.log(probabilities);
    //if(eventData.Payload__c: thingsFound)
    //{}
    // TODO: do something with object position

    //{"probabilities":[{"probability":0.9948178,"label":"Soccer","boundingBox":{"minY":111,"minX":376,"maxY":213,"maxX":469}},{"probability":0.99054104,"label":"Globe","boundingBox":{"minY":289,"minX":502,"maxY":382,"maxX":589}},{"probability":0.99855214,"label":"Basketball","boundingBox":{"minY":460,"minX":380,"maxY":551,"maxX":476}}]}

    return this.setTargets(TARGETS.movePayloadPaper[this.hostname])
      .then(usleep(SLEEPS.movePayloadPaper[this.hostname]))

      .then(this.setTarget(TARGETS.closeClaw[this.hostname]))
      .then(usleep(SLEEPS.closeClaw[this.hostname]))

      .then(this.setTargets(TARGETS.moveToTrain[this.hostname]))
      .then(usleep(SLEEPS.moveToTrain[this.hostname]))

      .then(this.setTarget(TARGETS.dropOnTrain[this.hostname]))
      .then(usleep(SLEEPS.dropOnTrain[this.hostname]))

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
