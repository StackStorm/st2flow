import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import style from './style.css';

export default class Toolbar extends Component {
  static propTypes = {
    children: PropTypes.node,
  }

  style = style

  render() {
    return (
      <div
        className={cx(this.style.toolbar)}
      >
        {
          this.props.children
            .map(button => {
              return (
                <div key={button.key} className={cx(this.style.toolbarButton, button.props.icon)} onClick={e => button.props.onClick(e)} />
              );
            })
        } 
      </div>
    );
  }
}
