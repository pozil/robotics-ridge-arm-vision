const Winston = require('winston'),
  httpClient = require("request"),
  os = require('os'),
  SalesforceClient = require('salesforce-node-client'),
  CometdClient = require('cometd-node-promise-client');

// Configure logs
Winston.loggers.add('SFDC', {
  console: { level: 'info', colorize: true, label: 'SFDC' }
});
const LOG = Winston.loggers.get('SFDC');

// Topic paths for the Platform Events
const TOPIC_ROBOT_EVENT = '/event/Robot_Event__e';

// Setup CometD
Winston.loggers.add('COMETD', {
  console: { level: 'info', colorize: true, label: 'COMETD' }
});
const cometd = new CometdClient(Winston.loggers.get('COMETD'));


module.exports = class SalesforcePlatform {

  constructor(hostname) {
    this.hostname = hostname;
    this.device = null;
    this.session = null;
    this.client = new SalesforceClient();
  }

  init(onPlatformEvent) {
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
          url: this.session.instance_url + '/cometd/'+ process.env.apiVersion.substring(1) +'/',
          requestHeaders: { Authorization: 'Bearer ' + this.session.access_token },
          appendMessageTypeToURL: false
        });

        // Handshake with the server and subscribe to the PE.
        LOG.debug('Connecting to CometD server...');
        cometd.connect().then(() => {
          cometd.subscribe(TOPIC_ROBOT_EVENT, onPlatformEvent).then(() => {
            resolve();
          });
        });
      });
    });
  }

  disconnect() {
    LOG.debug('Disconnecting from CometD server...');
    return cometd.disconnect();
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
    LOG.info('Reporting '+ this.hostname +' IP to Salesforce: '+ ip);
    const query = encodeURI("SELECT Id, Feed__c FROM Device__c WHERE Hostname__c='"+ this.hostname +"'");
    const apiRequestOptions = this.client.data.createDataRequest(this.session, 'query?q='+ query);
    httpClient.get(apiRequestOptions, (error, response, body) => {
      if (response && response.statusCode < 200 && response.statusCode > 299) {
        return LOG.error('Failed to retrieve device record id (HTTP '+ response.statusCode +')', body);
      } else if (error) {
        return LOG.error('Failed to retrieve device record id', error);
      }
      const data = JSON.parse(body);
      if (data.records.length == 0) {
        return LOG.error('Failed to find device with Hostname__c='+ this.hostname +' in Salesforce', error);
      }
      this.device = data.records[0];
      LOG.debug('Found remote '+ this.hostname +' device: '+ this.device.Id +' feed:', this.device.Feed__c);
      process.env.feedId = this.device.Feed__c;
      // Push IP to Salesforce
      const apiRequestOptions = this.client.data.createDataRequest(this.session, 'sobjects/Device__c/'+ this.device.Id);
      apiRequestOptions.body = '{"Last_Known_IP__c": "'+ ip +'"}';
      httpClient.patch(apiRequestOptions, (error, response, body) => {
        if (response && response.statusCode < 200 && response.statusCode > 299) {
          LOG.error('Failed to send device IP (HTTP '+ response.statusCode +')', body);
        } else if (error) {
          LOG.error('Failed to send device IP', error);
        }
        LOG.debug('Updated remote '+ this.hostname +' device IP');
      });
    });
  }

  // Send image to apex REST resource
  uploadPicture(picture) {
    return new Promise((resolve, reject) => {
      const apiRequestOptions = this.client.apex.createApexRequest(this.session, 'Device/'+ this.device.Id);
      apiRequestOptions.headers['Content-Type'] = 'image/jpeg';
      apiRequestOptions.body = picture;
      httpClient.post(apiRequestOptions, (error, response, body) => {
	      if (response && 
		(response.statusCode < 200 || response.statusCode > 299)) {
          LOG.error('Failed to upload ARM image (HTTP '+ response.statusCode +')', body);
          reject(response.statusCode);
        } else if (error) {
          LOG.error('Failed to upload ARM image', error);
          reject(error);
        } else {
          LOG.info('Successfully uploaded ARM image')
          resolve();
        }
      });
    });
  }

  notifyPickupCompleted() {
    return new Promise((resolve, reject) => {

      const eventData = {
        Event__c: 'ARM_Pickup_Completed',
        Device_Id__c: this.device.Id,
        Feed_Id__c: this.device.Feed__c
      };

      const apiRequestOptions = this.client.data.createDataRequest(this.session, 'sobjects/Robot_Event__e');
      apiRequestOptions.body = JSON.stringify(eventData);
      httpClient.post(apiRequestOptions, (error, response, body) => {
        if (response && response.statusCode < 200 && response.statusCode > 299) {
          LOG.error('Failed to send Robot_Event__e Platform Event (HTTP '+ response.statusCode +')', body);
          reject();
        } else if (error) {
          LOG.error('Failed to send Robot_Event__e Platform Event', error);
          reject(error);
        }
        LOG.info('Successfully notified pickup completion');
        resolve();
      });
    });
  }
}
