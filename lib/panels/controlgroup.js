import React from 'react';

import bem from '../util/bem';

const st2Class = bem('controls')
    ;

export default class ControlGroup extends React.Component {
  static propTypes = {
    position: React.PropTypes.string.isRequired
  }

  render() {
    return <div className={st2Class(this.props.position)}>{this.props.children}</div>;
  }
}
