'use strict'
const { api } = require('actionhero')

const MAX_AGE = 1000 * 60 * 5 // max age of signed message is 5m

// save account-identity mappings and profile addresses to reduce auth middleware load time
const authCache = {
  profileIndexAddress: '',
  identity: { },
  profile: { },
}

/**
 * Uses a runtime and the authComponents result from the ensureAuth function, to check if the
 * address, passed to the EvanIdentity auth header, is permitted for the EvanAuth address..
 *
 * @param      {bcc.Runtime}  runtime         blockchain-core runtime for getting verifications,
 *                                            accessing profile index
 * @param      {any}          authComponents  authorization gheader content (EvanAuth, EvanIdentity,
 *                                            EvanMessage, EvanSignedMessage)
 */
const ensureIdentityAuth = async (runtime, authComponents) => {
  // if no identity was passed as auth header, check for old / new profile and try to load identity
  if (!authComponents.EvanIdentity) {
    const nullAddress = '0x0000000000000000000000000000000000000000'
    const identity = authCache.identity[authComponents.EvanAuth] || await runtime.verifications
      .getIdentityForAccount(authComponents.EvanAuth, true)
    authComponents.EvanIdentity = identity

    // if no identity could be loaded, just use the account as identity
    if (authComponents.EvanIdentity === nullAddress) {
      authComponents.EvanIdentity = authComponents.EvanAuth
    } else {
      authCache.identity[authComponents.EvanAuth] = identity

      if (!authCache.profileIndexAddress) {
        // load profile index to load identities profile address from
        const profileRegstryDomain = runtime.nameResolver
          .getDomainName(runtime.nameResolver.config.domains.profile)
        authCache.profileIndexAddress = await runtime.nameResolver.getAddress(profileRegstryDomain)
      }

      const profileIndex = runtime.nameResolver.contractLoader
        .loadContract('ProfileIndexInterface', authCache.profileIndexAddress)

      // Check if an identity address has an underlying profile
      const profileAddress = authCache.profile[authComponents.EvanIdentity]
        || await runtime.nameResolver.executor.executeContractCall(
          profileIndex,
          'getProfile',
          authComponents.EvanIdentity,
          { from: authComponents.EvanIdentity },
        )

      // if no profile could be found, its basically a old profile and we can reset the identity
      // address
      if (profileAddress === nullAddress) {
        authComponents.EvanIdentity = authComponents.EvanAuth
      } else {
        authCache.profile[authComponents.EvanIdentity] = profileAddress
      }
    }
  }

  if (authComponents.EvanAuth !== authComponents.EvanIdentity) {
    const verificationHolderContract = runtime.contractLoader.loadContract(
      'VerificationHolder', authComponents.EvanIdentity,
    )
    const hasPermissionOnIdentity = await runtime.executor.executeContractCall(
      verificationHolderContract,
      'keyHasPurpose',
      runtime.nameResolver.soliditySha3(authComponents.EvanAuth),
      '1',
    )

    if (!hasPermissionOnIdentity) {
      throw new Error('Account is not permitted for the provided identity.')
    }
  }
}

/**
 * verify auth headers; example for creating a signed auth header:
 * web3.eth.accounts.sign(`${Date.now()}`, `0x${privateKey}`)
 *
 * @param      {any}  connection  actionhero connection instance
 */
const ensureAuth = (connection) => {
  if (!connection.rawConnection.req.headers.authorization) {
    throw new Error('no authorization headers provided')
  }

  const splitAuthHeader = connection.rawConnection.req.headers.authorization.split(',')
  const authComponents = {}

  splitAuthHeader.forEach(authHeader => {
    const splitHeader = authHeader.split(' ')

    authComponents[splitHeader[0]] = splitHeader[1]
  })

  const signedTime = parseInt(authComponents.EvanMessage, 16)

  if (signedTime + MAX_AGE < Date.now() || isNaN(signedTime)) {
    throw new Error('Signed message has been expired.')
  }

  const authId = api.eth.web3.eth.accounts.recover(
    authComponents.EvanMessage,
    authComponents.EvanSignedMessage
  )

  if (authId !== authComponents.EvanAuth) {
    throw new Error('No verified Account.')
  }

  // attach the authenticated accountId to the connection
  connection.evanAuth = authComponents
}

/**
 * Usage: api.actions.addMiddleware(authMiddleware) in initializer
 */
const authMiddleware = {
  name: 'ensureEvanAuth',
  global: false,
  priority: 10,
  preProcessor: async ({ connection }) => ensureAuth(connection),
}

module.exports = {
  authMiddleware,
  ensureAuth,
  ensureIdentityAuth,
}
