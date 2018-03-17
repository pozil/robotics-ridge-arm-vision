const Winston = require('winston'),
  httpClient = require("request"),
  os = require('os'),
  SalesforceClient = require('salesforce-node-client');

// Configure logs
Winston.loggers.add('SFDC', {
  console: { level: 'info', colorize: true, label: 'SFDC' }
});
const LOG = Winston.loggers.get('SFDC');


// Topic paths for the Platform Events
const TOPIC_ARM_PICKUP_REQUESTED = '/event/ARM_Pickup_Requested__e';
const TOPIC_ARM_PICKUP_CONFIRMED = '/event/ARM_Pickup_Confirmed__e';

// Enable WebSockets for CometD
var window = {};
window.WebSocket = require('ws');
// Configure CometD libraries (enables subscription to Platform Events)
const cometdnodejs = require('cometd-nodejs-client').adapt();
const cometdlib = require('cometd');
const cometd = new cometdlib.CometD();


module.exports = class SalesforcePlatform {

  constructor(deviceId) {
    this.deviceId = deviceId;
    this.session = null;
    this.client = new SalesforceClient();
  }

  init(onArmPickupRequested, onArmPickupConfirmed) {
    return new Promise((resolve, reject) => {
      // Authenticate with Salesforce
      LOG.info('Authenticating with Salesforce...');
      this.client.auth.password({
        username: process.env.sfdcUsername,
        password: process.env.sfdcPassword
      }, (error, payload) => {
        if (error) {
          return LOG.error('Failed to authenticate with Salesforce', error);
          reject(error);
        }
        LOG.info('Successfully authenticated with Salesforce.');
        this.session = payload;

        // Send device IP to Salesforce
        this.sendDeviceIpToSalesforce();

        // Configure the CometD object.
        cometd.configure({
          url: this.session.instance_url + '/cometd/41.0/',
          requestHeaders: { Authorization: 'Bearer ' + this.session.access_token },
          appendMessageTypeToURL: false
        });

        // Handshake with the server and subscribe to the PE.
        LOG.debug('Connecting to CometD server...');
        cometd.handshake((handshake) => {
          if (handshake.successful) {
            LOG.debug('Successfully connected to CometD server.');
            // Subscribe to receive messages from the server.
            cometd.subscribe(TOPIC_ARM_PICKUP_REQUESTED, onArmPickupRequested);
            cometd.subscribe(TOPIC_ARM_PICKUP_CONFIRMED, onArmPickupConfirmed);
            LOG.debug('Successfully subscribed to Platform Events');
            resolve();
          } else {
            const message = 'Unable to connect to CometD ' + JSON.stringify(handshake);
            LOG.error(message);
            reject(message);
          }
        });
      });
    });
  }

  /**
   * Send device local IP to Salesforce
   */
  sendDeviceIpToSalesforce() {
    // Get local IPv4 address
    const ifaces = os.networkInterfaces();
    let ip = null;
    Object.keys(ifaces).forEach((ifname) => {
      ifaces[ifname].forEach((iface) => {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          return;
        }
        ip = iface.address;
      });
    });
    // Get record Id and push IP to Salesforce
    LOG.info('Reporting '+ this.deviceId +' IP to Salesforce: '+ ip);
    const query = encodeURI("SELECT Id FROM Device__c WHERE Device_Id__c='"+ this.deviceId +"'");
    const apiRequestOptions = this.client.data.createDataRequest(this.session, 'query?q='+ query);
    httpClient.get(apiRequestOptions, (error, response, body) => {
      if (response && response.statusCode < 200 && response.statusCode > 299) {
        return LOG.error('Failed to retrieve device record id (HTTP '+ response.statusCode +')', body);
      } else if (error) {
        return LOG.error('Failed to retrieve device record id', error);
      }
      const data = JSON.parse(body);
      if (data.records.length == 0) {
        return LOG.error('Failed to find device with Device_Id__c='+ this.deviceId +' in Salesforce', error);
      }
      const recordId = data.records[0].Id;
      // Push IP to Salesforce
      const apiRequestOptions = this.client.data.createDataRequest(this.session, 'sobjects/Device__c/'+ recordId);
      apiRequestOptions.body = '{"Last_Known_IP__c": "'+ ip +'"}';
      httpClient.patch(apiRequestOptions, (error, response, body) => {
        if (response && response.statusCode < 200 && response.statusCode > 299) {
          LOG.error('Failed to send device IP (HTTP '+ response.statusCode +')', body);
        } else if (error) {
          LOG.error('Failed to send device IP', error);
        }
      });
    });
  }

  // Send image to apex REST resource
  uploadPicture(picture) {
    return new Promise((resolve, reject) => {
      const apiRequestOptions = this.client.apex.createApexRequest(this.session, 'ArmVision/'+ this.deviceId);
      apiRequestOptions.headers['Content-Type'] = 'image/jpg';
      apiRequestOptions.body = picture;
      httpClient.post(apiRequestOptions, (error, response, body) => {
        if (response && response.statusCode < 200 && response.statusCode > 299) {
          LOG.error('Failed to upload ARM image (HTTP '+ response.statusCode +')', body);
          reject();
        } else if (error) {
          LOG.error('Failed to upload ARM image', error);
          reject(error);
        }
        LOG.info('Successfully uploaded ARM image')
        resolve();
      });
    });
  }

  notifyPickupCompleted() {
    return new Promise((resolve, reject) => {
      const apiRequestOptions = this.client.data.createDataRequest(this.session, 'sobjects/ARM_Pickup_Confirmed__e');
      apiRequestOptions.body = '{"Device_Id__c": "'+ this.deviceId +'"}';
      httpClient.put(apiRequestOptions, (error, response, body) => {
        if (response && response.statusCode < 200 && response.statusCode > 299) {
          LOG.error('Failed to send ARM_Pickup_Confirmed__e Platform Event (HTTP '+ response.statusCode +')', body);
          reject();
        } else if (error) {
          LOG.error('Failed to send ARM_Pickup_Confirmed__e Platform Event', error);
          reject(error);
        }
        LOG.info('Successfully notified pickup completion');
        resolve();
      });
    });
  }
}
