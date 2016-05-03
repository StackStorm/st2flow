import React from 'react';

import bem from '../util/bem';

const st2Class = bem('viewer')
    , st2Icon = bem('icon')
    ;

export default class Action extends React.Component {
  static propTypes = {
    type: React.PropTypes.string,
    onClick: React.PropTypes.func
  }

  handleClick(e) {
    e.stopPropagation();

    if (this.props.onClick) {
      return this.props.onClick(e);
    }
  }

  render() {
    const props = {
      className: st2Class('node-edit') + ' ' + st2Icon(this.props.type),
      onClick: (e) => this.handleClick(e)
    };

    return <div {...props} ></div>;
  }
}
