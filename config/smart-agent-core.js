exports['default'] = {
  // believe cupboard trip message rebel guess moral churn clean cram journey ready
  ethAccounts: {
    '0x66D487419Ac030993Dba3D893Fc99bdafDCf60bB': 'cf316cf854f6d4ae7bd7c28ad124ae6ff95e3f4f7439e67a85689c0b8f632c13'
  },
  smartAgentCore: () => {
    return {
      ethAccount: '0x66D487419Ac030993Dba3D893Fc99bdafDCf60bB',
      payments: {
        accountIdChannelManager: '0x0A0D9dddEba35Ca0D235A4086086AC704bbc8C2b',
        accountIdPaymentAgent: '0xAF176885bD81D5f6C76eeD23fadb1eb0e5Fe1b1F',
        channelBalanceLowWaterMark: 1e17, // 0.1 EVE
        channelBalanceStep: 1e18, // 1 EVE
        channelDelay: 10000,
        edgeServerEndpointCheck: '/api/smart-agents/ipfs-payments/channel/get',
        edgeServerEndpointConfirm: '/api/smart-agents/ipfs-payments/channel/confirm',
        edgeServerUrl: 'https://payments.test.evan.network',
        schedulePaymentChannelWatcher: '0 0 * * *' // everyday at 00:00
      }
    }
  }
}


exports['core'] = {
  // favorite cake peasant version wood guard hip aisle mimic chalk promote retreat
  ethAccounts: {
    '0x992b98e59CFcC47d982F0eB8Bbb2B00D85EDCce2': '874146ca958a4937c62e98b4043d4c392438285a9e06f80798dc52bf0c0e9804'
  },
  smartAgentCore: () => {
    return {
      ethAccount: '0x992b98e59CFcC47d982F0eB8Bbb2B00D85EDCce2',
      payments: {
        accountIdChannelManager: '0x543571BCad760CF43031403359762b049B771Bb5',
        accountIdPaymentAgent: '0xD21EE2c93655581Ec1C0679c9A028247e9CC9eBB',
        channelBalanceLowWaterMark: 1e17, // 0.1 EVE
        channelBalanceStep: 1e18, // 1 EVE
        channelDelay: 10000,
        edgeServerEndpointCheck: '/api/smart-agents/ipfs-payments/channel/get',
        edgeServerEndpointConfirm: '/api/smart-agents/ipfs-payments/channel/confirm',
        edgeServerUrl: 'https://payments.evan.network',
        schedulePaymentChannelWatcher: '0 0 * * *' // everyday at 00:00
      }
    }
  }
}