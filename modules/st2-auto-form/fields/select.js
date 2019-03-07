import _ from 'lodash';
import React from 'react';
import { BaseTextField } from './base';

export default class SelectField extends BaseTextField {
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

    return v && !spec.options.find(o => o.value === v) && `'${v}' is not a valid item`;
  }

  render() {
    const { spec={} } = this.props;
    const { value } = this.state;

    const selectProps = {
      className: 'st2-auto-form__field',
      disabled: this.props.disabled,
      value,
      onChange: (e) => this.handleChange(e, e.target.value),
    };

    if (this.state.invalid) {
      selectProps.className += ' ' + 'st2-auto-form__field--invalid';
    }

    return (
      <div className="st2-auto-form__select">
        <select {...selectProps}>
          { spec.default ? null : (
            <option value='' />
          ) }
          { _.map(spec.options, (o) => (
            <option key={o.value} value={o.value}>{ o.text }</option>
          ) ) }
        </select>
      </div>
    );
  }
}
