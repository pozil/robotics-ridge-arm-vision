require('dotenv').config();
const Winston = require('winston'),
  httpClient = require("request"),
  ARM = require('./src/arm'),
  SalesforcePlatform = require('./src/salesforce-platform'),
  os = require('os');

const HOSTNAME = process.env.deviceId || os.hostname();

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


waitForInternetThenStartApp = () => {
  httpClient.get({url: 'https://status.salesforce.com/status', timeout: 5000}, (error, response, body) => {
    if (!response || response.statusCode !== 404) {
      LOG.warn('No internet connection available, retrying...');
      waitForInternetThenStartApp();
    } else {
      startApp();
    }
  });
}

startApp = () => {
  sfdc.init(onArmPickupRequested, onArmPickupConfirmed)
  .then(() => {
    return arm.init();
  })
  .catch((error) => {
    LOG.error(error);
  });
}

onArmPickupRequested = () => {
  arm.positionToCapturePicture()
  .then(() => {
    return arm.capturePicture();
  })
  .then((picture) => {
    return sfdc.uploadPicture(picture)
  })
  .catch((error) => {
    LOG.error(error);
  });
}

onArmPickupConfirmed = () => {
  arm.grabAndTransferPayload()
  .then(() => {
    return sfdc.notifyPickupCompleted();
  })
  .catch((error) => {
    LOG.error(error);
  });
}


// Wait for internet access then start app
LOG.info('Checking internet connection...');
waitForInternetThenStartApp();
