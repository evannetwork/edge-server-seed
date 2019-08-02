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
const fs = require('fs')
const { Initializer, api } = require('actionhero')

module.exports = class SmartAgentCore extends Initializer {
  constructor () {
    super()
    this.name = 'smart-agent-config-merge'
    this.loadPriority = 1000
    this.startPriority = 1000
    this.stopPriority = 1000
  }

  async initialize () {
    const plugins = api.config.plugins
    for (let plugin of Object.keys(plugins)) {
      // check each smart agent in configured plugins
      if (plugin.startsWith('smart-agent-')) {
        const configPath = `${plugins[plugin].path}/config`
        const files = fs.readdirSync(configPath).filter(file => file.endsWith('.js'))
        for (let file of files) {
          // current config file into discovered config, do not overwrite current config values
          const localConfig = require(`${configPath}/${file}`)
          if (localConfig['default']) {
            api.config = api.utils.hashMerge(api.config, localConfig['default'], api)
          }
          if (localConfig[api.env]) {
            api.config = api.utils.hashMerge(api.config, localConfig[api.env], api)
          }
        }
      }
    }
  }
}
