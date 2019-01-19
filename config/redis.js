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

let host = process.env.REDIS_HOST || '127.0.0.1'
let port = process.env.REDIS_PORT || 6379
let db = process.env.REDIS_DB || 0
let password = process.env.REDIS_PASSWORD || null
const maxBackoff = 1000

if (process.env.REDIS_URL) {
  password = process.env.REDIS_URL.match(/redis:\/\/.*:(.*)@.*:\d*$/i)[1]
  host = process.env.REDIS_URL.match(/redis:\/\/.*:.*@(.*):\d*$/i)[1]
  port = parseInt(process.env.REDIS_URL.match(/redis:\/\/.*:.*@.*:(\d*)$/i)[1])
}

exports['default'] = {
  redis: (api) => {
    // konstructor: The redis client constructor method.  All redis methods must be promises
    // args: The arguments to pass to the constructor
    // buildNew: is it `new konstructor()` or just `konstructor()`?

    function retryStrategy (times) {
      if (times === 1) {
        const error = 'Unable to connect to Redis - please check your Redis config!'
        if (process.env.NODE_ENV === 'test') { console.error(error) } else { api.log(error, 'error') }
        return 5000
      }
      return Math.min(times * 50, maxBackoff)
    }

    return {
      enabled: !process.env.REDIS_DISABLED,

      '_toExpand': false,
      client: {
        konstructor: require('ioredis'),
        args: [{ port: port, host: host, password: password, db: db, retryStrategy: retryStrategy }],
        buildNew: true
      },
      subscriber: {
        konstructor: require('ioredis'),
        args: [{ port: port, host: host, password: password, db: db, retryStrategy: retryStrategy }],
        buildNew: true
      },
      tasks: {
        konstructor: require('ioredis'),
        args: [{ port: port, host: host, password: password, db: db, retryStrategy: retryStrategy }],
        buildNew: true
      }
    }
  }
}
