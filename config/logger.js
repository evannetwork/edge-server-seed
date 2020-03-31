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
const cluster = require('cluster')

exports['default'] = {
  logger: (api) => {
    let logger = {transports: []}

    // console logger
    if (cluster.isMaster) {
      logger.transports.push(function (api, winston) {
        return new (winston.transports.Console)({
          colorize: true,
          level: 'debug',
          timestamp: function () { return api.id + ' @ ' + new Date().toISOString() }
        })
      })
    }

    // file logger
    logger.transports.push(function (api, winston) {
      if (api.config.general.paths.log.length === 1) {
        const logDirectory = api.config.general.paths.log[0]
        try {
          fs.mkdirSync(logDirectory)
        } catch (e) {
          if (e.code !== 'EEXIST') {
            throw (new Error('Cannot create log directory @ ' + logDirectory))
          }
        }
      }

      return new (winston.transports.File)({
        filename: api.config.general.paths.log[0] + '/' + api.pids.title + '.log',
        level: 'info',
        timestamp: function () { return api.id + ' @ ' + new Date().toISOString() }
      })
    })

    // the maximum length of param to log (we will truncate)
    logger.maxLogStringLength = 100

    // you can optionally set custom log levels
    // logger.levels = {good: 0, bad: 1}

    // you can optionally set custom log colors
    // logger.colors = {good: 'blue', bad: 'red'}

    return logger
  }
}

exports.test = {
  logger: (api) => {
    return {
      transports: null
    }
  }
}
