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
    this.currentTarget = '';
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

  positionToCapturePicture(targetObject) {
    LOG.debug('Moving to capture picture');
	this.currentTarget = targetObject;
	console.log('this  is ' + this.currentTarget);
	console.log('original is ' + targetObject);
    // Move above object, lower arm, rotate wrist and open claw
    //return this.setTargets(TARGETS.positionToCapturePicture[this.hostname]);
    return this.mover.goPicture();
  }

  capturePicture() {
    LOG.debug('Capturing picture');
    return this.camera.takePhoto();
  }

  getPickupPoint(mytarget, probabilities) {

    let ret = null;

    console.log('looking for ' + mytarget);

    probabilities.forEach(probability => {
      const box = probability.boundingBox;
      probability.center = {
        x : box.maxX - box.minX,
        y : box.maxY - box.minY,
      };
    });

    probabilities.forEach(probability => {
      if (probability.label.toLowerCase() == mytarget) {
        if (probability.center.x >= 90 && probability.center.x <= 99 && 
          probability.center.y >= 95 && probability.center.y < 105) {
          ret = this.mover.goPickupFour();
        } else if (probability.center.x >= 120 && probability.center.x <= 130 && 
          probability.center.y >= 110 && probability.center.y < 120) {
            ret = this.mover.goPickupThree();
        } else if (probability.center.x >= 110 && probability.center.x <= 120 && 
          probability.center.y >= 105 && probability.center.y < 115) {
            ret = this.mover.goPickupTwo();
          } else if (probability.center.x >= 100 && probability.center.x <= 110 && 
            probability.center.y >= 120 && probability.center.y < 130) {
            ret = this.mover.goPickupOne();
      }
    }
    );    
    
    console.log(probabilities);
    return ret;
  }

  grabAndTransferPayload(eventData) {
    LOG.debug('Grabbing and tranfering payload');
    // Get object position

	console.log('find: ' + this.currentTarget);
    
    const probabilities = JSON.parse(eventData.Prediction__c).probabilities;

    let myPickupPoint = this.getPickupPoint(this.currentTarget, probabilities);
    
    // TODO: do something with object position
    return Promise.all([myPickupPoint, this.mover.goDropOff(), this.mover.goHome() ]);

    return this.mover.goDropOff();
  }

}
