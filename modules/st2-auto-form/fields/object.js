// Copyright 2020 Extreme Networks, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import _ from 'lodash';
import { BaseTextareaField, isJinja } from './base';

export default class ObjectField extends BaseTextareaField {
  static icon = 'braces';

  fromStateValue(v) {
    if (isJinja(v)) {
      return v;
    }

    if (v !== '' && v !== undefined) {
      try {
        return JSON.parse(v);
      }
      catch (error) {
        console.error('Could not parse JSON - ', error);
        return void 0;
      }
    }

    return void 0;
  }

  toStateValue(v) {
    if (isJinja(v)) {
      return v;
    }

    return v === null ? '' : JSON.stringify(v || {}, null, 2);
  }

  validate(v, spec) {
    const invalid = super.validate(v, spec);
    if (invalid !== void 0) {
      return invalid;
    }

    try {
      const o = v && JSON.parse(v);
      if (o && !_.isPlainObject(o)) {
        return 'value is not an object';
      }

      return false;
    }
    catch (e) {
      return e.message;
    }
  }
}
