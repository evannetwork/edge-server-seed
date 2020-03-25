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
const { Initializer, api } = require('actionhero')
const { createDefaultRuntime } = require('@evan.network/api-blockchain-core')

const SmartAgent = require('../lib/smart-agent')
const { authMiddleware } = require('../middlewares/authentication')


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

    // start the initialization code
    const smartAgentCore = new SmartAgent(api.config.smartAgentCore)
    await smartAgentCore.initialize()

    // objects and values used outside initializer
    api.smartAgentCore = smartAgentCore

    // add authentication middleware to agent
    api.actions.addMiddleware(authMiddleware)
  }
}
