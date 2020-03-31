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

/* global describe, before, after, it */

'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const IpfsApi = require('ipfs-api')
const Web3 = require('web3')

const { createDefaultRuntime, Ipfs, utils: { getSmartAgentAuthHeaders } } =
  require('@evan.network/api-blockchain-core')

const expect = chai.expect
chai.use(dirtyChai)

const testAccounts = {
  oldAccount: {
    account: '0x1e7f9CE1aF9f1cB882997F730803dfb30B244b4F',
    identity: '0x332A9AEf3ab283cB0c7270428cAb7A1e34c487db',
    privateKey: '1a4109c1b38876217c0cafbed666c8d6d1522e34e89982e1c33d1e96119979e8',
    password: 'Test1234',
  },
  newAccount: {
    account: '0x0CdE1CfdD1cc7a1e16a52803e7e74B07F55793a3',
    identity: '0x89C656Aa2dB8748D7DF4C60DB2D9603d4f14174C',
    privateKey: 'dbcdefbffdfddcf81ef567fe313ea894986adc2fa98ce69c6b9a2867e58af245',
    password: 'Test1234',
  },
}

process.env.NODE_ENV = 'test'

describe('Test signed requests', async function () {
  this.timeout(15000)

  /**
   * Run the signed requests test with a specific configuration, to handle multiple cases. (account
   * vs. identity based)
   *
   * @param      {string}  type           just text for the wrapping describe
   * @param      {string}  accountConfig  account configuration that should be used (oldAccount /
   *                                      newAccount)
   */
  const runTestsWithConfig = (type, accountConfig) => {
    const ActionHero = require('actionhero')
    const actionhero = new ActionHero.Process()
    let api, testAccountRuntime

    const getAuthHeaders = async (runtime, timeOffset = 0, identity = undefined) => {
      return {
        authorization: timeOffset
          ? await getSmartAgentAuthHeaders(testAccountRuntime, `${Date.now() + timeOffset}`, identity)
          : await getSmartAgentAuthHeaders(testAccountRuntime, undefined, identity)
      }
    }
    const getAuthHeadersWithWrongKey = (runtime, timeOffset = 0) => {
      const privateKey = '0xf567916caecd6fe3ef1b2f531b5353999c3c3d659b30a99d5b2b170f474a52b8' // wrong
      const message = `${Date.now() + timeOffset}`
      const signature = runtime.web3.eth.accounts.sign(
        message, privateKey).signature

      return {
        authorization: [
          `EvanAuth ${accountConfig.account}`,
          `EvanMessage ${message}`,
          `EvanSignedMessage ${signature}`
        ].join(',')
      }
    }

    describe(type, function () {
      before(async () => {
        api = await actionhero.start()

        const runtimeConfig = {
          // account map to blockchain accounts with their private key
          accountMap: {
            [accountConfig.account]: accountConfig.privateKey
          },
          // key configuration for private data handling
          keyConfig: {
            [accountConfig.account]: accountConfig.password,
          },
          // ipfs configuration for evan.network storage
          ipfs: { host: 'ipfs.test.evan.network', port: '443', protocol: 'https' },
          // web3 provider config (currently evan.network testcore)
          web3Provider: 'wss://testcore.evan.network/ws'
        }
        const provider = new Web3.providers.WebsocketProvider(
          runtimeConfig.web3Provider,
          { clientConfig: { keepalive: true, keepaliveInterval: 5000 } }
        )
        const web3 = new Web3(provider, null, { transactionConfirmationBlocks: 1 })
        const dfs = new Ipfs({ remoteNode: new IpfsApi(runtimeConfig.ipfs) })

        // create runtime
        testAccountRuntime = await createDefaultRuntime(
          web3,
          dfs,
          {
            accountMap: runtimeConfig.accountMap,
            keyConfig: runtimeConfig.keyConfig
          }
        )

        // register custom smart agent for testing identity middleware
        // believe cupboard trip message rebel guess moral churn clean cram journey ready
        api.config.smartAgentCore.ethAccount = '0x66D487419Ac030993Dba3D893Fc99bdafDCf60bB'
        api.config.ethAccounts = Object.assign(api.config.ethAccounts || { }, {
          '0x66D487419Ac030993Dba3D893Fc99bdafDCf60bB': 'cf316cf854f6d4ae7bd7c28ad124ae6ff95e3f4f7439e67a85689c0b8f632c13'
        })
        // create custom smart agent and register identity auth middleware for correct test behavior
        api.testSmartAgent = new api.smartAgents.SmartAgent(api.config.smartAgentCore)
        await api.testSmartAgent.initialize()
        api.testSmartAgent.registerAuthMiddleware('ensureTestAuth', api.testSmartAgent.runtime)
        api.actions.actions.authenticated['1'].middleware = ['ensureTestAuth']
      })

      after(async () => {
        await actionhero.stop()
      })

      it('should have booted into the test env', () => {
        expect(process.env.NODE_ENV).to.equal('test')
        expect(api.env).to.equal('test')
        expect(api.id).to.be.ok()
      })

      it('should authenticate requests succesful', async () => {
        const connection = await api.specHelper.Connection.createAsync()
        connection.rawConnection.req = {
          headers: await getAuthHeaders(testAccountRuntime)
        }
        const { error, isAuthenticated } = await api.specHelper.runAction('authenticated', connection)

        expect(error).to.be.eq(undefined)
        expect(isAuthenticated).to.be.eq(true)
      })

      it('should return an error when auth failed', async () => {
        const connection = await api.specHelper.Connection.createAsync()
        connection.rawConnection.req = {
          headers: getAuthHeadersWithWrongKey(testAccountRuntime)
        }
        const { error, isAuthenticated } = await api.specHelper.runAction('authenticated', connection)

        expect(error).to.be.not.empty()
        expect(isAuthenticated).to.be.eq(undefined)
      })

      it('should return an error when auth time is too long ago', async () => {
        const connection = await api.specHelper.Connection.createAsync()
        connection.rawConnection.req = {
          headers: await getAuthHeaders(testAccountRuntime, (-6 * 60 * 1000)) // 6 minutes before
        }
        const { error, isAuthenticated } = await api.specHelper.runAction('authenticated', connection)

        expect(error).to.be.eq('Error: Signed message has been expired.')
        expect(isAuthenticated).to.be.eq(undefined)
      })

      it('should reject when accessing unpermitted identity', async () => {
        const connection = await api.specHelper.Connection.createAsync()
        connection.rawConnection.req = {
          headers: await getAuthHeaders(testAccountRuntime, 0, '0x18aa46f4940817b132ade068f08d13df44e07220') // 6 minutes before
        }
        const { error, isAuthenticated } = await api.specHelper.runAction('authenticated', connection)

        expect(error).to.be.eq('Error: Account is not permitted for the provided identity.')
        expect(isAuthenticated).to.be.eq(undefined)
      })
    })
  }

  runTestsWithConfig('Test signed requests with account based profile', testAccounts.oldAccount)
  runTestsWithConfig('Test signed requests with identity based profile', testAccounts.newAccount)
})
