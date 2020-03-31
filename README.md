# EdgeServer

An ActionHero with built-in blochchain and evan.network infrastructure for developers to implement their own Smart
Agents on top of. Also has REDIS built in.


## To install:
(assuming you have [node](http://nodejs.org/) and NPM installed)

`npm install`

## To Run:
`npm start`

## To Test:
`npm test`


# SmartAgents

SmartAgents work more or less the same as the SmartAgents in vanilla [ActionHero](https://www.actionherojs.com/), with two exceptions:

- there is the api.redis object available for local storage
- there is the api.bcc object available that serves as the interface to the blockchain-core
- the agents that perform transactions or need to access encrypted data have to
  configure the necessary keys in the base level `ethAccounts` and `encryptionKeys` config
  mappings

    ```javascript
    ethAccounts: {
        'accountID' : 'privatekey',
    },
    encryptionKeys: {
        'hash':'encryptionkey',
    }
    ```

The hash to index for encryptionKeys is constructed by the blockchain core in different ways for the
different puposes, But usually it is just a SHA3 hash of an accountID or of a descriptive string.

## Register SmartAgent
For registering a SmartAgent, create an initializer and add something like in the example below. This creates a new instance of your SmartAgent and makes it available for other actionhero components at the `api` (in this case at `api.smartAgentTest`. As this SmartAgent extends `api.smartAgents.SmartAgent`, it will have a property called `runtime`, that can be used for interaction with evan.network (see [API documentation](https://api-blockchain-core.readthedocs.io/en/latest/index.html) for details).

```js
const { api, Initializer } = require('actionhero')

module.exports = class SmartAgentTestInitializer extends Initializer {
  constructor () {
    super()
    this.name = 'smart-agent-test'
    this.loadPriority = 4100
    this.startPriority = 4100
    this.stopPriority = 4100
  }

  async initialize () {
    if (api.config.smartAgentTest.disabled) {
      return
    }

    // specialize from blockchain smart agent library
    class SmartAgentTest extends api.smartAgents.SmartAgent {
      async initialize () {
        await super.initialize()
      }
    }

    // start the initialization code
    const smartAgentTest = new SmartAgentTest(api.config.smartAgentTest)
    await smartAgentTest.initialize()

    // objects and values used outside initializer
    api.smartAgentTest = smartAgentTest
  }
}

```

## Auth middleware
By default, the `edge-server-seed` registers the `ensureEvanAuth` authentication header that checks a signed message with a provided evan account. So the action can only be executed, when the `Authorization` header with the correct information was passed ([getSmartAgentAuthHeaders](https://github.com/evannetwork/api-blockchain-core/blob/master/src/common/utils.ts#L45)). You can use this middleware like below:

```js
const { Action } = require('actionhero')

class Authenticated extends Action {
  constructor () {
    super()
    this.name = 'authenticated'
    this.description = 'Will check if message is signed properly, will throw error if not.'
    this.outputExample = {
      isAuthenticated: true
    }

    this.middleware = ['ensureEvanAuth']
  }

  async run ({ response }) {
    response.isAuthenticated = true
  }
}

module.exports = Authenticated
```

The latest updates of the `@evan.network/api-blockchain-core` also provide the possibility to check if the passed `EvanAuth` address is allowed to interact on behalf of the passed `EvanIdentity`. To enable this check, you need to register your own authentication middleware from your smart agent instance and pass a valid `@evan.network/api-blockchain-core` runtime.

- initializer
```js
api.testSmartAgent = new api.smartAgents.SmartAgent({ ... })
await api.testSmartAgent.initialize()
api.testSmartAgent.registerAuthMiddleware('ensureTestAuth', api.testSmartAgent.runtime)
```

- action

```js
const { Action } = require('actionhero')

class Authenticated extends Action {
  constructor () {
    super()
    this.name = 'authenticated'
    this.description = 'Will check if message is signed properly, will throw error if not.'
    this.outputExample = {
      isAuthenticated: true
    }

    this.middleware = ['ensureTestAuth']
  }

  async run ({ response, evanAuth }) {
    console.log(evanAuth.EvanIdentity)
    response.isAuthenticated = true
  }
}

module.exports = Authenticated
```
