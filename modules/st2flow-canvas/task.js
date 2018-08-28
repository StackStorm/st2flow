import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import style from './style.css';

export default class Task extends Component {
  static propTypes = {
    task: PropTypes.object.isRequired,
  }

  style = style

  render() {
    const { task } = this.props;

    const additionalStyles = {
      transform: `translate(${task.coord.x}px, ${task.coord.y}px)`,
    };

    return (
      <div
        className={this.style.task}
        style={additionalStyles}
      >
        {task.name}
      </div>
    );
  }
}
