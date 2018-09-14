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

  async initialize () {
    // connect to web3
    Web3.providers.WebsocketProvider.prototype.send = (payload, callback) => {
      let _this = this;

      // if the connection is already connecting, wait 100ms and try again
      if (this.websocketProvider.connection.readyState === this.websocketProvider.connection.CONNECTING) {
        setTimeout(function () {
          _this.send(payload, callback);
        }, 100);
        return;
      }

      // if the connection is lost, try to reconnect to the url
      if (this.websocketProvider.connection.readyState !== this.websocketProvider.connection.OPEN) {
        this.reconnect(this.websocketProvider.connection.url, () => {
          _this.send(payload, callback);
        });

        return;
      }

      // send the request
      this.websocketProvider.connection.send(JSON.stringify(payload));
      this.websocketProvider._addResponseCallback(payload, callback);
    };

    // check if an websockerProvider exists and if the url has changed => reset old one
    if (this.websocketProvider && this.websocketProvider.connection.url !== api.config.eth.provider.url) {
      this.websocketProvider.reset();
    }

    // create a new websocket connection, when its the first or the url has changed
    if (!this.websocketProvider || this.websocketProvider.connection.url !== api.config.eth.provider.url) {
      this.websocketProvider = new this.web3.providers.WebsocketProvider(api.config.eth.provider.url);
      this.websocketProvider.on('end', () => this.reconnect(api.config.eth.provider.url));

      this.web3.setProvider(this.websocketProvider);
    }

    api['eth'] = {
      web3 : this.web3,
      blockEmitter: this.blockEmitter
    }
  }

  /**
   * Reconnect the current websocket connection
   *
   * @param      {url}       url       url to connect to the websocket
   * @param      {Function}  callback  optional callback that is called when the
   *                                   reconnect is done
   */
  reconnect(url, callback) {
    if (!this.reconnecting) {
      api.log('Lost connection to Websocket, reconnecting in 1000ms');

      this.reconnecting = [ ];

      setTimeout(() => {
        // stop last provider
        this.websocketProvider._timeout();
        this.websocketProvider.reset();
        this.websocketProvider.removeAllListeners();

        // create new provider
        this.websocketProvider = new this.web3.providers.WebsocketProvider(url);
        this.websocketProvider.on('end', () => this.reconnect(url));

        // remove the old provider from requestManager to prevent errors on reconnect
        delete this.web3._requestManager.provider;
        this.web3.setProvider(this.websocketProvider);
        this.websocketProvider.on('connect', () => {
          // check if any existing eventHub listeners are open
          for(let contract in api.bcc.eventHub.eventEmitter) {
            for(let subscription in api.bcc.eventHub.eventEmitter[contract]) {
              if(api.bcc.eventHub.eventEmitter[contract][subscription]) {
                api.bcc.eventHub.eventEmitter[contract][subscription].options.requestManager = api.eth.web3._requestManager;
                delete api.bcc.eventHub.eventEmitter[contract][subscription].id;
                api.bcc.eventHub.eventEmitter[contract][subscription].subscribe();
              }
            }
          }
        });
        // run reconnecting callbacks
        for (let i = 0; i < this.reconnecting.length; i++) {
          this.reconnecting[i]();
        }

        this.reconnecting = undefined;
      }, 1000);
    }

    // add callback to the reconnecting array to call them after reconnect
    if (typeof callback === 'function') {
      this.reconnecting.push(callback);
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
