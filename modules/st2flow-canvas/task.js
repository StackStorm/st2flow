import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import style from './style.css';

export default class Task extends Component {
  static propTypes = {
    task: PropTypes.object.isRequired,
    scale: PropTypes.number.isRequired,
    selected: PropTypes.bool,
    onMove: PropTypes.func,
    onClick: PropTypes.func,
  }

  state = {
    delta: {
      x: 0,
      y: 0,
    },
  }

  componentDidMount() {
    const task = this.taskRef.current;
    const handle = this.handleRef.current;

    task.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);

    handle.addEventListener('dragstart', this.handleDragStartHandle);
    task.addEventListener('dragover', this.handleDragOver);
    task.addEventListener('drop', this.handleDrop);
  }

  componentWillUnmount() {
    const task = this.taskRef.current;
    const handle = this.handleRef.current;

    task.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    handle.removeEventListener('dragstart', this.handleDragStartHandle);
    task.removeEventListener('dragover', this.handleDragOver);
    task.removeEventListener('drop', this.handleDrop);
  }

  handleMouseDown = (e) => {
    // Drag should only work on left button press
    if (e.button !== 0) {
      return true;
    }

    e.preventDefault();
    e.stopPropagation();

    this.drag = true;

    this.start = {
      x: e.clientX,
      y: e.clientY,
    };

    return false;
  }

  handleMouseUp = (e) => {
    if (!this.drag) {
      return true;
    }

    e.preventDefault();
    e.stopPropagation();

    this.drag = false;

    const scale = Math.E ** this.props.scale;

    if (this.props.onMove) {
      const { coords } = this.props.task;
      const { x, y } = this.state.delta;
      if ( x === 0 && y === 0) {
        return false;
      }
      this.props.onMove({
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

    return false;
  }

  handleMouseMove = (e) => {
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

  handleClick = (e) => {
    e.stopPropagation();

    if (this.props.onClick) {
      this.props.onClick();
    }
  }

  handleDragStartHandle = (e, handle) => {
    e.stopPropagation();

    this.style.opacity = '0.4';

    const { task } = this.props;

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify({
      task,
      handle,
    }));
  }

  handleDragOver = (e) => {
    if (e.preventDefault) {
      e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';
  }

  handleDrop = (e) => {
    if (e.preventDefault) {
      e.preventDefault();
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    const { task, handle } = JSON.parse(e.dataTransfer.getData('application/json'));

    console.log(task, handle);

    return false;
  }

  style = style
  taskRef = React.createRef();
  handleRef = React.createRef();

  render() {
    const { task, selected } = this.props;
    const { delta } = this.state;

    const scale = Math.E ** this.props.scale;

    return (
      <div
        className={cx(this.style.task, selected && this.style.selected)}
        style={{
          transform: `translate(${task.coords.x + delta.x / scale}px, ${task.coords.y + delta.y / scale}px)`,
        }}
        onClick={e => this.handleClick(e)}
      >
        <div
          className={cx(this.style.taskBody)}
          style={{
            width: task.size.x,
            height: task.size.y,
          }}
          ref={this.taskRef}
        >
          <div className={cx(this.style.taskName)}>{task.name}</div>
          <div className={cx(this.style.taskAction)}>{task.action}</div>
        </div>
        <div className={cx(this.style.taskButton, this.style.edit, 'icon-edit')} />
        <div className={cx(this.style.taskButton, this.style.delete, 'icon-delete')} />
        <div className={this.style.taskHandle} style={{ top: '50%', left: 0 }} draggable ref={this.handleRef} />
        <div className={this.style.taskHandle} style={{ top: 0, left: '50%' }}  draggable ref={this.handleRef} />
        <div className={this.style.taskHandle} style={{ top: '50%', left: '100%' }}  draggable ref={this.handleRef} />
        <div className={this.style.taskHandle} style={{ top: '100%', left: '50%' }}  draggable ref={this.handleRef} />
      </div>
    );
  }
}
