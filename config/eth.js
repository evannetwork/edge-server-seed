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
        url: process.env.ETH_WS_ADDRESS || 'ws://localhost:8546',
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
          businessCenterRoot: process.env.BC_ROOT || 'testbc.evan',
          evanRoot: process.env.ENS_ROOT || 'evan',
          factory: 'factory',
          admin: 'admin',
          eventhub: 'eventhub',
          profile: 'profile',
          mailbox: 'mailbox',
          wallet: 'wallet',
        },
        domains: {
          root: ['evanRoot'],
          factory: ['factory', 'businessCenterRoot'],
          adminFactory: ['admin', 'factory', 'evanRoot'],
          businessCenter: ['businessCenterRoot'],
          eventhub: process.env.ENS_EVENTS || ['eventhub', 'evanRoot'],
          profile: process.env.ENS_PROFILES || ['profile', 'evanRoot'],
          profileFactory: ['profile', 'factory', 'evanRoot'],
          mailbox: process.env.ENS_MAILBOX || ['mailbox', 'evanRoot'],
        },
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
