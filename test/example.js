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

const getAuthHeader = (runtime, accountId, privateKey) => {
  const toSignedMessage = runtime.web3.utils
    .soliditySha3(new Date().getTime() + accountId)
    .replace('0x', '')
  const hexMessage = runtime.web3.utils.utf8ToHex(toSignedMessage)
  const signature = runtime.web3.eth.accounts.sign(toSignedMessage, privateKey).signature
  return {
    authorization: [
      `EvanAuth ${accountId}`,
      `EvanMessage ${hexMessage}`,
      `EvanSignedMessage ${signature}`
    ].join(',')
  }
}

describe('actionhero Tests', function () {
  this.timeout(15000);

  before(async () => {
    api = await actionhero.start();

    const runtimeConfig = {
      // account map to blockchain accounts with their private key
      accountMap: {
        '0x4a1e316d637776E209579FBD39d4740BBbaF8B93':
          'f567916caecd6fe3ef1b2f531b5353261c3c3d659b30a99d5b2b170f474a52b8'
      },
      // key configuration for private data handling
      keyConfig: {
        '0x4a1e316d637776E209579FBD39d4740BBbaF8B93': 'Test1234',
        '0xd9264cfd4eb749babe7dcaace96b5bfb99d9d775858a039f0f340f412a925092': '346c22768f84f3050f5c94cec98349b3c5cbfa0b7315304e13647a4918ffff22'
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
    // const dfs = new Ipfs({ remoteNode: new IpfsApi(runtimeConfig.ipfs) })

    // create runtime
    testAccountRuntime = await createDefaultRuntime(
      web3,
      undefined,
      {
        accountMap: runtimeConfig.accountMap,
        keyConfig: runtimeConfig.keyConfig
      }
    )
  })

  after(async () => { await actionhero.stop(); })

  it('should have booted into the test env', () => {
    expect(process.env.NODE_ENV).to.equal('test')
    expect(api.env).to.equal('test')
    expect(api.id).to.be.ok()
  })

  it('can retrieve server uptime via the status action', async () => {
    let {uptime} = await api.specHelper.runAction('status')

    expect(uptime).to.be.above(0)
  })

  it('can retrieve message auth status', async () => {
    const connection = await api.specHelper.Connection.createAsync();
    connection.rawConnection.req = {
      headers: getAuthHeader(
        testAccountRuntime,
        '0x4a1e316d637776E209579FBD39d4740BBbaF8B93',
        '0xf567916caecd6fe3ef1b2f531b5353261c3c3d659b30a99d5b2b170f474a52b8'
      )
    }
    const {error, isAuthenticated} = await api.specHelper.runAction( 'authenticated', connection);

    expect(error).to.be.eq(undefined);
    expect(isAuthenticated).to.be.eq(true)
  })
})
