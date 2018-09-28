import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import style from './style.css';

export default class Header extends Component {
  static propTypes = {
    className: PropTypes.string,
  }

  style = style

  render() {
    return (
      <div className={cx(this.props.className, this.style.component)}>
        <div className={this.style.logo}>Extreme</div>
        <div className={this.style.subtitle}>Workflow Designer</div>
      </div>
    );
  }
}
