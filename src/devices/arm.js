const { PwmDriver, usleep, sleep } = require('adafruit-i2c-pwm-driver-async'),
  Raspistill = require('node-raspistill').Raspistill;
import getLogger from '../utils/logger';
import Configuration from '../utils/configuration';
import { TARGETS, SLEEPS } from './arm-constants';
import { getHostname } from '../utils/network.js';

const logger = getLogger('ARM');


export default class Arm {
  constructor() {
    this.hostname = getHostname();
    this.driver = new PwmDriver({address: 0x40, device: '/dev/i2c-1', debug: Configuration.isSerialDebugModeEnabled(), i2cDebug: false, isMockDriver: Configuration.isMockArm()});
    if (Configuration.isMockArm()) {
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

  async connect() {
    logger.info('Connect');
    await this.driver.init();
    await this.driver.setPWMFreq(50);
    await this.goHome();
    return sleep(6);
  }

  async disconnect() {
    logger.info('Disconnect');
    return this.driver.stop();
  }

  async goHome() {
    logger.info('Moving to home position');
    return this.setTargets(TARGETS.home[this.hostname]);
  }

  async positionToCapturePicture() {
    logger.info('Moving to capture picture');
    // Move above object, lower arm, rotate wrist and open claw
    await this.setTargets(TARGETS.positionToCapturePicture[this.hostname]);
    return sleep(2.5);
  }

  async capturePicture() {
    logger.info('Capturing picture');
    if (this.camera === null) {
      return Promise.resolve();
    }
    return this.camera.takePhoto();
  }

  async grabAndTransferPayload(eventData) {
    logger.info('Grabing and tranfering payload');
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

    await this.setTargets(movePickupPayload);
    await sleep(7.5);

    await this.setTargets(TARGETS.closeClaw[this.hostname]);
    await sleep(2);

    await this.setTargets(TARGETS.movePayloadUp[this.hostname]);
    await sleep(2);

    await this.setTargets(TARGETS.movePayloadToTrain[this.hostname]);
    await sleep(5);

    await this.setTargets(TARGETS.lowerOnTrain[this.hostname]);
    await sleep(3.2);

    await this.setTargets(TARGETS.dropOnTrain[this.hostname]);
    await sleep(2);

    return this.setTargets(TARGETS.movePayloadUp[this.hostname]);
  }

  async setTarget(channel, target) {
    return this.driver.setPWM(channel, 0, target);
  }

  async setTargets(targets) {
    const promises = targets.map(target => this.driver.setPWM(target.channel, 0, target.target));
    return Promise.all(promises);
  }
}
