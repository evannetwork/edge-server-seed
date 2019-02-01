/*
  Copyright (c) 2018-present evan GmbH.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

'use strict'
const {Initializer, api} = require('actionhero')
const Web3 = require('web3')
const EventEmitter = require('events');



module.exports = class Eth extends Initializer {
  constructor () {
    super()
    this.name = 'eth'
    // must run before blockchain-core initializer
    this.loadPriority = 2100
    this.startPriority = 2100
    this.stopPriority = 2100

    this.reconnecting = false
    this.web3 = new Web3()
    this.blockEmitter = new EventEmitter();
  }

 /**
   * add reconnect to websocker provider and use it as web3 provider
   *
   * @param      {object}  Web3         Web3 module
   * @param      {object}  web3         web3 instance (without provider)
   * @param      {string}  providerUrl  websocker provider url
   */
  addWebsocketReconnect(Web3, web3, providerUrl) {
    let websocketProvider;
    let reconnecting;

    /**
     * Reconnect the current websocket connection
     *
     * @param      {url}       url       url to connect to the websocket
     * @param      {Function}  callback  optional callback that is called when the
     *                                   reconnect is done
     */
    let reconnect = (url, callback) => {
      if (!reconnecting) {
        api.log('Lost connection to Websocket, reconnecting in 1000ms');

        reconnecting = [ ];

        setTimeout(() => {
          // stop last provider
          websocketProvider._timeout();
          websocketProvider.reset();
          websocketProvider.removeAllListeners();

          // create new provider
          websocketProvider = new web3.providers.WebsocketProvider(url, {
            clientConfig: {
              keepalive: true,
              keepaliveInterval:5000
            }
          });
          websocketProvider.on('end', () => reconnect(url));

          // remove the old provider from requestManager to prevent errors on reconnect
          delete web3._requestManager.provider;
          web3.setProvider(websocketProvider);
          websocketProvider.on('connect', () => {
            // check if any existing eventHub listeners are open
            for(let agent of api.smartAgents.registeredAgents) {
              if(agent.runtime) {
                for(let contract in agent.runtime.eventHub.eventEmitter) {
                  for(let subscription in agent.runtime.eventHub.eventEmitter[contract]) {
                    if(agent.runtime.eventHub.eventEmitter[contract][subscription]) {
                      agent.runtime.eventHub.eventEmitter[contract][subscription].options.requestManager = api.eth.web3._requestManager;
                      delete agent.runtime.eventHub.eventEmitter[contract][subscription].id;
                      agent.runtime.eventHub.eventEmitter[contract][subscription].subscribe();
                    }
                  }
                }
              }
            }
          });
          // run reconnecting callbacks
          for (let i = 0; i < reconnecting.length; i++) {
            reconnecting[i]();
          }

          reconnecting = undefined;
        }, 1000);
      }

      // add callback to the reconnecting array to call them after reconnect
      if (typeof callback === 'function') {
        reconnecting.push(callback);
      }
    }

    // connect to web3
    Web3.providers.WebsocketProvider.prototype.send = function(payload, callback) {
      let _this = this;

      // if the connection is already connecting, wait 100ms and try again
      if (websocketProvider.connection.readyState === websocketProvider.connection.CONNECTING) {
        setTimeout(function () {
          _this.send(payload, callback);
        }, 100);
        return;
      }

      // if the connection is lost, try to reconnect to the url
      if (websocketProvider.connection.readyState !== websocketProvider.connection.OPEN) {
        reconnect(websocketProvider.connection.url, () => {
          _this.send(payload, callback);
        });

        return;
      }

      // send the request
      websocketProvider.connection.send(JSON.stringify(payload));
      websocketProvider._addResponseCallback(payload, callback);
    };

    // check if an websockerProvider exists and if the url has changed => reset old one
    if (websocketProvider && websocketProvider.connection.url !== providerUrl) {
      websocketProvider.reset();
    }

    // create a new websocket connection, when its the first or the url has changed
    if (!websocketProvider || websocketProvider.connection.url !== providerUrl) {
      websocketProvider = new Web3.providers.WebsocketProvider(
        providerUrl,
        {
          clientConfig: {
            keepalive: true,
            keepaliveInterval:5000
          }
        }
      );
      websocketProvider.on('end', () => reconnect(providerUrl));

      web3.setProvider(websocketProvider);
    }
  }

  async initialize () {
    this.addWebsocketReconnect(Web3, this.web3, api.config.eth.provider.url)
    api['eth'] = {
      addWebsocketReconnect: this.addWebsocketReconnect,
      blockEmitter: this.blockEmitter,
      web3 : this.web3,
    }
  }

  async start () {

    // register block emitter listener
    this.web3.eth.subscribe('newBlockHeaders')
    .on('data', (blockHeader) => {
      this.web3.eth.getBlock(blockHeader.number)
      .then(async (block) => {
        if(block.transactions.length > 0) {
          const blockTransactions = [];
          for(let transaction of block.transactions) {
            blockTransactions.push(await this.web3.eth.getTransaction(transaction));
          }
          block.transactions = blockTransactions;
        }
        this.blockEmitter.emit('data', block)
      });
    });

  }
  async stop () {}
}
