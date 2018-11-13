//@flow

import type { Node } from 'react';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import style from './style.css';

export default class Action extends Component<{
  name: string,
  icon: string,
  children?: Node,
}, {
  open: bool,
}> {
  static propTypes = {
    name: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    children: PropTypes.node,
  }

  state = {
    open: false,
  }

  style = style

  handleTogglePack(e: Event) {
    e.stopPropagation();

    const { open } = this.state;

    this.setState({ open: !open });
  }

  render() {
    const { name, icon, children } = this.props;
    const { open } = this.state;

    return (
      <div className={this.style.pack}>
        <div
          className={this.style.packName}
          onClick={e => this.handleTogglePack(e)}
        >
          <div>
            <i className={open ? 'icon-chevron-down' : 'icon-chevron_right'} />
          </div>
          <div>
            <img src={icon} width="32" height="32" />
          </div>
          <div>
            { name }
          </div>
        </div>
        {
          open && children
        }
      </div>
    );
  }
}
