exports['default'] = {
  smartAgentCore: (api) => {
    return {
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
