import React from 'react';

import Arrow from '../util/arrow';
import bem from '../util/bem';

const st2Class = bem('viewer')
    ;

export default class Label extends React.Component {
  static propTypes = {
    value: React.PropTypes.object,
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
    const { v, w } = this.props.value;

    const A = w.intersect(v)
        , B = v.intersect(w)
        // find mid point on the line excluding arrow
        , AB = B.subtract(A)
        , length = AB.length() + Arrow.size.x
        , { x, y } = AB.unit().multiply(length/2).add(A)
        ;

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
