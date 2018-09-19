import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import style from './style.css';

export default class Header extends Component {
  static propTypes = {
    className: PropTypes.string,
  }

  render() {
    return (
      <div className={`${this.props.className} ${style.component}`}>
        <div className={style.logo}>Extreme</div>
        <div className={style.subtitle}>Workflow Designer</div>
      </div>
    );
  }
}
