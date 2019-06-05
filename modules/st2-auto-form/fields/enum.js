// Copyright 2019 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

import _ from 'lodash';
import React from 'react';
import { BaseTextField } from './base';

import { TextFieldWrapper } from '../wrappers';

export default class EnumField extends BaseTextField {
  static icon = 'V'

  fromStateValue(v) {
    return v !== '' ? v : void 0;
  }

  toStateValue(v) {
    return v || '';
  }

  validate(v, spec={}) {
    const invalid = super.validate(v, spec);
    if (invalid !== void 0) {
      return invalid;
    }

    return v && !_.includes(spec.enum, v) && `'${v}' not in enum`;
  }

  render() {
    const { spec={}, invalid } = this.props;

    const wrapperProps = Object.assign({}, this.props, {
      labelClass: 'st2-auto-form__select',
      icon: this.constructor.icon,
    });

    if (invalid) {
      wrapperProps.invalid = invalid;
    }

    const selectProps = {
      className: 'st2-auto-form__field',
      disabled: this.props.disabled,
      value: this.props.value,
      onChange: (e) => this.handleChange(e, e.target.value),
    };

    if (invalid) {
      selectProps.className += ' ' + 'st2-auto-form__field--invalid';
    }

    return (
      <TextFieldWrapper {...wrapperProps}>
        <select {...selectProps}>
          { spec.default ? null : (
            <option value='' />
          ) }
          { _.map(spec.enum, (v) => (
            <option key={v} value={v}>{ v }</option>
          )) }
        </select>
      </TextFieldWrapper>
    );
  }
}
