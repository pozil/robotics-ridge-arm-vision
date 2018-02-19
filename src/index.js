// Load .env configuration file
require('dotenv').config();
const Log = require('./logging.js'),
  httpClient = require("request"),
  SalesforceClient = require('salesforce-node-client'),
  os = require('os');

const DEVICE_ID = process.env.deviceId || os.hostname();

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

// Prepare Salesforce client
var sfdcSession = null;
const sfdcClient = new SalesforceClient();


waitForInternetThenStartApp = () => {
  httpClient.get({url: 'https://status.salesforce.com/status', timeout: 5000}, (error, response, body) => {
    if (!response || response.statusCode !== 404) {
      Log.error('No internet connection available, retrying...');
      waitForInternetThenStartApp();
    } else {
      startApp();
    }
  });
}

startApp = () => {
  // Authenticate with Salesforce
  Log.info('Authenticating with Salesforce...');
  sfdcClient.auth.password({
    username: process.env.sfdcUsername,
    password: process.env.sfdcPassword
  }, (error, payload) => {
    if (error) {
      return Log.error('Failed to authenticate with Salesforce', error);
    }
    Log.info('Successfully authenticated with Salesforce.');
    sfdcSession = payload;

    // Send device IP to Salesforce
    sendDeviceIpToSalesforce();

    // Configure the CometD object.
    cometd.configure({
      url: sfdcSession.instance_url + '/cometd/41.0/',
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
}

/**
 * Send device local IP to Salesforce
 */
sendDeviceIpToSalesforce = () => {
  // Get local IPv4 address
  const ifaces = os.networkInterfaces();
  let ip = null;
  Object.keys(ifaces).forEach(function (ifname) {
    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      ip = iface.address;
    });
  });
  // Get record Id and push IP to Salesforce
  Log.info('Reporting device IP to Salesforce: '+ ip);
  const query = encodeURI("SELECT Id FROM Device__c WHERE Device_Id__c='"+ DEVICE_ID +"'");
  const apiRequestOptions = sfdcClient.data.createDataRequest(sfdcSession, 'query?q='+ query);
  httpClient.get(apiRequestOptions, function (error, response, body) {
    if (response && response.statusCode < 200 && response.statusCode > 299) {
      return Log.error('Failed to retrieve device record id (HTTP '+ response.statusCode +')', body);
    } else if (error) {
      return Log.error('Failed to retrieve device record id', error);
    }
    const data = JSON.parse(body);
    if (data.records.length == 0) {
      return Log.error('Failed to find device with Device_Id__c='+ DEVICE_ID +' in Salesforce', error);
    }
    const recordId = data.records[0].Id;
    // Push IP to Salesforce
    const apiRequestOptions = sfdcClient.data.createDataRequest(sfdcSession, 'sobjects/Device__c/'+ recordId);
    apiRequestOptions.body = '{"Last_Known_IP__c": "'+ ip +'"}';
    httpClient.patch(apiRequestOptions, (error, response, body) => {
      if (response && response.statusCode < 200 && response.statusCode > 299) {
        Log.error('Failed to send device IP (HTTP '+ response.statusCode +')', body);
      } else if (error) {
        Log.error('Failed to send device IP', error);
      }
    });
  });
}

/**
 * Platform Event callback for ARM image request
 * @param {*} platformEvent
 */
onArmImageRequested = (platformEvent) => {
  // Only consider requests for this device
  if (platformEvent.data.payload.Device_Id__c !== DEVICE_ID) {
    return Log.info('Ignoring image request for '+ platformEvent.data.payload.Device_Id__c);;
  }

  Log.info('ARM image requested');
  camera.takePhoto().then((photo) => {
    // Send image to apex REST resource
    const apiRequestOptions = sfdcClient.apex.createApexRequest(sfdcSession, 'ArmVision/'+ DEVICE_ID);
    apiRequestOptions.headers['Content-Type'] = 'image/jpg';
    apiRequestOptions.body = photo;
    httpClient.post(apiRequestOptions, (error, response, body) => {
      if (response && response.statusCode < 200 && response.statusCode > 299) {
        Log.error('Failed to send ARM image (HTTP '+ response.statusCode +')', body);
      } else if (error) {
        Log.error('Failed to send ARM image', error);
      } else {
        Log.info('Successfully sent ARM image')
      }
    });
  });
}


// Wait for internet access then start app
Log.info('Checking internet connection...');
waitForInternetThenStartApp();
