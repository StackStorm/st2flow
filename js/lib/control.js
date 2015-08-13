import React from 'react';

import bem from './util/bem';

const st2Class = bem('controls')
    , st2Icon = bem('icon')
    ;

export default class Controls extends React.Component {
  static propTypes = {
    icon: React.PropTypes.string,
    type: React.PropTypes.string,
    initial: React.PropTypes.bool,
    onClick: React.PropTypes.func.isRequired
  }

  state = {
    value: this.props.initial
  }

  handleClick() {
    switch(this.props.type) {
      case 'toggle':
        const state = {
          value: !this.state.value
        };
        this.setState(state);

        this.props.onClick(state.value);
        break;
      case 'momentary':
      default:
        this.props.onClick();
        break;
    }
  }

  setValue(value) {
    this.setState({ value });
  }

  render() {
    const props = {
      className: `${st2Class('button')} ${st2Icon(this.props.icon)}`,
      onClick: () => this.handleClick()
    };

    if (this.state.value) {
      props.className += ' ' + st2Class('button', 'active');
    }

    return <div {...props} />;
  }
}
