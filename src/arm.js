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
    return this.mover.goHome();
  }

  doDance() {
	return this.mover.goDance();
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

  isInTheZone(zoneName, xValue, yValue) {

	let that = this;
	let ret = false;

	console.log("zone: " + zoneName + ", x = " + xValue + ", y = " + yValue);
	console.log("boundaries: " + that.mover.positions.zones[zoneName]);

	if (that.mover.positions.zones[zoneName].xmin <= xValue &&
		that.mover.positions.zones[zoneName].xmax >= xValue &&
		that.mover.positions.zones[zoneName].ymin <= yValue &&
		that.mover.positions.zones[zoneName].ymax >= yValue) {

		ret = true;
	}

	return ret;
  }

  getPickupPoint(mytarget, probabilities) {

    let ret = null;

    console.log('looking for ' + mytarget);

    probabilities.forEach(probability => {
      const box = probability.boundingBox;
      probability.center = {
        x : ((box.maxX - box.minX) / 2) + box.minX,
        y : ((box.maxY - box.minY) / 2) + box.minY,
      };
    });

	console.log(probabilities);
	 let isFound = false;
    probabilities.forEach(probability => {
      if (probability.label.toLowerCase() == mytarget && !isFound) {

	isFound = true;

        if (this.isInTheZone("one", probability.center.x, probability.center.y)) {
        	ret = this.mover.goPickupOne();
		console.log('position 1');
        } else if (this.isInTheZone("two", probability.center.x, probability.center.y)) {
            	ret = this.mover.goPickupTwo();
		console.log('position 2');
        } else if (this.isInTheZone("three", probability.center.x, probability.center.y)) {
            	ret = this.mover.goPickupThree();
		console.log('position 3');
        } else if (this.isInTheZone("four", probability.center.x, probability.center.y)) {
          	ret = this.mover.goPickupFour();
		console.log('position 4');
        }
      }
    });   
    
    console.log(probabilities);

	if (!ret) {
		console.log('position NOT FOUND');
	}
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
