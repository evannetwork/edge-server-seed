'use strict'
const { api } = require('actionhero')

const MAX_AGE = 1000 * 60 * 5; // max age of signed message is 5m

/**
 * verify auth headers; example for creating a signed auth header:
 * web3.eth.accounts.sign(`${accountId}|${Date.now()}`, `0x${privateKey}`)
 *
 * @param {any} connection actionhero connection instance
 */
const _ensureAuth = (connection) => {
  if (!connection.rawConnection.req.headers.authorization) {
    throw new Error('no authorization headers provided')
  }

  const splitAuthHeader = connection.rawConnection.req.headers.authorization.split(',')
  const authComponents = {}
  const signedTime = parseInt(authComponents.EvanMessage, 10)

  splitAuthHeader.forEach(authHeader => {
    const splitHeader = authHeader.split(' ')

    authComponents[splitHeader[0]] = splitHeader[1]
  })

  if (signedTime + MAX_AGE < Date.now()) {
    throw new Error('Signed message has been expired.')
  }

  const authId = api.eth.web3.eth.accounts.recover(
    authComponents.EvanMessage,
    authComponents.EvanSignedMessage
  )

  if (authId !== authComponents.EvanAuth) {
    throw new Error('No verified Account.')
  }

  return authComponents
}

/**
 * Usage: api.actions.addMiddleware(authMiddleware) in initializer
 */
const authMiddleware = {
  name: 'check for message authentication',
  global: false,
  priority: 10,
  preProcessor: ({connection}) => {
    _ensureAuth(connection)
  }
}

module.exports = {
  authMiddleware
}
