//@flow

import type {
  CanvasPoint,
  TaskRefInterface,
  TransitionInterface,
} from '@stackstorm/st2flow-model/interfaces';
import type { NotificationInterface } from '@stackstorm/st2flow-notifications';
import type { Node } from 'react';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import Notifications from '@stackstorm/st2flow-notifications';

import Task from './task';
import Transition from './transition';
import Vector from './vector';
import CollapseButton from './collapse-button';

import { origin } from './const';

import style from './style.css';

type Wheel = WheelEvent & {
  wheelDelta: number
}

@connect(
  ({ flow: { tasks, transitions, errors, lastTaskIndex, panels, navigation }}) => ({ tasks, transitions, errors, lastTaskIndex, isCollapsed: panels, navigation }),
  (dispatch) => ({
    issueModelCommand: (command, ...args) => {
      dispatch({
        type: 'MODEL_ISSUE_COMMAND',
        command,
        args,
      });
    },
    toggleCollapse: name => dispatch({
      type: 'PANEL_TOGGLE_COLLAPSE',
      name,
    }),
    navigate: (navigation) => dispatch({
      type: 'CHANGE_NAVIGATION',
      navigation,
    }),
  })
)
export default class Canvas extends Component<{
      children: Node,
      className?: string,
      
      navigation: Object,
      navigate: Function,

      tasks: Array<Object>,
      transitions: Array<Object>,
      errors: Array<Error>,
      issueModelCommand: Function,
      lastTaskIndex: number,

      isCollapsed: Object,
      toggleCollapse: Function,
    }, {
      scale: number,
    }> {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,

    navigation: PropTypes.object,
    navigate: PropTypes.func,

    tasks: PropTypes.array,
    transitions: PropTypes.array,
    errors: PropTypes.array,
    issueModelCommand: PropTypes.func,
    lastTaskIndex: PropTypes.number,

    isCollapsed: PropTypes.object,
    toggleCollapse: PropTypes.func,
  }

  state = {
    scale: 0,
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
    window.addEventListener('resize', this.handleUpdate);
    el.addEventListener('dragover', this.handleDragOver);
    el.addEventListener('drop', this.handleDrop);

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
    window.removeEventListener('resize', this.handleUpdate);
    el.removeEventListener('dragover', this.handleDragOver);
    el.removeEventListener('drop', this.handleDrop);
  }

  size: CanvasPoint
  drag: boolean
  startx: number
  starty: number

  handleUpdate = () => {
    const canvasEl = this.canvasRef.current;
    const surfaceEl = this.surfaceRef.current;

    if (!canvasEl || !surfaceEl) {
      return;
    }

    const { tasks } = this.props;
    const { width, height } = canvasEl.getBoundingClientRect();

    const scale = Math.E ** this.state.scale;

    this.size = tasks.reduce((acc, item) => {
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

    surfaceEl.style.width = `${(this.size.x).toFixed()}px`;
    surfaceEl.style.height = `${(this.size.y).toFixed()}px`;
  }

  handleMouseWheel = (e: Wheel) => {
    e.preventDefault();
    e.stopPropagation();

    const { scale }: { scale: number } = this.state;
    const delta = Math.max(-1, Math.min(1, e.wheelDelta || -e.deltaY));

    this.setState({
      scale: scale + delta * .1,
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

    const coords = new Vector(e.offsetX, e.offsetY).subtract(new Vector(handle)).subtract(new Vector(origin));

    this.props.issueModelCommand('addTask', {
      name: `task${this.props.lastTaskIndex + 1}`,
      action: action.ref,
      coords: Vector.max(coords, new Vector(0, 0)),
    });

    return false;
  }

  handleTaskMove = (task: TaskRefInterface, coords: CanvasPoint) => {
    this.props.issueModelCommand('updateTask', task, { coords });
  }

  handleTaskSelect = (task: TaskRefInterface) => {
    this.props.navigate({ task: task.name, toTask: undefined, type: 'execution', section: 'input' });
  }

  handleTransitionSelect = (e: MouseEvent, transition: TransitionInterface, toTask: TaskRefInterface) => {
    e.stopPropagation();
    this.props.navigate({ task: transition.from.name, toTask: transition.to.name, type: 'execution', section: 'transitions' });
  }

  handleCanvasClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.props.navigate({ task: undefined, toTask: undefined, section: undefined, type: 'metadata' });
  }

  handleTaskEdit = (task: TaskRefInterface) => {
    this.props.navigate({ toTask: undefined, task: task.name });
  }

  handleTaskDelete = (task: TaskRefInterface) => {
    this.props.issueModelCommand('deleteTask', task);
  }

  get notifications() : Array<NotificationInterface> {
    return this.props.errors.map(err => ({
      type: 'error',
      message: err.message,
    }));
  }

  style = style
  canvasRef = React.createRef();
  surfaceRef = React.createRef();

  render() {
    const { children, navigation, tasks=[], transitions=[], isCollapsed, toggleCollapse } = this.props;
    const { scale } = this.state;

    const surfaceStyle = {
      transform: `scale(${Math.E ** scale})`,
    };

    return (
      <div
        className={cx(this.props.className, this.style.component)}
        onClick={e => this.handleCanvasClick(e)}
      >
        { children }
        <CollapseButton position="left" state={isCollapsed.palette} onClick={() => toggleCollapse('palette')} />
        <CollapseButton position="right" state={isCollapsed.details} onClick={() => toggleCollapse('details')} />
        <div className={this.style.canvas} ref={this.canvasRef}>
          <div className={this.style.surface} style={surfaceStyle} ref={this.surfaceRef}>
            {
              tasks.map((task) => {
                return (
                  <Task
                    key={task.name}
                    task={task}
                    selected={task.name === navigation.task}
                    scale={scale}
                    onMove={(...a) => this.handleTaskMove(task, ...a)}
                    onClick={() => this.handleTaskSelect(task)}
                    onDelete={() => this.handleTaskDelete(task)}
                  />
                );
              })
            }
            <svg className={this.style.svg} xmlns="http://www.w3.org/2000/svg">
              {
                transitions
                  .reduce((arr, transition) => {
                    const from = {
                      task: tasks.find(({ name }) => name === transition.from.name),
                      anchor: 'bottom',
                    };
                    transition.to.forEach(tto => {
                      const to = {
                        task: tasks.find(({ name }) => name === tto.name),
                        anchor: 'top',
                      };
                      arr.push(
                        <Transition
                          key={`${transition.from.name}-${tto.name}-${window.btoa(transition.condition)}`}
                          from={from}
                          to={to}
                          selected={transition.from.name === navigation.task && tto.name === navigation.toTask}
                          onClick={(e) => this.handleTransitionSelect(e, { from: transition.from, to: tto })}
                        />
                      );
                    });
                    return arr;
                  }, [])
              }
            </svg>
          </div>
        </div>
        <Notifications position="bottom" notifications={this.notifications} />
      </div>
    );
  }
}
