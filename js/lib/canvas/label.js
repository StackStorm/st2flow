import React from 'react';

import bem from '../util/bem';

const st2Class = bem('viewer')
    ;

export default class Label extends React.Component {
  static propTypes = {
    value: React.PropTypes.object,
    x: React.PropTypes.number,
    y: React.PropTypes.number,
    onClick: React.PropTypes.func
  }

  state = {}

  constructor() {
    super();

    this._resetFallthrough = () => {
      this.setState({ fallthrough: false });
    };
  }

  componentDidMount() {
    document.addEventListener('dragend', this._resetFallthrough);
  }

  componentWillUnmount() {
    document.removeEventListener('dragend', this._resetFallthrough);
  }

  handleClick(e) {
    e.stopPropagation();

    if (this.props.onClick) {
      return this.props.onClick(e);
    }
  }

  handleDragEnter(e) {
    e.stopPropagation();

    this.setState({ fallthrough: true });
  }

  handleDragLeave(e) {
    e.stopPropagation();
  }

  render() {
    const { x, y } = this.props;

    const props = {
      className: st2Class('label') + ' ' + st2Class('label', this.props.value.type),
      style: {
        transform: `translate(${x}px, ${y}px)`,
        WebkitTransform: `translate(${x}px, ${y}px)`
      },
      onClick: (e) => this.handleClick(e),
      onDragEnter: (e) => this.handleDragEnter(e),
      onDragLeave: (e) => this.handleDragLeave(e)
    };

    if (this.state.fallthrough) {
      props.style.pointerEvents = 'none';
    }

    return <div {...props} />;
  }
}
