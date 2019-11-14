// Copyright 2019 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

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
