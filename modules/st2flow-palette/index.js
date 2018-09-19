import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import style from './style.css';

export default class Palette extends Component {
  static propTypes = {
    className: PropTypes.string,
    model: PropTypes.object,
  }

  addTask = () => {
    this.props.model.addTask({
      name: `doSomething ${Math.random()}`,
      action: 'some.action',
      anobject: { foo: 'bar' },
      next: [ 'taboot', 'taboot' ],
      coord: { x: Math.round(Math.random() * 800), y: Math.round(Math.random() * 800) },
    });
  }

  render() {
    return (
      <div className={`${this.props.className} ${style.component}`}>
        <button onClick={this.addTask}>Add Task</button>
      </div>
    );
  }
}
