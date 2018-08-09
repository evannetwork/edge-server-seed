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

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const ActionHero = require('actionhero')
const actionhero = new ActionHero.Process()
let api

describe('actionhero Tests', () => {
  before(async () => { api = await actionhero.start() })
  after(async () => { await actionhero.stop() })

  it('should have booted into the test env', () => {
    expect(process.env.NODE_ENV).to.equal('test')
    expect(api.env).to.equal('test')
    expect(api.id).to.be.ok()
  })

  it('can retrieve server uptime via the status action', async () => {
    let {uptime} = await api.specHelper.runAction('status')
    expect(uptime).to.be.above(0)
  })
})
