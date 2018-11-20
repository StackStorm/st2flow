//@flow

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import style from './style.css';

export class ToolbarButton extends Component<{
  icon: string,
  onClick: Function,
}, {
  status: 'initial' | 'pending' | 'success' | 'error',
}> {
  static propTypes = {
    icon: PropTypes.string,
    onClick: PropTypes.func,
  }

  state = {
    status: 'initial',
  };

  async handleClick(e: Event) {
    e.stopPropagation();

    const { onClick } = this.props;

    if (onClick) {
      this.setState({ status: 'pending' });
      try {
        await onClick();
        this.setState({ status: 'success' });
      }
      catch (e) {
        this.setState({ status: 'error' });
      }
    }
  }

  style = style

  render() {
    const { icon } = this.props;
    const { status } = this.state;
    return (
      <div className={cx(this.style.toolbarButton, icon, this.style[status])} onClick={e => this.handleClick(e)} />
    );
  }
}

export default class Toolbar extends Component<{
  children: any,
}> {
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
                <ToolbarButton key={button.key} icon={button.props.icon} onClick={e => button.props.onClick(e)} />
              );
            })
        } 
      </div>
    );
  }
}
