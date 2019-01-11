# edge-server-seed

## Next Version
### Features
### Fixes
### Deprecations

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

### Fixes
### Deprecations

## Version 1.0.0
### Features
- use `createDefaultRuntime` for `api-blockchain-core` connection
- replace `api.bcc` references with usages of own `this.runtime`
- isolated all sensitive internal configuration data into the old edge-server repo
- extracted the nonsensitive parts into this public edge-server-seed repo
- required pushing smart-agent specific account and key configuration into the smart-agents
- postinstall script to link smart-contract-core
- dependencies for released smart-contracts-core@1.0.3 and api-blockchain-core@1.1.0
### Fixes
### Deprecations


## Version 0.9.0
- initial version and release candidate for 1.0.0

