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
const chaiAsPromised = require('chai-as-promised')


const expect = chai.expect
chai.use(chaiAsPromised)

const ActionHero = require('actionhero')
const actionhero = new ActionHero.Process()
let api

describe('Actionhero status Tests', function () {
  this.timeout(15000)

  before(async () => {
    api = await actionhero.start()
  })

  after(async () => {
    await actionhero.stop()
  })

  it('can not create a new class without account configuration', async () => {
    class TestClass extends api.smartAgents.SmartAgent {
      constructor(config) {
        super(config)
      }
    }

    const test = new TestClass({})
    await expect(test.initialize()).to.be.rejectedWith('No account has been configured') 
  })

  it('can not create a new class with accountId 0x000', async () => {
    class TestClass extends api.smartAgents.SmartAgent {
      constructor(config) {
        super(config)
      }
    }

    const test = new TestClass({
      ethAccount:'0x0000000000000000000000000000000000000000'
    })
    await expect(test.initialize()).to.be.rejectedWith('accountId does not exist') 
  })

  it('can not create a new class with out private key', async () => {
    class TestClass extends api.smartAgents.SmartAgent {
      constructor(config) {
        super(config)
      }
    }
    // remove account from config (if present)
    delete api.config.ethAccounts['0x15B10D6521D17a205eaC67b41770c7F447431d89']
    const test = new TestClass({
      ethAccount: '0x15B10D6521D17a205eaC67b41770c7F447431d89'
    })
    await expect(test.initialize()).to.be.rejectedWith('The private key for 0x15B10D6521D17a205eaC67b41770c7F447431d89 does not exist') 
  })  

  it('can create a new class with proper configurations', async () => {
    class TestClass extends api.smartAgents.SmartAgent {
      constructor(config) {
        super(config)
      }
    }
    // add temporary account to api
    api.config.ethAccounts['0x15B10D6521D17a205eaC67b41770c7F447431d89'] = '185f24bfafc1493b005de1d350d6853eca0555f678013dd3f555cc939e7a1ac2'
    const test = new TestClass({
      ethAccount: '0x15B10D6521D17a205eaC67b41770c7F447431d89'
    })
    await expect(test.initialize()).not.to.be.rejected 
  })  
})
