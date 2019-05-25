require('dotenv').config();
const Winston = require('winston'),
  httpClient = require("request"),
  ARM = require('./src/arm'),
  SalesforcePlatform = require('./src/salesforce-platform'),
  os = require('os');

const HOSTNAME = process.env.hostname || os.hostname();

// Configure logs
Winston.loggers.add('App', {
  console: { level: 'info', colorize: true, label: 'App' }
});
const LOG = Winston.loggers.get('App');

Winston.default.transports.console.level='debug';
Winston.loggers.get('App').transports.console.level='debug';
Winston.loggers.get('ARM').transports.console.level='debug';
Winston.loggers.get('SFDC').transports.console.level='debug';


process.on('warning', e => console.warn(e.stack));
process.on('unhandledRejection', (reason, p) => {
  LOG.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

const sfdc = new SalesforcePlatform(HOSTNAME);
const arm = new ARM();

function sleep(duration) {
  return new Promise((resolve, reject) => {
    LOG.debug('Sleep', duration);
    setTimeout(() => {
      resolve();
    }, duration);
  });
}


startApp = () => {
  sfdc.init(onArmPickupRequested, onArmPickupConfirmed)
  .then(() => arm.init(false))
  .then(() => arm.positionToCapturePicture())
  .then(() => sleep(1000))
  .then(() => arm.capturePicture())
  .then(picture => sfdc.uploadPicture(picture))
  .catch(error => {
    LOG.error(error);
  });
}

onArmPickupRequested = () => {}
onArmPickupConfirmed = () => {}

startApp();
