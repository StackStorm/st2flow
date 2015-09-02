import React from 'react';

import bem from './util/bem';

const st2Class = bem('panel')
    ;

export default class Panel extends React.Component {
  static propTypes = {
    onToggle: React.PropTypes.func
  }

  state = {};

  toggleCollapse(open) {
    this.setState({hide: !open});
  }

  componentDidUpdate(props, state) {
    if (this.props.onToggle && this.state.hide !== state.hide) {
      this.props.onToggle(this.state.hide);
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

    return <div {...props} >{this.props.children}</div>;
  }
}
