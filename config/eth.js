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

exports['default'] = {

  /*
    The blockchain account keys used by the different components,
    Format:
      "accountID" : "private key",

    any smart agent or other component has its own 'ethAccounts' section,
    which will be merged into one object
  */
  ethAccounts: process.env.ETH_ACCOUNTS ? JSON.parse(process.env.ETH_ACCOUNTS) : {},
  encryptionKeys: {
    '0xd9264cfd4eb749babe7dcaace96b5bfb99d9d775858a039f0f340f412a925092':
      '346c22768f84f3050f5c94cec98349b3c5cbfa0b7315304e13647a4918ffff22'
  },

  eth: (api) => {
    return {
      provider: {
        // parity/geth endpoint
        url: process.env.ETH_WS_ADDRESS || 'wss://testcore.evan.network/ws',
      },
      signer: {
        // gas price to pay in wei
        // unset config value or set it to falsy for use median of last blocks as gas price
        gasPrice: 0,
        // if falsy only estimate gas limit if no gas option was provided
        // if truthy, ignore given gas value, 1.1 ==> adds 10% to estimated value
        alwaysAutoGasLimit: process.env.AUTO_GAS_LIMIT || 1.1,
      },
      nameResolver: {
        ensAddress: process.env.ENS_ADDRESS || '0x937bbC1d3874961CA38726E9cD07317ba81eD2e1',
        ensResolver: process.env.ENS_RESOLVER || '0xDC18774FA2E472D26aB91deCC4CDd20D9E82047e',
        labels: {
          admin: 'admin',
          businessCenterRoot: process.env.BC_ROOT || 'testbc.evan',
          container: 'container',
          dids: 'dids',
          ensRoot: process.env.ENS_ROOT || 'evan',
          eventhub: 'eventhub',
          factory: 'factory',
          index: 'index',
          mailbox: 'mailbox',
          profile: 'profile',
          vcs: 'vcs',
          wallet: 'wallet',
        },
        domains: {
          adminFactory: ['admin', 'factory', 'ensRoot'],
          businessCenter: ['businessCenterRoot'],
          containerFactory: ['container', 'factory', 'ensRoot'],
          didRegistry: ['dids', 'ensRoot'],
          eventhub: process.env.ENS_EVENTS || ['eventhub', 'ensRoot'],
          factory: ['factory', 'businessCenterRoot'],
          indexFactory: ['index', 'factory', 'ensRoot'],
          mailbox: process.env.ENS_MAILBOX || ['mailbox', 'ensRoot'],
          profile: process.env.ENS_PROFILES || ['profile', 'ensRoot'],
          profileFactory: ['profile', 'factory', 'ensRoot'],
          root: ['ensRoot'],
          vcRegistry: ['vcs', 'ensRoot'],
        },
      },
    }
  }
}


exports['core'] = {
  eth: (api) => {
    return {
      provider: {
        // parity/geth endpoint
        url: process.env.ETH_WS_ADDRESS || 'wss://core.evan.network/ws',
      },
      nameResolver: {
        ensAddress: process.env.ENS_ADDRESS || '0xc913ac6522344187bc9C88C9f9302b005500FfF9',
        ensResolver: process.env.ENS_RESOLVER || '0xa4cfA55769dc770F33402e3d669dc96c0e46c6c4',
      }
    }
  }
}

exports.test = {
  tasks: (api) => {
    return {
      // do we need something here?
    }
  }
}
