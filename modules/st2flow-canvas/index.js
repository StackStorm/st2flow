//@flow

import type { ModelInterface, CanvasPoint, TaskRefInterface } from '@stackstorm/st2flow-model/interfaces';
import type { NotificationInterface } from '@stackstorm/st2flow-notifications';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import Notifications from '@stackstorm/st2flow-notifications';
import { connect, layout } from '@stackstorm/st2flow-model';

import Task from './task';
import Transition from './transition';
import Vector from './vector';
import Toolbar from './toolbar';

import style from './style.css';

@connect(({ model }) => ({ model }))
export default class Canvas extends Component<{
      className?: string,
      model: ModelInterface,
      selected: string,
      onSelect: Function,
    }, {
      scale: number,
      errors: Array<Error>,
    }> {
  static propTypes = {
    className: PropTypes.string,
    model: PropTypes.object,
    selected: PropTypes.string,
    onSelect: PropTypes.func,
  }

  state = {
    scale: 0,
    errors: [],
  }

  componentDidMount() {
    const el = this.canvasRef.current;

    if (!el) {
      return;
    }

    el.addEventListener('wheel', this.handleMouseWheel);
    el.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    el.addEventListener('dragover', this.handleDragOver);
    el.addEventListener('drop', this.handleDrop);

    const { model } = this.props;
    model.on('schema-error', this.handleModelError);

    this.handleUpdate();
  }

  componentDidUpdate() {
    this.handleUpdate();
  }

  componentWillUnmount() {
    const el = this.canvasRef.current;

    if (!el) {
      return;
    }

    el.removeEventListener('wheel', this.handleMouseWheel);
    el.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    el.removeEventListener('dragover', this.handleDragOver);
    el.removeEventListener('drop', this.handleDrop);

    const { model } = this.props;
    model.removeListener('schema-error', this.handleModelError);
  }

  size: CanvasPoint
  drag: boolean
  startx: number
  starty: number

  handleUpdate() {
    const canvasEl = this.canvasRef.current;
    const surfaceEl = this.surfaceRef.current;

    if (!canvasEl || !surfaceEl) {
      return;
    }

    const { model }: { model: ModelInterface } = this.props;
    const { width, height } = canvasEl.getBoundingClientRect();

    const scale = Math.E ** this.state.scale;

    this.size = model.tasks.reduce((acc, item) => {
      const coords = new Vector(item.coords);
      const size = new Vector(item.size);
      const { x, y } = coords.add(size).add(50);

      return {
        x: Math.max(x, acc.x),
        y: Math.max(y, acc.y),
      };
    }, {
      x: width / scale,
      y: height / scale,
    });

    surfaceEl.style.width = `${this.size.x}px`;
    surfaceEl.style.height = `${this.size.y}px`;
  }

  handleMouseWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { scale }: { scale: number } = this.state;
    this.setState({
      scale: scale + e.deltaY / 1200,
    });

    this.handleUpdate();

    return false;
  }

  handleMouseDown = (e: MouseEvent) => {
    if (e.target !== this.surfaceRef.current) {
      return true;
    }

    e.preventDefault();
    e.stopPropagation();

    this.drag = true;

    const el = this.canvasRef.current;

    if (!el) {
      return true;
    }

    this.startx = e.clientX + el.scrollLeft;
    this.starty = e.clientY + el.scrollTop;

    return false;
  }

  handleMouseUp = (e: MouseEvent) => {
    if (!this.drag) {
      return true;
    }

    e.preventDefault();
    e.stopPropagation();

    this.drag = false;

    return false;
  }

  handleMouseMove = (e: MouseEvent) => {
    if (!this.drag) {
      return true;
    }

    e.preventDefault();
    e.stopPropagation();

    const el = this.canvasRef.current;

    if (!el) {
      return true;
    }

    el.scrollLeft += (this.startx - (e.clientX + el.scrollLeft));
    el.scrollTop += (this.starty - (e.clientY + el.scrollTop));

    return false;
  }

  handleDragOver = (e: DragEvent) => {
    if (e.target !== this.surfaceRef.current) {
      return true;
    }

    if (e.preventDefault) {
      e.preventDefault();
    }

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }

    return false;
  }

  handleDrop = (e: DragEvent) => {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    if (!e.dataTransfer) {
      return true;
    }

    const { action, handle } = JSON.parse(e.dataTransfer.getData('application/json'));

    const coords = new Vector(e.offsetX, e.offsetY).subtract(new Vector(handle));

    this.props.model.addTask({
      name: `task${this.props.model.lastTaskIndex + 1}`,
      action: action.ref,
      coords,
    });

    return false;
  }

  handleTaskMove = (task: TaskRefInterface, coords: CanvasPoint) => {
    this.props.model.updateTask(task, { coords });
  }

  handleTaskSelect = (task: TaskRefInterface) => {
    this.props.onSelect(task.name);
  }

  handleCanvasClick = (e: MouseEvent) => {
    e.stopPropagation();

    this.props.onSelect();
  }

  handleModelError = (e: Error) => {
    // error may or may not be an array
    this.setState({ errors: e && [].concat(e) || [] });
  }

  handleNotificationRemove = (notification: NotificationInterface) => {
    switch(notification.type) {
      case 'error':
        this.setState({
          errors: this.state.errors.filter(err => err.message !== notification.message),
        });
        break;
    }
  }

  handleTaskEdit = (task: TaskRefInterface) => {
    this.props.onSelect(task.name);
  }

  handleTaskDelete = (task: TaskRefInterface) => {
    this.props.model.deleteTask(task);
  }

  get notifications() : Array<NotificationInterface> {
    return this.state.errors.map(err => ({
      type: 'error',
      message: err.message,
    }));
  }

  style = style
  canvasRef = React.createRef();
  surfaceRef = React.createRef();

  render() {
    const { model, selected } = this.props;
    const { scale } = this.state;

    const surfaceStyle = {
      transform: `scale(${Math.E ** scale})`,
    };

    return (
      <div
        className={cx(this.props.className, this.style.component)}
        onClick={e => this.handleCanvasClick(e)}
      >
        <Toolbar>
          <div key="undo" icon="icon-redirect" onClick={() => console.log('undo')} />
          <div key="redo" icon="icon-redirect2" onClick={() => console.log('redo')} />
          <div key="rearrange" icon="icon-arrange" onClick={() => layout(model)} />
          <div key="save" icon="icon-save" onClick={() => console.log('save')} />
          <div key="run" icon="icon-play" onClick={() => console.log('run')} />
        </Toolbar>
        <div className={this.style.canvas} ref={this.canvasRef}>
          <div className={this.style.surface} style={surfaceStyle} ref={this.surfaceRef}>
            {
              model.tasks.map((task) => {
                return (
                  <Task
                    key={task.name}
                    task={task}
                    selected={task.name === selected}
                    scale={scale}
                    onMove={(...a) => this.handleTaskMove(task, ...a)}
                    onClick={() => this.handleTaskSelect(task)}
                    onEdit={() => this.handleTaskEdit(task)}
                    onDelete={() => this.handleTaskDelete(task)}
                  />
                );
              })
            }
            <svg className={this.style.svg} xmlns="http://www.w3.org/2000/svg">
              {
                model.transitions
                  .map((transition) => {
                    const from = {
                      task: model.tasks.find(({ name }) => name === transition.from.name),
                      anchor: 'bottom',
                    };
                    const to = {
                      task: model.tasks.find(({ name }) => name === transition.to.name),
                      anchor: 'top',
                    };
                    return (
                      <Transition
                        key={`${transition.from.name}-${transition.to.name}-${window.btoa(transition.condition)}`}
                        from={from}
                        to={to}
                      />
                    );
                  })
              }
            </svg>
          </div>
        </div>
        <Notifications position="top" notifications={this.notifications} onRemove={this.handleNotificationRemove} />
      </div>
    );
  }
}
