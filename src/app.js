import getLogger from './utils/logger.js';
import Configuration from './utils/configuration.js';
import { getHostname, getIp } from './utils/network.js';
import SalesforceClient from './utils/salesforceClient';
import Arm from './devices/arm';

const EVENT_ARM_PICKUP_REQUESTED = 'ARM_Pickup_Requested';
const EVENT_ARM_PICKUP_CONFIRMED = 'ARM_Pickup_Confirmed';
const EVENT_ARM_PICKUP_REJECTED = 'ARM_Pickup_Rejected';

const logger = getLogger('App');

// Load and check config
if (!Configuration.isValid()) {
  logger.error(
      'Cannot start app: missing mandatory configuration. Check your .env file.'
  );
  process.exit(-1);
}

var device = null;
const arm = new Arm();
const sfdc = new SalesforceClient();

// Node process hooks
process.on('warning', e => logger.warn(e.stack));
process.on('unhandledRejection', async (reason, p) => {
    logger.error(`'Unhandled Rejection at: Promise ${JSON.stringify(p)}`);
    if (reason) {
        logger.error('Reason: ', reason);
    }
    await shutdown();
    process.exit(-1);
});
process.once('SIGINT', async () => {
    logger.info('Gracefully shutting down from SIGINT (Ctrl-C)');
    await shutdown();
    process.exit(0);
});

async function shutdown() {
  try {
    await arm.disconnect();
  }
  catch (e) {}
}

async function startApp() {
    logger.info('Starting up');

    // Connect arm
    await arm.connect();

    // Connect to Salesforce
    try {
        await sfdc.connect();
    } catch (error) {
        logger.error('Failed to connect to Salesforce org ', error);
        process.exit(-1);
    }

    // Retrieve device
    device = await sfdc.getDeviceFromHostname(getHostname());

    // Subscribe to robot platform event
    sfdc.subscribeToStreamingEvent('/event/Robot_Event__e', handleRobotEvent);

    // Update device IP
    sfdc.updateDeviceIp(device.Id, getIp());
}


function handleRobotEvent(event) {
  const eventData = event.payload;
  logger.info(`Incoming robot event ${JSON.stringify(eventData)}`);
  switch (eventData.Event__c) {
    case EVENT_ARM_PICKUP_REQUESTED:
      onPickupRequested();
    break;
    case EVENT_ARM_PICKUP_CONFIRMED:
      onPickupConfirmed(eventData);
    break;
    case EVENT_ARM_PICKUP_REJECTED:
      onPickupRejected();
    break;
  }
}

async function onPickupRequested() {
  await arm.positionToCapturePicture();
  const picture = await arm.capturePicture();
  return sfdc.uploadPicture(device.Id, picture);
}

async function onPickupConfirmed(eventData) {
  await arm.grabAndTransferPayload(eventData);
  await sfdc.publishPlatformEvent({
    Event__c: 'ARM_Pickup_Completed',
    Device_Id__c: device.Id,
    Feed_Id__c: device.Feed__c
  });
  return arm.goHome();
}

async function onPickupRejected() {
  return arm.goHome();
}

startApp();
