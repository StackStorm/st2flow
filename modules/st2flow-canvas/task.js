import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import style from './style.css';

export default class Task extends Component {
  static propTypes = {
    task: PropTypes.object.isRequired,
  }

  render() {
    const { task } = this.props;

    const additionalStyles = {
      transform: `translate(${task.coord.x}px, ${task.coord.y}px)`,
    };

    return (
      <div
        className={style.task}
        style={additionalStyles}
      >
        {task.name}<br />
        <i>{task.action}</i>
      </div>
    );
  }
}
