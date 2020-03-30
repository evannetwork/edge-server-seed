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
const EventEmitter = require('events')



module.exports = class Eth extends Initializer {
  constructor () {
    super()
    this.name = 'eth'
    // must run before blockchain-core initializer
    this.loadPriority = 2100
    this.startPriority = 2100
    this.stopPriority = 2100

    this.reconnecting = false

    const provider = new Web3.providers.WebsocketProvider(
      api.config.eth.provider.url,
      { clientConfig: { keepalive: true, keepaliveInterval: 5000 } })
    this.web3 = new Web3(provider, null, { transactionConfirmationBlocks: 1 })
    this.blockEmitter = new EventEmitter()
  }

  async initialize () {
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
          const blockTransactions = []
          for(let transaction of block.transactions) {
            blockTransactions.push(await this.web3.eth.getTransaction(transaction))
          }
          block.transactions = blockTransactions
        }
        this.blockEmitter.emit('data', block)
      })
    })

  }
  async stop () {}
}
