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
const { api } = require('actionhero')
const request = require('request')
const schedule = require('node-schedule')
const { Logger } = require('@evan.network/dbcp')
const { createDefaultRuntime, Ipfs, Profile } = require('@evan.network/api-blockchain-core')
const { ensureAuth, ensureIdentityAuth } = require('../middlewares/authentication')

module.exports = class SmartAgent {
  constructor (config) {
    this.config = JSON.parse(JSON.stringify(config))
  }

  /**
   * create runtime for smart agent, start key exchange listener (can be disabled with
   * `ignoreKeyExchange`), start scheduler for and check storage payment channel balance (can be
   * disabled with `ignoreStoragePayments`)
   *
   * @param      {any}            runtimeConfigCustomization  custom configuration for runtime
   * @return     {Promise<void>}  resolved when done
   */
  async initialize (runtimeConfigCustomization = {}) {
    const { web3 } = runtimeConfigCustomization
    // config fore core related components
    this.coreConfig = api.config.smartAgentCore

    if (!this.config.ethAccount) {
      throw new Error('No account has been configured')
    }

    if (this.config.ethAccount === '0x0000000000000000000000000000000000000000') {
      throw new Error('accountId does not exist')
    }

    if (!api.config.ethAccounts[this.config.ethAccount]) {
      throw new Error('The private key for ' + this.config.ethAccount + ' does not exist')
    }

    if (this.config.identity === '0x0000000000000000000000000000000000000000') {
      throw new Error('identity does not exist')
    }

    // create runtime for agent, if ethAccount is configured
    if (this.config.ethAccount) {
      let nameResolverConfig = api.config.eth.nameResolver
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
          protocol: api.config.ipfs.remoteNode.protocol
        },
        web3: web3 || api.eth.web3
      })

      this.dfs = new Ipfs({
        log: api.log,
        dfsConfig: {
          host: api.config.ipfs.remoteNode.host,
          port: api.config.ipfs.remoteNode.port,
          protocol: api.config.ipfs.remoteNode.protocol
        },
        web3: web3 || api.eth.web3,
        accountId: this.config.ethAccount,
        privateKey: '0x' + api.config.ethAccounts[this.config.ethAccount]
      })

      const runtimeConfig = {
        accountMap: { [this.config.ethAccount]: api.config.ethAccounts[this.config.ethAccount] },
        identity: this.config.identity,
        keyConfig: api.config.encryptionKeys,
        nameResolver: nameResolverConfig,
        useIdentity: this.config.useIdentity || !!this.config.identity,
        ...runtimeConfigCustomization
      }

      if (this.config.runtimeConfig && this.config.runtimeConfig.hasOwnProperty('gasPrice')) {
        runtimeConfig.gasPrice = this.config.runtimeConfig.gasPrice
      }

      this.runtime = await createDefaultRuntime(
        web3 || api.eth.web3,
        this.dfs,
        runtimeConfig,
        {
          logger: new Logger({ log: api.log, logLevel: 'debug' })
        }
      )
      if (!this.config.ignoreStoragePayments) {
        await this.startPaymentChannelScheduler()
      }
      if (!this.config.ignoreKeyExchange) {
        await this.listenToKeyExchangeMails()
      }

      api.log(`Started runtime for account ${this.runtime.activeAccount} and identity ${this.runtime.activeIdentity}`, 'info')
      api.smartAgents.registeredAgents.push(this)
    }
  }

  /**
   * start event hub listener for key exchange requests
   *
   * @return     {Promise<void>}  resolved when done
   */
  async listenToKeyExchangeMails () {
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
          const { sender, recipient } = event.returnValues
          const mailboxDomain = this.runtime.nameResolver.getDomainName(api.config.eth.nameResolver.domains.mailbox)
          const mailboxAddress = await this.runtime.nameResolver.getAddress(mailboxDomain)
          // only handle mailbox events of registered mailbox, only handle mails to smart agent
          return mailboxAddress === sender && this.runtime.activeIdentity === recipient
        },
        async (event) => {
          const handleEvent = async () => {
            const { mailId } = event.returnValues
            const bmail = await this.runtime.mailbox.getMail(mailId.toString())
            if (bmail.content && bmail.content.attachments && bmail.content.attachments.length) {
              const attachments = bmail.content.attachments
              const mailType = attachments[0].type
              if (mailType === 'commKey') {
                api.log(`received key exchange mail from "${bmail.content.from}", accepting invitation`)
                // exchanging keys with smart agent
                const profileForeign = new Profile({
                  ipld: this.runtime.ipld,
                  nameResolver: this.runtime.nameResolver,
                  defaultCryptoAlgo: 'aes',
                  executor: this.runtime.executor,
                  contractLoader: this.runtime.contractLoader,
                  accountId: bmail.content.from,
                  dataContract: this.runtime.dataContract
                })
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
      api.log(`could not start listening to key exchange mails; ${ex.message || ex}`, 'warning')
    }
  }

  /**
   * Registers an auth middleware with the current runtime with the smart agent config name (e.g.
   * ensureSearchAuth). Usually `ensureEvanAuth` middleware has no runtime context and cannot ensure
   * identity authentication.
   */
  registerAuthMiddleware(authName, runtime = this.runtime) {
    api.actions.addMiddleware({
      name: authName,
      global: false,
      priority: 10,
      preProcessor: async ({ connection }) => {
        ensureAuth(connection)
        await ensureIdentityAuth(runtime, connection.evanAuth)
      }
    })
  }

  /**
   * run initial payment channel balance check and start scheduler, that repeats this regularly
   *
   * @return     {Promise<void>}  resolved when done
   */
  async startPaymentChannelScheduler () {
    const paymentConfig = {
      ...this.coreConfig.payments,
      ...this.config.payments
    }
    await this._checkChannels(paymentConfig)
    schedule.scheduleJob(
      paymentConfig.schedulePaymentChannelWatcher, async () => this._checkChannels(paymentConfig))
  }

  /**
   * build proof for given payment channel, proof assumens, that entire balance is made available
   *
   * @param      {MicroChannelInfo}  channelInfo  payments `MicroChannelInfo` instance
   * @return     {Promise<any>}      object with proof and openBlockNumber
   */
  async _buildProof (channelInfo) {
    this._setChannel(channelInfo)
    const microProof = {
      balance: this.runtime.payments.toBigNumber(channelInfo.deposit)
    }
    return {
      proof: (await this.runtime.payments.signNewProof(microProof)).sig,
      openBlockNumber: channelInfo.openBlockNumber
    }
  }

  /**
   * ensure available payment channel
   * - exit if open channel with enough funds is found
   * - topup channel if open channel with low funds is found
   * - confirm unconfirmed channel if no open channel and an unconfirmed channel is found
   * - create new channel if no open or unconfirmed channel is found
   *
   * @param      {any}            paymentConfig  payment config
   * @return     {Promise<void>}  resolved when done
   */
  async _checkChannels (paymentConfig) {
    api.log(`checking payment channel for smart agent "${this.config.name}"`, 'debug')

    this.runtime.payments.setChannelManager(paymentConfig.accountIdChannelManager)

    try {
      let openBlockNumber, proof

      // check if channel exists
      const channels = await this._promisifyRequest({
        url: `${paymentConfig.edgeServerUrl}${paymentConfig.edgeServerEndpointCheck}` })
      // check for open channels
      const open = channels.filter(c => c.state === 'OPEN')
      if (open.length) {
        // open channels found, check balance
        const toBn = this.runtime.payments.toBigNumber
        const channelInfo = open[0]
        const { deposit, balance } = channelInfo
        if (toBn(deposit)
          .minus(toBn(balance))
          .gte(toBn(paymentConfig.channelBalanceLowWaterMark))) {
          api.log(
            `payment channel for smart agent "${this.config.name}" has enough funds`, 'debug')
        } else {
          // full payment channel amoutn minus already payed to agent is lower than min => topup
          api.log(`topup payment channel for smart agent "${this.config.name}"`, 'info')
          this._setChannel(channelInfo)
          await this.runtime.payments.topUpChannel(paymentConfig.channelBalanceStep)
          // increment deposit for proof
          channelInfo.deposit =
            toBn(channelInfo.deposit).plus(toBn(paymentConfig.channelBalanceStep))
          ;({ openBlockNumber, proof } = await this._buildProof(channelInfo))
        }
      } else {
        // no open channels found, check for unconfirmed
        const unconfirmed = channels.filter(c => c.state === 'UNCONFIRMED')
        if (unconfirmed.length) {
          api.log(`confirming payment channel for smart agent "${this.config.name}"`, 'info')
          ;({ openBlockNumber, proof } = await this._buildProof(unconfirmed[0]))
        } else {
          api.log(`opening new payment channel for smart agent "${this.config.name}"`, 'info')
          openBlockNumber = (await this.runtime.payments.openChannel(
            this.runtime.activeIdentity,
            paymentConfig.accountIdPaymentAgent,
            paymentConfig.channelBalanceStep)).block
          proof = (await this.runtime.payments.incrementBalanceAndSign(
            `${paymentConfig.channelBalanceStep}`)).sig

          // wait 10s to let agent handle channel open events on its end
          await new Promise(
            (resolve) => { setTimeout(() => { resolve() }, paymentConfig.channelDelay) })
        }
      }
      // confirm channel at other agent to enable payments with it
      if (openBlockNumber && proof) {
        api.log(`sending proof for payment channel of smart agent "${this.config.name}"`, 'debug')
        await this._promisifyRequest({
          url: `${paymentConfig.edgeServerUrl}${paymentConfig.edgeServerEndpointConfirm}`,
          body: {
            openBlockNumber,
            proof
          }
        })
      }
    } catch (ex) {
      api.log('could not ensure payment channel for smart agent ' +
        `"${this.config.name}"; ${ex.message || ex}; ${ex.stack || ''}`, 'error')
    }
  }

  /**
   * get header with evan auth info
   *
   * @return     {Promise}  headers for request
   */
  async _getHeaders () {
    const signingAccount = this.runtime.underlyingAccount || this.runtime.activeIdentity
    const toSignedMessage = this.runtime.nameResolver
      .soliditySha3(new Date().getTime() + this.runtime.activeIdentity)
      .replace('0x', '')
    const hexMessage = this.runtime.web3.utils.utf8ToHex(toSignedMessage)
    const privateKey = await this.runtime.accountStore.getPrivateKey(signingAccount)
    const { signature } =
      await this.runtime.web3.eth.accounts.sign(toSignedMessage, `0x${privateKey}`)

    return {
      authorization: [
        `EvanAuth ${signingAccount}`,
        `EvanMessage ${hexMessage}`,
        `EvanSignedMessage ${signature}`
      ].join(',')
    }
  }

  /**
   * wrap smart agent rest request as promise
   *
   * @param      {any}   options  options for request
   * @return     {Promise}  result of request
   */
  async _promisifyRequest (options) {
    let chunks = ''
    return new Promise(async (resolve, reject) => {
      request({
        method: 'POST',
        json: true,
        headers: await this._getHeaders(),
        ...options
      })
        .on('data', (chunk) => {
          chunks += chunk
        })
        .on('end', (responseRaw) => {
          const response = JSON.parse(chunks)
          if (response.status === 'error') {
            reject(new Error(`request "${options.url}" failed; ${response.error}`))
          } else {
            // TODO: rename 'channels' to 'result'?
            resolve(response.channels || response.result)
          }
        })
        .on('error', (ex) => {
          reject(new Error(`request "${options.url}" failed; ${ex.message || ex}`))
        })
    })
  }

  /**
   * set current payment channel
   *
   * @param      {MicroChannelInfo}  channelInfo  payments `MicroChannelInfo` instance
   * @return     {Promise<void>}     resolved when done
   */
  async _setChannel (channelInfo) {
    const microProof = {
      balance: this.runtime.payments.toBigNumber(channelInfo.deposit)
    }
    const channel = {
      account: channelInfo.sender,
      receiver: channelInfo.receiver,
      block: channelInfo.openBlockNumber,
      proof: microProof
    }
    this.runtime.payments.setChannel(channel)
  }
}
