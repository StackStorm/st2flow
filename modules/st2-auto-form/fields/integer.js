// Copyright 2020 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

import validator from 'validator';

import { BaseTextField, isJinja } from './base';

export default class IntegerField extends BaseTextField {
  static icon = '12'

  fromStateValue(v) {
    if (isJinja(v)) {
      return v;
    }

    return v !== '' ? validator.toInt(v, 10) : void 0;
  }

  toStateValue(v) {
    if (isJinja(v)) {
      return v;
    }

    return v != null ? v.toString(10) : '';
  }

  validate(v, spec={}) {
    const invalid = super.validate(v, spec);
    if (invalid !== void 0) {
      return invalid;
    }

    if (v && Math.abs(+v) > Number.MAX_SAFE_INTEGER) {
      // too long to represent as integer.  process as string
      return `'${v}' is too large`;
    }

    return v && !validator.isInt(v) && `'${v}' is not an integer`;
  }
}
