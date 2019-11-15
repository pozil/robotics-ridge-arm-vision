const jsforce = require('jsforce');
import Configuration from './configuration.js';
import getLogger from './logger.js';

const logger = getLogger('SFDC');

export default class SalesforceClient {
    constructor() {
        this.connection = new jsforce.Connection({
            loginUrl: Configuration.getSfLoginUrl(),
            version: '47.0'
        });
    }

    async connect() {
        return this.connection
            .login(
                Configuration.getSfUsername(),
                Configuration.getSfSecuredPassword()
            )
            .then(() => {
                logger.info('Connected to Salesforce');
                return Promise.resolve();
            });
    }

    /**
     * Subscribes to a streaming event channel
     * @param {string} channel
     * @param {Function} callback callback function called for each streaming event
     */
    subscribeToStreamingEvent(channel, callback) {
        this.connection.streaming.topic(channel).subscribe(callback);
        logger.info(`Subscribed to ${channel}`);
    }

    /**
     * Publishes a Robot_Event__e Platform Event
     * @param {*} eventData
     * @returns {Promise} Promise that resolves when event is published
     */
    async publishPlatformEvent(eventData) {
        return new Promise((resolve, reject) => {
            this.connection
                .sobject('Robot_Event__e')
                .insert(eventData, (error, result) => {
                    if (error || !result.success) {
                        logger.error(error, result);
                        reject(error);
                    } else {
                        logger.info(
                            `Published Platform Event: ${JSON.stringify(
                                eventData
                            )}`
                        );
                        resolve(eventData);
                    }
                });
        });
    }

    /**
     * Uploads image to apex REST resource
     * @param {string} deviceId
     * @param {*} picture binary content
     */
    async uploadPicture(deviceId, picture) {
        // Can't use jsforce.apex.post because of issue #946
        const request = {
            url: `/services/apexrest/Device/${deviceId}`,
            method: 'POST',
            headers: {
                'Content-Type': 'image/jpeg'
            },
            body: picture
        };
        return this.connection.request(request);
    }

    async getDeviceFromHostname(hostname) {
        return new Promise((resolve, reject) => {
            const soql = `SELECT Id, Feed__c FROM Device__c WHERE Hostname__c='${hostname}'`;
            this.connection.query(soql, (error, result) => {
                if (error) {
                    logger.error('Failed to retrieve device', error);
                    reject();
                } else if (result.records.length === 0) {
                    logger.error(
                        `Failed to find device with Hostname__c='${hostname}' in Salesforce`
                    );
                    reject();
                } else {
                    resolve(result.records[0]);
                }
            });
        });
    }

    async updateDeviceIp(deviceId, ip) {
        return new Promise((resolve, reject) => {
            const device = {
                Id: deviceId,
                Last_Known_IP__c: ip
            };
            this.connection.sobject('Device__c').update(device, error => {
                if (error) {
                    logger.error('Failed to update device IP', error);
                    reject();
                } else {
                    logger.info(`Updated device IP to ${ip}`);
                    resolve();
                }
            });
        });
    }
}
