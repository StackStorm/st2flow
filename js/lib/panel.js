import React from 'react';
import ReactDOM from 'react-dom';

import bem from './util/bem';

const st2Class = bem('panel')
    ;

export default class Panel extends React.Component {
  static propTypes = {
    onToggle: React.PropTypes.func,
    onResize: React.PropTypes.func
  }

  state = {
    active: false
  };

  constructor() {
    super();
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  toggleCollapse(open) {
    this.setState({hide: !open});
  }

  componentDidMount() {
    this.setState({ size: ReactDOM.findDOMNode(this).clientWidth });
    document.addEventListener('mouseup', this.handleMouseUp);
    document.addEventListener('mousemove', this.handleMouseMove);
  }

  componentWillUnmount() {
    document.removeEventListener('mouseup', this.handleMouseUp);
  }

  componentDidUpdate(props, state) {
    if (this.props.onToggle && this.state.hide !== state.hide) {
      this.props.onToggle(this.state.hide);
    }

    if (this.props.onResize && this.state.size !== state.size) {
      this.props.onResize(this.state.hide);
    }
  }

  handleMouseDown(e) {
    const start = e.clientX;
    this.setState({ active: true, start });
  }

  handleMouseUp(e) {
    if (this.state.active) {
      let { size, start } = this.state;
      const delta = start - e.clientX;
      size = size + delta;
      this.setState({ active: false, size, start: void 0, current: void 0 });
    }
  }

  handleMouseMove(e) {
    if (this.state.active) {
      e.preventDefault();
      const { start } = this.state;
      this.setState({ current: e.clientX - start });
    }
  }

  render() {
    const props = {
      className: st2Class(null)
    }
    ;

    if (this.state.hide) {
      props.className += ' ' + st2Class(null, 'hide');
    }

    if (this.state.size) {
      props.style = Object.assign(props.style || {}, {
        flex: '0 0 auto',
        width: this.state.size
      });
    }

    const resizerProps = {
      className: st2Class('resizer'),
      onMouseDown: this.handleMouseDown
    };

    if (this.state.current) {
      resizerProps.style = {
        left: this.state.current
      };
    }

    if (this.state.active) {
      resizerProps.className += ' ' + st2Class('resizer', 'active');
    }

    return <div {...props} >
      <div {...resizerProps} />
      {this.props.children}
    </div>;
  }
}
