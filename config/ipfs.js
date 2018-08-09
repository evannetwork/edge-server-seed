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
  ipfs: (api) => {
    return {
      node: {
        repo: 'ipfs-evannetwork',
        start: true,
        config: {
          "Addresses": {
            "Swarm": [
            "/ip4/0.0.0.0/tcp/4004",
            "/ip4/127.0.0.1/tcp/4005/ws"
            ],
          },
        },
      },
      remoteNode: {
        host: 'ipfs.evan.network',
        port: '443',
        protocol: 'https',
      },
      peers: [],
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
