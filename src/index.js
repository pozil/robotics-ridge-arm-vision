// Load .env configuration file
require('dotenv').config();
const Log = require('./logging.js'),
  httpClient = require("request");

const DEVICE_ID = process.env.deviceId || require('os').hostname();

Log.info('Starting vision service for device '+ DEVICE_ID);

// Configure Raspberry Pi Camera
const Raspistill = require('node-raspistill').Raspistill;
const camera = new Raspistill({
  noFileSave: true,
  verticalFlip: false,
  width: 1296,
  height: 972,
  time: 0
});

// Topic paths for the Platform Events
const TOPIC_ARM_IMAGE_REQUESTED = '/event/ARM_Image_Requested__e';

// Enable WebSockets for CometD
var window = {};
window.WebSocket = require('ws');
// Configure CometD libraries (enables subscription to Platform Events)
const cometdnodejs = require('cometd-nodejs-client').adapt();
const cometdlib = require('cometd');
const cometd = new cometdlib.CometD();
const TimeStampExtension = require('cometd/TimeStampExtension');
cometd.registerExtension('timestamp', new TimeStampExtension());

// Authenticate with Salesforce
const SalesforceClient = require('salesforce-node-client');
var sfdcSession = null;
Log.info('Authenticating with Salesforce...');
const sfdcClient = new SalesforceClient();
sfdcClient.auth.password({
  username: process.env.sfdcUsername,
  password: process.env.sfdcPassword
}, (error, payload) => {
  if (error) {
    return Log.error('Failed to authenticate with Salesforce', error);
  }
  Log.info('Successfully authenticated with Salesforce.');
  sfdcSession = payload;

  // Configure the CometD object.
  cometd.configure({
    url: sfdcSession.instance_url + '/cometd/40.0/',
    requestHeaders: { Authorization: 'Bearer ' + sfdcSession.access_token },
    appendMessageTypeToURL: false
  });

  // Handshake with the server and subscribe to the PE.
  Log.info('Connecting to CometD server...');
  cometd.handshake((handshake) => {
    if (handshake.successful) {
      Log.info('Successfully connected to CometD server.');
      // Subscribe to receive messages from the server.
      cometd.subscribe(TOPIC_ARM_IMAGE_REQUESTED, onArmImageRequested);
      Log.info('Successfully subscribed to topic ' + TOPIC_ARM_IMAGE_REQUESTED);
    } else {
      Log.error('Unable to connect to CometD ' + JSON.stringify(handshake));
    }
  });
});

/**
 * Platform Event callback for ARM image request
 * @param {*} platformEvent
 */
onArmImageRequested = (platformEvent) => {
  // Only consider requests for this device
  if (platformEvent.data.payload.Device_Id__c !== DEVICE_ID) {
    return;
  }

  Log.info('ARM image requested');
  camera.takePhoto().then((photo) => {
    // Send image to apex REST resource
    const apiRequestOptions = sfdcClient.apex.createApexRequest(sfdcSession, 'ArmVision/'+ DEVICE_ID);
    apiRequestOptions.headers['Content-Type'] = 'image/jpg';
    apiRequestOptions.body = photo;
    httpClient.post(apiRequestOptions, (error, response, body) => {
      if (response && response.statusCode !== 200) {
        Log.error('Failed to send ARM image (HTTP '+ response.statusCode +')', body);
      } else if (error) {
        Log.error('Failed to send ARM image', error);
      } else {
        Log.info('Successfully sent ARM image')
      }
    });
  });
}
