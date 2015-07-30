'use strict';

const bem = require('./bem')
    , React = require('react')
    ;

const st2Class = bem('controls')
    , st2Icon = bem('icon')
    ;

class Controls extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: props.initial
    };
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

Controls.propTypes = {
  icon: React.PropTypes.string,
  type: React.PropTypes.string,
  initial: React.PropTypes.bool,
  onClick: React.PropTypes.func.isRequired
};

module.exports = Controls;
