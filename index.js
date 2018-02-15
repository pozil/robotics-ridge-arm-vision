// Load .env configuration file
require('dotenv').config();

const httpClient = require("request");

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
const sfdcClient = new SalesforceClient();
sfdcClient.auth.password({
  username: process.env.sfdcUsername,
  password: process.env.sfdcPassword
}, function(error, payload) {
  // TODO: check session timetout

  if (error) {
    return console.error('Failed to authenticate with Salesforce', error);
  }
  sfdcSession = payload;

  // Configure the CometD object.
  cometd.configure({
    url: sfdcSession.instance_url + '/cometd/40.0/',
    requestHeaders: { Authorization: 'Bearer ' + sfdcSession.access_token },
    appendMessageTypeToURL: false
  });

  // Handshake with the server and subscribe to the PE.
  cometd.handshake(function (handshake) {
    if (handshake.successful) {
      // Subscribe to receive messages from the server.
      cometd.subscribe(TOPIC_ARM_IMAGE_REQUESTED, onArmImageRequested);
      console.log('CometD subscribed to ' + TOPIC_ARM_IMAGE_REQUESTED + ' successfully');
    } else {
      console.log('Unable to connect to CometD ' + JSON.stringify(handshake));
    }
  });
});


function onArmImageRequested(platformEvent) {
  console.log('ARM image requested');
  camera.takePhoto().then((photo) => {
    // Send image to apex REST resource
    const apiRequestOptions = sfdcClient.apex.createApexRequest(sfdcSession, 'ArmVision/');
    apiRequestOptions.headers['Content-Type'] = 'image/jpg';
    apiRequestOptions.body = photo;
    httpClient.post(apiRequestOptions, function (error, payload) {
      if (error) {
        return console.error('Failed to send photo', error);
      }
      console.log('Photo sent')
    });
  });
}
