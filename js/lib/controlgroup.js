'use strict';

const bem = require('./bem')
    , React = require('react')
    ;

const st2Class = bem('controls')
    ;

class ControlGroup extends React.Component {
  render() {
    return <div className={st2Class(this.props.position)}>{this.props.children}</div>;
  }
}

ControlGroup.propTypes = {
  position: React.PropTypes.string.isRequired
};

module.exports = ControlGroup;
