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
const { Ipld, KeyExchange, KeyProvider, Mailbox, Profile } = require('@evan.network/api-blockchain-core')


class SmartAgent {
  constructor(config) {
    this.config = config
  }
  async initialize() {
    this.keyProvider = new KeyProvider({keys: api.config.encryptionKeys})
    this.keyProvider.log = api.log
    if (!this.config.disableKeyExchange) {
      this.ipld = new Ipld({
        log: api.log,
        ipfs: api.bcc.ipfs,
        keyProvider: this.keyProvider,
        cryptoProvider: api.bcc.cryptoProvider,
        defaultCryptoAlgo: api.bcc.defaultCryptoAlgo,
        originator: api.eth.web3.utils.soliditySha3(this.config.ethAccount),
      })

      // 'own' key provider, that won't be linked to profile and used in 'own' ipld
      // this prevents key lookup infinite loops
      const keyProviderOwn = new KeyProvider({keys: api.config.encryptionKeys})
      keyProviderOwn.log = api.log
      const ipldOwn = new Ipld({
        log: api.log,
        ipfs: api.bcc.ipfs,
        keyProvider: keyProviderOwn,
        cryptoProvider: api.bcc.cryptoProvider,
        defaultCryptoAlgo: api.bcc.defaultCryptoAlgo,
        originator: api.eth.web3.utils.soliditySha3(this.config.ethAccount),
      })
      this.profileOwn = new Profile({
        ipld: ipldOwn,
        nameResolver: api.bcc.nameResolver,
        defaultCryptoAlgo: 'aes',
        executor: api.bcc.executor,
        contractLoader: api.bcc.contractLoader,
        accountId: this.config.ethAccount,
        dataContract: api.bcc.dataContract,
      })
  
      if(!await this.profileOwn.exists()) {
        const keyExchangeOptions = {
          log: api.log,
          mailbox: null,
          cryptoProvider:  api.bcc.cryptoProvider,
          defaultCryptoAlgo: api.bcc.defaultCryptoAlgo,   
          account: this.config.ethAccount,
          keyProvider: this.keyProvider,
        };
        const keyExchange = new KeyExchange(keyExchangeOptions);
        await this.profileOwn.createProfile(keyExchange.getDiffieHellmanKeys());
      }
      this.keyProvider.init(this.profileOwn)
      this.keyProvider.currentAccount = this.config.ethAccount
      this.mailbox = new Mailbox({
        log: api.log,
        mailboxOwner: this.config.ethAccount,
        nameResolver: api.bcc.nameResolver,
        ipfs: api.bcc.ipfs,
        contractLoader: api.bcc.contractLoader,
        cryptoProvider:  api.bcc.cryptoProvider,
        keyProvider: this.keyProvider,
        defaultCryptoAlgo: api.bcc.defaultCryptoAlgo,
      })
      const ownContactKey = await this.profileOwn.getContactKey(this.config.ethAccount, 'dataKey');
      if (!ownContactKey) {
        throw new Error(`missing data key for account ${this.config.ethAccount}`)
      }
      this.keyExchange = new KeyExchange({
        log: api.log,
        mailbox: this.mailbox,
        cryptoProvider: api.bcc.cryptoProvider,
        defaultCryptoAlgo: api.bcc.defaultCryptoAlgo,
        account: this.config.ethAccount,
        keyProvider: this.keyProvider,
        privateKey: Buffer.from(ownContactKey, 'hex'),
        publicKey: Buffer.from(await this.profileOwn.getPublicKey(), 'hex'),
      })
      await this.listenToKeyExchangeMails()
    }
  }
  async listenToKeyExchangeMails() {
    try {
      let processingQueue = Promise.resolve()
      // get block from last uptime
      const lastBlock = (await api.redis.clients.client.get(`evannetwork:${this.config.name}:lastBlockOnboarding`)) || (await api.eth.web3.eth.getBlockNumber())
      await api.bcc.eventHub.subscribe(
        'EventHub',
        null,
        'MailEvent',
        async (event) => {
          // store block as uptime
          await api.redis.clients.client.set(`evannetwork:${this.config.name}:lastBlockOnboarding`, event.blockNumber)
          const {sender, recipient} = event.returnValues
          const mailboxDomain = api.bcc.nameResolver.getDomainName(api.config.eth.nameResolver.domains.mailbox)
          const mailboxAddress = await api.bcc.nameResolver.getAddress(mailboxDomain)
          // only handle mailbox events of registered mailbox, only handle mails to smart agent
          return mailboxAddress === sender && this.config.ethAccount === recipient
        },
        async (event) => {
          const handleEvent = async () => {
            const {mailId} = event.returnValues
            const bmail = await this.mailbox.getMail(mailId)
            if (bmail.content && bmail.content.attachments && bmail.content.attachments.length) {
              const attachments = bmail.content.attachments
              const mailType = attachments[0].type
              if (mailType === 'commKey') {
                // exchanging keys with smart agent
                const profileForeign =  new Profile({
                  ipld: this.ipld,
                  nameResolver: api.bcc.nameResolver,
                  defaultCryptoAlgo: 'aes',
                  executor: api.bcc.executor,
                  contractLoader: api.bcc.contractLoader,
                  accountId: bmail.content.from,
                  dataContract: api.bcc.dataContract
                });  
                const publicKeyProfile = await profileForeign.getPublicKey()
                const commSecret = this.keyExchange.computeSecretKey(publicKeyProfile)
                const commKey = await this.keyExchange.decryptCommKey(
                  attachments[0].key,
                  commSecret.toString('hex')
                )
                await this.profileOwn.addContactKey(bmail.content.from, 'commKey', commKey.toString('utf-8'))
                await this.profileOwn.storeForAccount('addressBook')
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
    }
  }

  async start () {


  }
  async stop () {}
}
