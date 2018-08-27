import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import style from './style.css';

export default class Canvas extends Component {
  static propTypes = {

  }

  style = style

  render() {
    return (
      <div className={this.style.component}>
        1
      </div>
    );
  }
}
