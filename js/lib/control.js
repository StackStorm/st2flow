import React from 'react';

import bem from './util/bem';

const st2Class = bem('controls')
    , st2Icon = bem('icon')
    ;

export default class Controls extends React.Component {
  static propTypes = {
    icon: React.PropTypes.string,
    activeIcon: React.PropTypes.string,
    type: React.PropTypes.string,
    initial: React.PropTypes.bool,
    onClick: React.PropTypes.func.isRequired
  }

  state = {
    value: this.props.initial
  }

  handleClick() {
    let promise;

    this.setState({ status: undefined });

    switch(this.props.type) {
      case 'toggle':
        const state = {
          value: !this.state.value
        };
        this.setState(state);

        promise = this.props.onClick(state.value);
        break;
      case 'momentary':
      default:
        promise = this.props.onClick();
        break;
    }

    if (promise && promise.then) {
      this.setState({ status: 'running' });
      promise.then(() => {
        this.setState({ status: 'succeeded' });
      }).catch(() => {
        this.setState({ status: 'failed' });
      });
    }
  }

  setStatus(status) {
    this.setState({ status });
  }

  setValue(value) {
    this.setState({ value });
  }

  render() {
    const props = {
      className: `${st2Class('button')}`,
      onClick: () => this.handleClick()
    };

    if (this.props.activeIcon && this.state.value) {
      props.className += ' ' + st2Icon(this.props.activeIcon);
    } else {
      props.className += ' ' + st2Icon(this.props.icon);
    }

    if (this.state.value) {
      props.className += ' ' + st2Class('button', 'active');
    }

    if (this.state.status) {
      props.className += ' ' + st2Class('button', this.state.status);
    }

    return <div {...props} />;
  }
}
