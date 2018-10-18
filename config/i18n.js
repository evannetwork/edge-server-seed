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
  i18n: (api) => {
    return {
      // visit https://github.com/mashpie/i18n-node to see all configuration options
      // locale path can be configired from within ./config/api.js
      locales: ['en'],

      // how would you like your lanaguages to fall back if a translation string is missing?
      fallbacks: {
        // 'es': 'en'
      },

      // configure i18n to allow for object-style key lookup
      objectNotation: true,

      // should actionhero append any missing translations to the locale file?
      updateFiles: true,

      // this will configure logging and error messages in the log(s)
      defaultLocale: 'en',

      // the name of the method by which to determine the connection's locale
      // by default, every request will be in the 'en' locale
      // this method will be called witin the localiazation middleware on all requests
      determineConnectionLocale: 'api.i18n.determineConnectionLocale'
    }
  }
}

exports.test = {
  i18n: (api) => {
    return {
      updateFiles: true
    }
  }
}
