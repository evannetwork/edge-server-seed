# edge-server-seed

## Next Version
### Features

### Fixes

### Deprecations


## Version 1.9.0
### Features
- add `ensureIdentityAuth` to `middlwares/authentication` to support authentication via identities by checking the `EvanIdentity` authentication header
- add `registerAuthMiddleware` to `SmartAgent` class for enabling identity authentication with custom auth middlewares
- remove requester information on default
- add `useIdentity` and `identity` config support


## Version 1.8.0
### Features
- add support for runtime customization


## Version 1.7.1
### Fixes
- add ens names to config for digital twin factories


## Version 1.7.0
### Features
- add middleware `check for message authentication`, that checks if action was called with up to date auth headers

### Fixes
- use new `getSmartAgentAuthHeaders` to build `EvanAuth` header for smart-agent requests
- parse time as hex message


## Version 1.6.3
### Fixes
- add missing request version to package
- adjust config to preserve raw post body


## Version 1.6.2
### Fixes
- update blockchain core to 2.8.1, update web3 to beta 55
- adjust connect to web3 provider
- add mainnet ipfs config
- add config for core network


## Version 1.6.1
### Fixes
- fix multi platform installations

## Version 1.6.0
### Features
- increase actionhero version

### Fixes
- add default en locales
- add dfs instance for each smart agent account


## Version 1.5.0
### Features
- add initializer that merges smart agent configs
- add payment channel support for smart agents
- add missing CORS handler

### Fixes
- Fix test IPFS endpoint

## Version 1.4.1
### Fixes
- enable real reconnect with ping and event listening


## Version 1.4.0
### Features
- add 0x pk prefix for ipfs signing messages

### Fixes
- adjust reconnecting issues with keepalive ping

### Deprecations
- move reconnect to smart agent core

## Version 1.3.2
### Fixes
- add REDIS_DISABLED env variable to disable redis
- set default rpc endpoint to remote


## Version 1.3.1
### Fixes
- run `mkdirp` with `npx`
- rename `evanRoot` label to `ensRoot` label
- add log message, when key exchange are being accepted


## Version 1.3.0
### Fixes
- NodeJS 10 compatibility
- websocket reconnect to blockchain fixed


## Version 1.2.0
### Features
- adjust IPFs to use authorization when ethAccount is set,

### Fixes
- remove obsolete IPFS Server startup


## Version 1.1.0
### Features
- make websocket reconnect available for other modules
- add support for passing custom web3 instances to agents runtime

### Fixes
- fix startup scripts


## Version 1.0.1
### Features
- add support for custom business center labels in `SmartAgent` (can be set by providing property `bcDomain` in agent config)


## Version 1.0.0
### Features
- use `createDefaultRuntime` for `api-blockchain-core` connection
- replace `api.bcc` references with usages of own `this.runtime`
- isolated all sensitive internal configuration data into the old edge-server repo
- extracted the nonsensitive parts into this public edge-server-seed repo
- required pushing smart-agent specific account and key configuration into the smart-agents
- postinstall script to link smart-contract-core
- dependencies for released smart-contracts-core@1.0.3 and api-blockchain-core@1.1.0


## Version 0.9.0
- initial version and release candidate for 1.0.0

