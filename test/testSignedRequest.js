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

const { createDefaultRuntime, Ipfs } = require('@evan.network/api-blockchain-core')

const expect = chai.expect
chai.use(dirtyChai)

const ActionHero = require('actionhero')
const actionhero = new ActionHero.Process()
let api, testAccountRuntime

const getAuthHeaders = (runtime, accountId, privateKey, timeOffset = 0) => {
  const message = `${Date.now() + timeOffset}`
  const signature = runtime.web3.eth.accounts.sign(message, privateKey).signature

  return {
    authorization: [
      `EvanAuth ${accountId}`,
      `EvanMessage ${message}`,
      `EvanSignedMessage ${signature}`
    ].join(',')
  }
}

describe('Test signed requests', function () {
  this.timeout(15000)

  before(async () => {
    api = await actionhero.start()

    const runtimeConfig = {
      // account map to blockchain accounts with their private key
      accountMap: {
        '0x1e7f9CE1aF9f1cB882997F730803dfb30B244b4F':
          '1a4109c1b38876217c0cafbed666c8d6d1522e34e89982e1c33d1e96119979e8'
      },
      // key configuration for private data handling
      keyConfig: {
        '0x1e7f9CE1aF9f1cB882997F730803dfb30B244b4F': 'Test1234'
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
  })

  after(async () => {
    await actionhero.stop()
  })

  it('should have booted into the test env', () => {
    expect(process.env.NODE_ENV).to.equal('test')
    expect(api.env).to.equal('test')
    expect(api.id).to.be.ok()
  })

  it('can retrieve successfull auth status', async () => {
    const connection = await api.specHelper.Connection.createAsync()
    connection.rawConnection.req = {
      headers: getAuthHeaders(
        testAccountRuntime,
        '0x1e7f9CE1aF9f1cB882997F730803dfb30B244b4F',
        '0x1a4109c1b38876217c0cafbed666c8d6d1522e34e89982e1c33d1e96119979e8'
      )
    }
    const { error, isAuthenticated } = await api.specHelper.runAction('authenticated', connection)

    expect(error).to.be.eq(undefined)
    expect(isAuthenticated).to.be.eq(true)
  })

  it('can retrieves error when auth failed', async () => {
    const connection = await api.specHelper.Connection.createAsync()
    connection.rawConnection.req = {
      headers: getAuthHeaders(
        testAccountRuntime,
        '0x1e7f9CE1aF9f1cB882997F730803dfb30B244b4F',
        '0xf567916caecd6fe3ef1b2f531b5353999c3c3d659b30a99d5b2b170f474a52b8' // wrong private key
      )
    }
    const { error, isAuthenticated } = await api.specHelper.runAction('authenticated', connection)

    expect(error).to.be.not.empty()
    expect(isAuthenticated).to.be.eq(undefined)
  })

  it('can retrieves error when auth time is to long ago', async () => {
    const connection = await api.specHelper.Connection.createAsync()
    connection.rawConnection.req = {
      headers: getAuthHeaders(
        testAccountRuntime,
        '0x1e7f9CE1aF9f1cB882997F730803dfb30B244b4F',
        '0x1a4109c1b38876217c0cafbed666c8d6d1522e34e89982e1c33d1e96119979e8',
        (-6 * 60 * 1000) // 6 minutes before
      )
    }
    const { error, isAuthenticated } = await api.specHelper.runAction('authenticated', connection)

    expect(error).to.be.eq('Error: Signed message has been expired.')
    expect(isAuthenticated).to.be.eq(undefined)
  })
})
