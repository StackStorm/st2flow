//@flow

import type { CanvasPoint, TaskInterface } from '@stackstorm/st2flow-model/interfaces';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import Vector from './vector';
import { origin } from './const';

import style from './style.css';

export default class Task extends Component<{
  task: TaskInterface,
  scale: number,
  selected: bool,
  onMove: Function,
  onClick: Function,
  onDelete: Function,
}, {
  delta: CanvasPoint
}> {
  static propTypes = {
    task: PropTypes.object.isRequired,
    scale: PropTypes.number.isRequired,
    selected: PropTypes.bool,
    onMove: PropTypes.func,
    onClick: PropTypes.func,
    onDelete: PropTypes.func,
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

    if (!task || !handle) {
      return;
    }

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

    if (!task || !handle) {
      return;
    }

    task.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);

    handle.removeEventListener('dragstart', this.handleDragStartHandle);
    task.removeEventListener('dragover', this.handleDragOver);
    task.removeEventListener('drop', this.handleDrop);
  }

  drag: bool
  start: CanvasPoint

  handleMouseDown = (e: MouseEvent) => {
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

  handleMouseUp = (e: MouseEvent) => {
    if (!this.drag) {
      return true;
    }

    e.preventDefault();
    e.stopPropagation();

    this.drag = false;

    const scale = Math.E ** this.props.scale;

    if (this.props.onMove) {
      const { coords } = this.props.task;
      const { x: dx, y: dy } = this.state.delta;
      if ( dx === 0 && dy === 0) {
        return false;
      }
      const x = coords.x + dx / scale;
      const y = coords.y + dy / scale;
      this.props.onMove(Vector.max(new Vector(x, y), new Vector(0, 0)));
    }
    
    this.setState({
      delta: {
        x: 0,
        y: 0,
      },
    });

    return false;
  }

  handleMouseMove = (e: MouseEvent) => {
    if (!this.drag) {
      return true;
    }

    e.preventDefault();
    e.stopPropagation();

    const x = e.clientX - this.start.x;
    const y = e.clientY - this.start.y;

    this.setState({
      delta: { x, y },
    });

    return false;
  }

  handleClick = (e: MouseEvent) => {
    e.stopPropagation();

    if (this.props.onClick) {
      this.props.onClick();
    }
  }

  handleDragStartHandle = (e: DragEvent, handle: string) => {
    e.stopPropagation();

    this.style.opacity = '0.4';

    const { task } = this.props;

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/json', JSON.stringify({
        task,
        handle,
      }));
    }
  }

  handleDragOver = (e: DragEvent) => {
    if (e.preventDefault) {
      e.preventDefault();
    }

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }

  handleDrop = (e: DragEvent) => {
    if (e.preventDefault) {
      e.preventDefault();
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (e.dataTransfer) {
      const { task, handle } = JSON.parse(e.dataTransfer.getData('application/json'));

      console.log(task, handle);
    }

    return false;
  }

  style = style
  taskRef = React.createRef();
  handleRef = React.createRef();

  render() {
    const { task, selected, onDelete } = this.props;
    const { delta } = this.state;

    const scale = Math.E ** this.props.scale;

    const coords = new Vector(delta).divide(scale).add(new Vector(task.coords)).add(origin);

    return (
      <div
        className={cx(this.style.task, selected && this.style.selected)}
        style={{
          transform: `translate(${coords.x}px, ${coords.y}px)`,
        }}
        onClick={e => this.handleClick(e)}
      >
        <div
          className={cx(this.style.taskBody)}
          style={{
            width: task.size && task.size.x,
            height: task.size && task.size.y,
          }}
          ref={this.taskRef}
        >
          <div className={cx(this.style.taskName)}>{task.name}</div>
          <div className={cx(this.style.taskAction)}>{task.action}</div>
        </div>
        <div className={cx(this.style.taskButton, this.style.delete, 'icon-delete')} onClick={() => onDelete()} />
        <div className={this.style.taskHandle} style={{ top: '50%', left: 0 }} draggable ref={this.handleRef} />
        <div className={this.style.taskHandle} style={{ top: 0, left: '50%' }}  draggable ref={this.handleRef} />
        <div className={this.style.taskHandle} style={{ top: '50%', left: '100%' }}  draggable ref={this.handleRef} />
        <div className={this.style.taskHandle} style={{ top: '100%', left: '50%' }}  draggable ref={this.handleRef} />
      </div>
    );
  }
}
