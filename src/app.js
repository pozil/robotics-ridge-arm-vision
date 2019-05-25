require('dotenv').config();
const Winston = require('winston'),
  httpClient = require("request"),
  ARM = require('./arm'),
  SalesforcePlatform = require('./salesforce-platform'),
  os = require('os');

let HOSTNAME = process.env.hostname || os.hostname();
if (HOSTNAME !== 'arm-1' && HOSTNAME !== 'arm-2') {
  console.log(`WARNING: invalid hostname ${HOSTNAME}. Falling back to arm-1`);
  HOSTNAME = 'arm-1';
}

// Configure logs
Winston.loggers.add('App', {
  console: { level: 'info', colorize: true, label: 'App' }
});
const LOG = Winston.loggers.get('App');

Winston.default.transports.console.level='debug';
Winston.loggers.get('App').transports.console.level='debug';
Winston.loggers.get('ARM').transports.console.level='debug';
Winston.loggers.get('SFDC').transports.console.level='debug';
Winston.loggers.get('COMETD').transports.console.level='info';

const sfdc = new SalesforcePlatform(HOSTNAME);
const isMockArm = process.env.isMockArm;
const arm = new ARM(HOSTNAME, isMockArm);

let isShuttingDown = false;
shutdown = () => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log("\nGracefully shutting down from SIGINT (Ctrl-C) or SIGTERM");
  Promise.all([
    sfdc.disconnect(),
    arm.disconnect()
  ]).then(process.exit(0))
  .catch(error => {
    LOG.error(error);
    process.exit(-1);
  });
}

// Process hooks
process.on('warning', e => console.warn(e.stack));
process.on('unhandledRejection', (reason, p) => {
    LOG.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

const EVENT_ARM_PICKUP_REQUESTED = 'ARM_Pickup_Requested';
const EVENT_ARM_PICKUP_CONFIRMED = 'ARM_Pickup_Confirmed';

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
  return Promise.all([
    sfdc.init(onPlatformEvent),
    arm.init()
  ]).catch(error => {
    LOG.error(error);
  });
}

onPlatformEvent = platformEvent => {
  // Ignore events from other feeds
  const eventData = platformEvent.data.payload;
  if (eventData.Feed_Id__c !== process.env.feedId) {
    return;
  }
  // Process event
  switch (eventData.Event__c) {
    case EVENT_ARM_PICKUP_REQUESTED:
      onArmPickupRequested(eventData);
    break;
    case EVENT_ARM_PICKUP_CONFIRMED:
      onArmPickupConfirmed(eventData);
    break;
  }
}

onArmPickupRequested = eventData => {
  arm.positionToCapturePicture()
  .then(() => arm.capturePicture())
  .then(picture => sfdc.uploadPicture(picture))
  .catch(error => {
    LOG.error(error);
  });
}

onArmPickupConfirmed = (eventData) => {
  arm.grabAndTransferPayload(eventData)
  .then(() => sfdc.notifyPickup('ARM_Pickup_Completed'))
  .catch(error => {
    LOG.error(error);
  });
}


// Wait for internet access then start app
LOG.info('Checking internet connection...');
waitForInternetThenStartApp();
