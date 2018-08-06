const Winston = require('winston');

// Enable WebSockets for CometD
var window = {};
window.WebSocket = require('ws');

require('cometd-nodejs-client').adapt();
const cometdlib = require('cometd');
const cometd = new cometdlib.CometD();
const subscriptions = [];

// Configure logs
Winston.loggers.add('COMETD', {
  console: { level: 'info', colorize: true, label: 'COMETD' }
});
const LOG = Winston.loggers.get('COMETD');

module.exports = class CometdWrapper {
  configure(config) {
    cometd.configure(config);
  }

  connect() {
    LOG.debug('Connecting to CometD server...');
    return new Promise((resolve, reject) => {
      cometd.handshake(handshake => {
        if (handshake.successful) {
          LOG.debug('Successfully connected to CometD server.');
          resolve();
        } else {
          const error = 'Unable to connect to CometD ' + JSON.stringify(handshake);
          LOG.error(error);
          reject(error);
        }
      });
    });
  }

  subscribe(topic, onMessageCallback) {
    LOG.debug('Subscribing to '+ topic);
    return new Promise((resolve, reject) => {
      subscriptions.push(cometd.subscribe(topic, onMessageCallback, null, subResponse => {
        if (subResponse.successful) {
          LOG.debug('Successfully subscribed to '+ topic);
          resolve();
        } else {
          const error = 'Failed to subscribe to '+ subResponse.subscription +', reason: '+ subResponse.error;
          LOG.error(error);
          reject(error);
        }
      }));
    });
  }

  unsubscribe(subscription) {
    LOG.debug('Unsubscribing from '+ subscription.channel);
    return new Promise((resolve, reject) => {
      cometd.unsubscribe(subscription, unsubResponse => {
        if (unsubResponse.successful) {
          LOG.debug('Successfully unsubscribed from '+ subscription.channel);
          resolve();
        } else {
          const error = 'Failed to unsubscribe from '+ subscription.channel +', reason: '+ unsubResponse.error;
          LOG.error(error);
          reject(error);
        }
      });
    });
  }

  batch(cometdPromises) {
    return new Promise((resolve, reject) => {
      cometd.startBatch();
      Promise.all(cometdPromises).then(() => {
        cometd.endBatch();
        resolve();
      }).catch(e => {
        cometd.endBatch();
        reject(e);
      });
    });
  }

  disconnect() {
    return new Promise((resolve, reject) => {
      LOG.debug('Batch unsubscribing...');
      const cometdPromises = subscriptions.map(subscription => (this.unsubscribe(subscription)) );
      this.batch(cometdPromises).then(() => {
        LOG.debug('Disconnecting...');
        cometd.disconnect(false, null, () => {
          LOG.debug('Successfully disconnected');
          resolve();
        });
      });
    });
  }
}
