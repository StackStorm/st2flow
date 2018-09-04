import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import style from './style.css';

export default class Task extends Component {
  static propTypes = {
    task: PropTypes.object.isRequired,
    scale: PropTypes.number.isRequired,
    handleMove: PropTypes.func,
  }

  state = {
    delta: {
      x: 0,
      y: 0,
    },
  }

  componentDidMount() {
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);

    const el = this.taskRef.current;
    el.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  componentWillUnmount() {
    const el = this.taskRef.current;
    el.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    this.drag = true;

    this.start = {
      x: e.clientX,
      y: e.clientY,
    };

    return false;
  }

  handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this.drag) {
      this.drag = false;

      const scale = Math.E ** this.props.scale;

      if (this.props.handleMove) {
        const { coords } = this.props.task;
        const { x, y } = this.state.delta;
        this.props.handleMove({
          x: coords.x + x / scale,
          y: coords.y + y / scale,
        });
      }
      
      this.setState({
        delta: {
          x: 0,
          y: 0,
        },
      });
    }

    return false;
  }

  handleMouseMove(e) {
    if (!this.drag) {
      return true;
    }

    e.preventDefault();
    e.stopPropagation();

    this.setState({
      delta: {
        x: e.clientX - this.start.x,
        y: e.clientY - this.start.y,
      },
    });

    return false;
  }

  style = style
  taskRef = React.createRef();

  render() {
    const { task } = this.props;
    const { delta } = this.state;

    const scale = Math.E ** this.props.scale;

    const additionalStyles = {
      width: task.size.x,
      height: task.size.y,
      transform: `translate(${task.coords.x + delta.x / scale}px, ${task.coords.y + delta.y / scale}px)`,
    };

    return (
      <div
        className={this.style.task}
        style={additionalStyles}
        ref={this.taskRef}
      >
        {task.name}
      </div>
    );
  }
}
