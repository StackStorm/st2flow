import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import style from './style.css';

export class Toolbar extends Component {
  static propTypes = {
    secondary: PropTypes.bool,
    children: PropTypes.node,
  }

  style = style

  render() {
    const { secondary } = this.props;
    return (
      <div className={cx(this.style.toolbar, secondary && this.style.secondary)} >
        { this.props.children }
      </div>
    );
  }
}

export class ToolbarButton extends Component {
  static propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
    stretch: PropTypes.bool,
    selected: PropTypes.bool,
  }

  style = style

  render() {
    const { className, stretch, selected, ...props } = this.props;
    return (
      <div className={cx(this.style.toolbarButton, className, stretch && this.style.stretch, selected && this.style.selected)} {...props} >
        { this.props.children }
      </div>
    );
  }
}

export class Panel extends Component {
  static propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
  }

  style = style

  render() {
    const { className } = this.props;
    return (
      <div className={cx(this.style.panel, className)} >
        { this.props.children }
      </div>
    );
  }
}
