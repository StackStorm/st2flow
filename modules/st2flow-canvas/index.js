//@flow

import type {
  CanvasPoint,
  TaskRefInterface,
  TaskInterface,
  TransitionInterface,
} from '@stackstorm/st2flow-model/interfaces';
import type { NotificationInterface } from '@stackstorm/st2flow-notifications';
import type { Node } from 'react';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PropTypes } from 'prop-types';
import cx from 'classnames';
import fp from 'lodash/fp';
import { uniqueId } from 'lodash';

import Notifications from '@stackstorm/st2flow-notifications';
import {HotKeys} from 'react-hotkeys';

import Task from './task';
import TransitionGroup from './transition';
import Vector from './vector';
import CollapseButton from './collapse-button';

import { origin } from './const';

import style from './style.css';

type DOMMatrix = {
  m11: number,
  m22: number
};

type Wheel = WheelEvent & {
  wheelDelta: number
}

@connect(
  ({ flow: { tasks, transitions, errors, nextTask, panels, navigation }}) => ({ tasks, transitions, errors, nextTask, isCollapsed: panels, navigation }),
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

      tasks: Array<TaskInterface>,
      transitions: Array<Object>,
      errors: Array<Error>,
      issueModelCommand: Function,
      nextTask: string,

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
    nextTask: PropTypes.string,

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

  handleMouseWheel = (e: Wheel): ?false => {
    // considerations on scale factor (BM, 2019-02-07)
    // on Chrome Mac and Safari Mac:
    // For Mac trackpads with continuous scroll, wheelDelta is reported in multiples of 3,
    //   but for a fast scoll, the delta value may be >1000.
    //   deltaY is always wheelDelta / -3.
    // For traditional mouse wheels with clicky scroll, wheelDelta is reported in multiples of 120.
    //   deltaY is non-integer and does not neatly gazinta wheelDelta.
    //
    // Firefox Mac:  wheelDelta is undefined. deltaY increments by 1 for trackpad or mouse wheel.
    //
    // On Windows w/Edge, I see a ratio of -20:7 between wheelDelta and deltaY. I'm using a VM, but the Mac
    //   trackpad and the mouse report the same ratio. (increments of 120:-42)
    // On Windows w/Chrome, the ratio is -6:5. The numbers don't seem to go above 360 for wheelDelta on a mousewheel
    //    or 600 for the trackpad
    //
    // Firefox Linux: wheelDelta is undefined, wheelY is always 3 or -3
    // Chromium Linus: wheelY is always in multiples of 53.  Fifty-three!  (wheelDelta is in multiples of 120)
    //   There's very little variation.  I can sometimes get the trackpad to do -212:480, but not a real mouse wheel
    const SCALE_FACTOR_MAC_TRACKPAD = .05;
    const SCROLL_FACTOR_MAC_TRACKPAD = 15;
    const SCALE_FACTOR_DEFAULT = .1;
    const SCROLL_FACTOR_DEFAULT = 30;

    const getModifierState = (e.getModifierState || function(mod) {
      mod = mod === 'Control' ? 'ctrl' : mod;
      return this[`${mod.toLowerCase()}Key`];
    }).bind(e);

    if(getModifierState('Control')) {
      e.preventDefault();
      const canvasEl = this.canvasRef.current;
      if(canvasEl instanceof HTMLElement) {
        const scrollFactor = e.wheelDelta && Math.abs(e.wheelDelta) < 120
          ? SCROLL_FACTOR_MAC_TRACKPAD
          : Math.abs(e.wheelDelta) < 3 ? SCROLL_FACTOR_DEFAULT / 2 : SCROLL_FACTOR_DEFAULT;
        canvasEl.scrollLeft += (e.deltaY < 0) ? -scrollFactor : scrollFactor;
      }

      return undefined;
    }

    if(getModifierState('Alt')) {
      e.preventDefault();
      e.stopPropagation();

      const { scale }: { scale: number } = this.state;
      const delta = Math.max(-1, Math.min(1, e.wheelDelta || -e.deltaY));

      // Zoom around the mouse pointer, by finding it's position normalized to the
      //  canvas and surface elements' coordinates, and moving the scroll on the
      //  canvas element to match the same proportions as before the scale.
      const canvasEl = this.canvasRef.current;
      const surfaceEl = this.surfaceRef.current;
      if(canvasEl instanceof HTMLElement && surfaceEl instanceof HTMLElement) {
        let canvasParentEl = canvasEl;
        let canvasOffsetLeft = 0;
        let canvasOffsetTop = 0;
        do {
          if(getComputedStyle(canvasParentEl).position !== 'static') {
            canvasOffsetLeft += canvasParentEl.offsetLeft || 0;
            canvasOffsetTop += canvasParentEl.offsetTop || 0;
          }
          canvasParentEl = canvasParentEl.parentNode;
        } while (canvasParentEl && canvasParentEl !== document);
        const surfaceScaleBefore: DOMMatrix = new window.DOMMatrix(getComputedStyle(surfaceEl).transform);
        const mousePosCanvasX = (e.clientX - canvasOffsetLeft) / canvasEl.clientWidth;
        const mousePosCanvasY = (e.clientY - canvasOffsetTop) / canvasEl.clientHeight;
        const mousePosSurfaceX = (e.clientX - canvasOffsetLeft + canvasEl.scrollLeft) /
                                  (surfaceEl.clientWidth * surfaceScaleBefore.m11);
        const mousePosSurfaceY = (e.clientY - canvasOffsetTop + canvasEl.scrollTop) /
                                  (surfaceEl.clientHeight * surfaceScaleBefore.m22);
        this.setState({
          scale: scale + delta * (e.wheelDelta && Math.abs(e.wheelDelta) < 120 ? SCALE_FACTOR_MAC_TRACKPAD: SCALE_FACTOR_DEFAULT),
        });

        const surfaceScaleAfter: DOMMatrix = new window.DOMMatrix(getComputedStyle(surfaceEl).transform);
        canvasEl.scrollLeft = surfaceEl.clientWidth * surfaceScaleAfter.m11 * mousePosSurfaceX -
                                canvasEl.clientWidth * mousePosCanvasX;
        canvasEl.scrollTop = surfaceEl.clientHeight * surfaceScaleAfter.m22 * mousePosSurfaceY -
                                canvasEl.clientHeight * mousePosCanvasY;
      }

      this.handleUpdate();

      return false;
    }
    else {
      return undefined;
    }
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
      name: this.props.nextTask,
      action: action.ref,
      coords: Vector.max(coords, new Vector(0, 0)),
    });

    return false;
  }

  handleTaskMove = (task: TaskRefInterface, coords: CanvasPoint) => {
    this.props.issueModelCommand('updateTask', task, { coords });
  }

  handleTaskSelect = (task: TaskRefInterface) => {
    this.props.navigate({ task: task.name, toTasks: undefined, type: 'execution', section: 'input' });
  }

  handleTransitionSelect = (e: MouseEvent, transition: TransitionInterface) => {
    e.stopPropagation();
    this.props.navigate({ task: transition.from.name, toTasks: transition.to.map(t => t.name), type: 'execution', section: 'transitions' });
  }

  handleCanvasClick = (e: MouseEvent) => {
    e.stopPropagation();
    this.props.navigate({ task: undefined, toTasks: undefined, section: undefined, type: 'metadata' });
  }

  handleTaskEdit = (task: TaskRefInterface) => {
    this.props.navigate({ toTasks: undefined, task: task.name });
  }

  handleTaskDelete = (task: TaskRefInterface) => {
    this.props.issueModelCommand('deleteTask', task);
  }

  handleTaskConnect = (to: TaskRefInterface, from: TaskRefInterface) => {
    this.props.issueModelCommand('addTransition', { from, to: [ to ] });
  }

  handleTransitionDelete = (transition: TransitionInterface) => {
    this.props.issueModelCommand('deleteTransition', transition);
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

    const transitionGroups = transitions
      .map(transition => {
        const from = {
          task: tasks.find(({ name }) => name === transition.from.name),
          anchor: 'bottom',
        };

        const group = transition.to.map(tto => {
          const to = {
            task: tasks.find(({ name }) => name === tto.name) || {},
            anchor: 'top',
          };

          return {
            from,
            to,
          };
        });

        return {
          id: uniqueId(`${transition.from.name}-`),
          transition,
          group,
          color: transition.color,
        };
      });

    const selectedTask = tasks.filter(task => task.name === navigation.task)[0];

    const selectedTransitionGroups = transitionGroups
      .filter(({ transition }) => {
        const { task, toTasks = [] } = navigation;
        return transition.from.name === task && fp.isEqual(toTasks, transition.to.map(t => t.name));
      });

    // Currently this component is registering global key handlers (attach = document.body)
    //   At some point it may be desirable to pull the global keyMap up to main.js (handlers
    //   can stay here), but for now since all key commands affect the canvas, this is fine.
    return (
      <HotKeys
        style={{height: '100%'}}
        focused={true}
        attach={document.body}
        handlers={{handleTaskDelete: e => {
          // This will break if canvas elements (tasks/transitions) become focus targets with
          //  tabindex or automatically focusing elements.  But in that case, the Task already
          //  has a handler for delete waiting.
          if(e.target === document.body) {
            e.preventDefault();
            if(selectedTask) {
              this.handleTaskDelete(selectedTask);
            }
          }
        }}}
      >
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
                      selected={task.name === navigation.task && !selectedTransitionGroups.length}
                      scale={scale}
                      onMove={(...a) => this.handleTaskMove(task, ...a)}
                      onConnect={(...a) => this.handleTaskConnect(task, ...a)}
                      onClick={() => this.handleTaskSelect(task)}
                      onDelete={() => this.handleTaskDelete(task)}
                    />
                  );
                })
              }
              {
                transitionGroups
                  .filter(({ transition }) => {
                    const { task, toTasks = [] } = navigation;
                    return transition.from.name === task && fp.isEqual(toTasks, transition.to.map(t => t.name));
                  })
                  .map(({ transition }) => {
                    const toPoint = transition.to
                      .map(task => tasks.find(({ name }) => name === task.name))
                      .map(task => new Vector(task.size).multiply(new Vector(.5, 0)).add(new Vector(0, -10)).add(new Vector(task.coords)))
                      ;

                    const fromPoint = [ transition.from ]
                      .map((task: TaskRefInterface): any => tasks.find(({ name }) => name === task.name))
                      .map((task: TaskInterface) => new Vector(task.size).multiply(new Vector(.5, 1)).add(new Vector(task.coords)))
                      ;

                    const point = fromPoint.concat(toPoint)
                      .reduce((acc, point) => (acc || point).add(point).divide(2))
                      ;

                    const { x, y } = point.add(origin);
                    return (
                      <div
                        key={`${transition.from.name}-${window.btoa(transition.condition)}-selected`}
                        className={cx(this.style.transitionButton, this.style.delete, 'icon-delete')}
                        style={{ transform: `translate(${x}px, ${y}px)`}}
                        onClick={() => this.handleTransitionDelete(transition)}
                      />
                    );
                  })
              }
              <svg className={this.style.svg} xmlns="http://www.w3.org/2000/svg">
                {
                  transitionGroups
                    .map(({ id, transition, group, color }, i) => (
                      <TransitionGroup
                        key={`${id}-${window.btoa(transition.condition)}`}
                        color={color}
                        transitions={group}
                        selected={false}
                        onClick={(e) => this.handleTransitionSelect(e, transition)}
                      />
                    ))
                }
                {
                  selectedTransitionGroups
                    .map(({ id, transition, group, color }, i) => (
                      <TransitionGroup
                        key={`${id}-${window.btoa(transition.condition)}-selected`}
                        color={color}
                        transitions={group}
                        selected={true}
                        onClick={(e) => this.handleTransitionSelect(e, transition)}
                      />
                    ))
                }
              </svg>
            </div>
          </div>
          <Notifications position="bottom" notifications={this.notifications} />
        </div>
      </HotKeys>
    );
  }
}
