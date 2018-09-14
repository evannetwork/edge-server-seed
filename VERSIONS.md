# edge-server-seed

## Next Version
### Features
- use `createDefaultRuntime` for `api-blockchain-core` connection
- replace `api.bcc` references with usages of own `this.runtime`

### Fixes
### Deprecations


## Version 1.0.0
- isolated all sensitive internal configuration data into the old edge-server repo
- extracted the nonsensitive parts into this public edge-server-seed repo
- required pushing smart-agent specific account and key configuration into the smart-agents
- postinstall script to link smart-contract-core
- dependencies for released smart-contracts-core@1.0.3 and api-blockchain-core@1.1.0

## Version 0.9.0
- initial version and release candidate for 1.0.0

