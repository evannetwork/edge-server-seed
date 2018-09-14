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
  plugins: (api) => {
    /*
    If you want to use plugins in your application, include them here:

    return {
      'myPlugin': { path: __dirname + '/../node_modules/myPlugin' }
    }

    You can also toggle on or off sections of a plugin to include (default true for all sections):

    return {
      'myPlugin': {
        path: __dirname + '/../node_modules/myPlugin',
        actions: true,
        tasks: true,
        initializers: true,
        servers: true,
        public: true,
        cli: true
      }
    }
    */

    return {
      // needs to initialize the api solc object
      'smart-contracts-core': { path: __dirname + '/../node_modules/@evan.network/smart-contracts-core' },
    }
  }
}
