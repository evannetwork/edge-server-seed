# EdgeServer

An ActionHero with built-in blochchain and evan.network infrastructure.
Also has REDIS built in.


## To install:
(assuming you have [node](http://nodejs.org/) and NPM installed)

`npm install`

## To Run:
`npm start`

## To Test:
`npm test`


# SmartAgents

SmartAgents work more or less the same as the SmartAgents in vanilla ActionHero, with two exceptions:

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
      edge server
