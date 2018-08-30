const Winston = require('winston'),
  Raspistill = require('node-raspistill').Raspistill,
  Movement = require('./movement.js');

// Configure logs
Winston.loggers.add('ARM', {
  console: { level: 'info', colorize: true, label: 'ARM' }
});
const LOG = Winston.loggers.get('ARM');

module.exports = class ARM {

  constructor(hostname) {
    this.hostname = hostname;
    this.mover = new Movement(this.hostname);
    this.camera = new Raspistill({
      noFileSave: true,
      verticalFlip: false,
      width: 800,
      height: 600,
      time: 0
    });
  }

  init() {
    LOG.debug('Connecting to ARM');
    Promise.all([
      //this.driver.init(),
    ])
    .then(() => {
      return this.goHome();
    });
  }

  disconnect() {
    LOG.debug('Disconnecting');
    //return this.driver.stop();
  }

  goHome() {
    LOG.debug('Moving to home position');
    //return this.setTargets(TARGETS.home[this.hostname]);
    return this.mover.goHome();
  }

  positionToCapturePicture() {
    LOG.debug('Moving to capture picture');
    // Move above object, lower arm, rotate wrist and open claw
    //return this.setTargets(TARGETS.positionToCapturePicture[this.hostname]);
    return this.mover.goPicture();
  }

  capturePicture() {
    LOG.debug('Capturing picture');
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

    return this.mover.goDropOff();
  }

}
