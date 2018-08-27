import React, { Component } from 'react';

import style from './style.css';

export default class Header extends Component {
  static propTypes = {}

  style = style

  render() {
    return (
      <div className={this.style.component}>
        <div className={this.style.logo}>Extreme</div>
        <div className={this.style.subtitle}>Workflow Designer</div>
      </div>
    );
  }
}
