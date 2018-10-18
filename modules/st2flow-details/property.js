import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import { Toggle } from '@stackstorm/module-forms/button.component';

import style from './style.css';

export default class Property extends Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    value: PropTypes.bool,
    onChange: PropTypes.func,
  }

  style = style

  render() {
    const { name, description, value, onChange } = this.props;
    return (
      <div className={this.style.property}>
        <div className={this.style.propertyName}>{ name }</div>
        <div className={this.style.propertyDescription}>{ description }</div>
        <div className={this.style.propertyToggle}>
          <Toggle value={value} onChange={onChange} />
        </div>
      </div>
    );
  }
}
