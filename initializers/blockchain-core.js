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

'use strict'
const {Initializer, api} = require('actionhero')
const sharedLib = require('@evan.network/api-blockchain-core')


module.exports = class BlockchainCore extends Initializer {
  constructor () {
    super()
    this.name = 'blockchain-core'
    // requires the eth initializer to run before
    this.loadPriority = 2200
    this.startPriority = 2200
    this.stopPriority = 2200
  }

  async initialize () {
    const contractLoader = new sharedLib.ContractLoader({
      contracts: api.solc.getContracts(),
      log: api.log,
      web3: api.eth.web3,
    });
    const accountStore = new sharedLib.AccountStore({
      log: api.log,
      accounts: api.config.ethAccounts,
    });

    const signer = new sharedLib.SignerInternal({
      config: api.config.eth.signer,
      log: api.log,
      contractLoader,
      web3: api.eth.web3,
      accountStore,
    });

    const executor = new sharedLib.Executor({
      log: api.log,
      signer,
      web3: api.eth.web3,
    });
    const nameResolver = new sharedLib.NameResolver({
      log: api.log,
      config: api.config.eth.nameResolver,
      executor,
      contractLoader,
      signer,
      web3: api.eth.web3,
    });
    const eventHub = new sharedLib.EventHub({
      config: api.config.eth.nameResolver,
      contractLoader,
      log: api.log,
      nameResolver: nameResolver,
    });
    await executor.init({
      eventHub,
    })
    const ipfs = new sharedLib.Ipfs({ node: api.ipfs.node, remoteNode: api.ipfs.remoteNode, log: api.log, })
    const cryptor = new sharedLib.Aes();
    const cryptoConfig = {};
    const defaultCryptoAlgo = 'aes';
    cryptoConfig['aes'] = cryptor;
    cryptoConfig['unencrypted'] = new sharedLib.Unencrypted();
    cryptoConfig['aesEcb'] = new sharedLib.AesEcb();
    const cryptoProvider = new sharedLib.CryptoProvider(cryptoConfig);
    const keyProvider = new sharedLib.KeyProvider({keys: api.config.encryptionKeys});
    const ipld = new sharedLib.Ipld({
      ipfs,
      keyProvider,
      cryptoProvider,
      defaultCryptoAlgo,
      originator: '',
    });

    const definition = new sharedLib.Description({
      contractLoader,
      cryptoProvider,
      dfs: ipfs,
      executor,
      nameResolver,
    });

    const sharing = new sharedLib.Sharing({
      contractLoader,
      cryptoProvider,
      definition,
      executor,
      dfs: ipfs,
      keyProvider,
      nameResolver,
      defaultCryptoAlgo: 'aes',
    });


    const dataContract = new sharedLib.DataContract({
      cryptoProvider,
      dfs: ipfs,
      executor,
      loader: contractLoader,
      nameResolver: nameResolver,
      sharing,
      web3: api.eth.web3,
      definition,
    });

    const rightsAndRoles = new sharedLib.RightsAndRoles({
      contractLoader,
      executor ,
      nameResolver,
      web3: api.eth.web3,
    });

    api['bcc'] = {
      accountStore,
      contractLoader,
      cryptoProvider,
      dataContract,
      defaultCryptoAlgo,
      definition,
      eventHub,
      executor,
      ipfs,
      ipld,
      keyProvider,
      nameResolver,
      rightsAndRoles,
      sharing,
      signer,
    }
  }

  async start () {


  }
  async stop () {}
}
