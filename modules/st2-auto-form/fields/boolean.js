// Copyright 2019 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

import React from 'react';

import { BaseTextField } from './base';
import { BooleanFieldWrapper } from '../wrappers';

export default class BooleanField extends BaseTextField {
  toStateValue(v) {
    return v !== void 0 ? !!v : false;
  }

  fromStateValue(v) {
    return v !== void 0 ? !!v : void 0;
  }

  validate(v) {
    return v !== void 0 && typeof v !== 'boolean' && `'${v}' is not boolean`;
  }

  render() {
    const wrapperProps = Object.assign({}, this.props, {
      onReset: (e) => this.handleChange(e, void 0),
    });

    const inputProps = {
      className: 'st2-auto-form__checkbox',
      disabled: this.props.disabled,
      checked: !this.validate(this.state.value) && this.state.value,
      onChange: (e) => this.handleChange(e, e.target.checked),
    };

    if (this.props.spec.default && this.props.value === void 0) {
      inputProps.className += ' ' + 'st2-auto-form__checkbox--default';
    }

    return (
      <BooleanFieldWrapper {...wrapperProps}>
        <input type="checkbox" {...inputProps} />
      </BooleanFieldWrapper>
    );
  }
}
