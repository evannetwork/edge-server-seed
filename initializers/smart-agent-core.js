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
const { createDefaultRuntime, Profile, Ipfs } = require('@evan.network/api-blockchain-core')


class SmartAgent {
  constructor(config) {
    this.config = JSON.parse(JSON.stringify(config))
  }

  async initialize({ web3 } = {}) {
    // create runtime for agent, if ethAccount is configured
    if (this.config.ethAccount) {
      let nameResolverConfig = api.config.eth.nameResolver;
      if (this.config.bcDomain) {
        // overwrite business center domain label if set in agents own config
        nameResolverConfig = JSON.parse(JSON.stringify(nameResolverConfig))
        nameResolverConfig.labels.businessCenterRoot = this.config.bcDomain
      }

      // setup the bcc IPFS connection with account informations
      api.dfs = new Ipfs({
        log: api.log,
        dfsConfig: {
          host: api.config.ipfs.remoteNode.host,
          port: api.config.ipfs.remoteNode.port,
          protocol: api.config.ipfs.remoteNode.protocol,
        },
        web3: web3 || api.eth.web3,
        accountId: this.config.ethAccount,
        privateKey: '0x' + api.config.ethAccounts[this.config.ethAccount]
      })

      this.runtime = await createDefaultRuntime(
        web3 || api.eth.web3,
        api.dfs,
        {
          accountMap: { [this.config.ethAccount]: api.config.ethAccounts[this.config.ethAccount] },
          nameResolver: nameResolverConfig,
          keyConfig: api.config.encryptionKeys,
        }
      )
      if (!this.config.ignoreKeyExchange) {
        await this.listenToKeyExchangeMails()
      }
      api.smartAgents.registeredAgents.push(this)
    }
  }

  async listenToKeyExchangeMails() {
    try {
      let processingQueue = Promise.resolve()
      // get block from last uptime
      const lastBlock = (await api.redis.clients.client.get(`evannetwork:${this.config.name}:lastBlockOnboarding`)) || (await api.eth.web3.eth.getBlockNumber())
      await this.runtime.eventHub.subscribe(
        'EventHub',
        null,
        'MailEvent',
        async (event) => {
          // store block as uptime
          await api.redis.clients.client.set(`evannetwork:${this.config.name}:lastBlockOnboarding`, event.blockNumber)
          const {sender, recipient} = event.returnValues
          const mailboxDomain = this.runtime.nameResolver.getDomainName(api.config.eth.nameResolver.domains.mailbox)
          const mailboxAddress = await this.runtime.nameResolver.getAddress(mailboxDomain)
          // only handle mailbox events of registered mailbox, only handle mails to smart agent
          return mailboxAddress === sender && this.config.ethAccount === recipient
        },
        async (event) => {
          const handleEvent = async () => {
            const {mailId} = event.returnValues
            const bmail = await this.runtime.mailbox.getMail(mailId)
            if (bmail.content && bmail.content.attachments && bmail.content.attachments.length) {
              const attachments = bmail.content.attachments
              const mailType = attachments[0].type
              if (mailType === 'commKey') {
                api.log(`received key exchange mail from "${bmail.content.from}", accepting invitation`)
                // exchanging keys with smart agent
                const profileForeign =  new Profile({
                  ipld: this.runtime.ipld,
                  nameResolver: this.runtime.nameResolver,
                  defaultCryptoAlgo: 'aes',
                  executor: this.runtime.executor,
                  contractLoader: this.runtime.contractLoader,
                  accountId: bmail.content.from,
                  dataContract: this.runtime.dataContract
                });
                const publicKeyProfile = await profileForeign.getPublicKey()
                const commSecret = this.runtime.keyExchange.computeSecretKey(publicKeyProfile)
                const commKey = await this.runtime.keyExchange.decryptCommKey(
                  attachments[0].key,
                  commSecret.toString('hex')
                )
                await this.runtime.profile.addContactKey(bmail.content.from, 'commKey', commKey.toString('utf-8'))
                await this.runtime.profile.storeForAccount('addressBook')
              }
            }
          }
          processingQueue = processingQueue
            .then(handleEvent)
            .catch((ex) => {
              // log errors as warnings because events handled here MAY origin from older config states
              api.log(`error occurred while handling event from block ${event.blockNumber}; ${ex.message || ex}${ex.stack ? ex.stack : ''}`, 'warning')
            })
          return processingQueue
        },
        lastBlock
      )
    } catch (ex) {
      api.log(`could not start listening to key exchange mails; ${ ex.message || ex }`, 'warning')
    }
  }
}

module.exports = class SmartAgentCore extends Initializer {
  constructor () {
    super()
    this.name = 'smart-agent-core'
    this.loadPriority = 2300
    this.startPriority = 2300
    this.stopPriority = 2300
  }

  async initialize () {

    api.smartAgents = {
      SmartAgent,
      registeredAgents: []
    }
  }

  async start () {


  }
  async stop () {}
}
