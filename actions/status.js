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

const ActionHero = require('actionhero')
const path = require('path')
const packageJSON = require(path.normalize(path.join(__dirname, '..', 'package.json')))

// These values are probably good starting points, but you should expect to tweak them for your application
const maxEventLoopDelay = process.env.eventLoopDelay || 10
const maxMemoryAlloted = process.env.maxMemoryAlloted || 200
const maxResqueQueueLength = process.env.maxResqueQueueLength || 1000

module.exports = class RandomNumber extends ActionHero.Action {
  constructor () {
    super()
    this.name = 'status'
    this.description = 'I will return some basic information about the API'
    this.outputExample = {
      id: '192.168.2.11',
      actionheroVersion: '9.4.1',
      uptime: 10469
    }
  }

  async checkRam (data) {
    const consumedMemoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100
    data.response.consumedMemoryMB = consumedMemoryMB
    if (consumedMemoryMB > maxMemoryAlloted) {
      data.response.nodeStatus = data.connection.localize('Unhealthy')
      data.response.problems.push(data.connection.localize(['Using more than {{maxMemoryAlloted}} MB of RAM/HEAP', {maxMemoryAlloted: maxMemoryAlloted}]))
    }
  }

  async checkEventLoop (data) {
    const api = ActionHero.api
    const eventLoopDelay = await api.utils.eventLoopDelay(10000)

    data.response.eventLoopDelay = eventLoopDelay
    if (eventLoopDelay > maxEventLoopDelay) {
      data.response.nodeStatus = data.connection.localize('Node Unhealthy')
      data.response.problems.push(data.connection.localize(['EventLoop Blocked for more than {{maxEventLoopDelay}} ms', {maxEventLoopDelay: maxEventLoopDelay}]))
    }
  }

  async checkResqueQueues (data) {
    const api = ActionHero.api
    const details = await api.tasks.details()
    let length = 0

    Object.keys(details.queues).forEach((q) => {
      length += details.queues[q].length
    })

    data.response.resqueTotalQueueLength = length

    if (length > maxResqueQueueLength) {
      data.response.nodeStatus = data.connection.localize('Node Unhealthy')
      data.response.problems.push(data.connection.localize(['Resque Queues over {{maxResqueQueueLength}} jobs', {maxResqueQueueLength: maxResqueQueueLength}]))
    }
  }

  async run (data) {
    const api = ActionHero.api

    data.response.nodeStatus = data.connection.localize('Node Healthy')
    data.response.problems = []

    data.response.id = api.id
    data.response.actionheroVersion = api.actionheroVersion
    data.response.uptime = new Date().getTime() - api.bootTime
    data.response.name = packageJSON.name
    data.response.description = packageJSON.description
    data.response.version = packageJSON.version

    await this.checkRam(data)
    await this.checkEventLoop(data)
    await this.checkResqueQueues(data)
  }
}
