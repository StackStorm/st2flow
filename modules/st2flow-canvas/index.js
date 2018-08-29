import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import Task from './task';
import Transition from './transition';

import style from './style.css';

export default class Canvas extends Component {
  static propTypes = {
    model: PropTypes.object.isRequired,
  }

  componentDidMount() {
    this.props.model.on(() => this.forceUpdate());

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseWheel = this.handleMouseWheel.bind(this);

    const el = this.canvasRef.current;
    el.addEventListener('wheel', this.handleMouseWheel);
    el.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  componentWillUnmount() {
    const el = this.canvasRef.current;
    el.removeEventListener('wheel', this.handleMouseWheel);
    el.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  handleMouseWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    this.scale += e.wheelDelta / 1200;
    this.surfaceRef.current.style.transform = `scale(${Math.E ** this.scale})`;

    return false;
  }

  handleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    this.drag = true;

    const el = this.canvasRef.current;
    this.startx = e.clientX + el.scrollLeft;
    this.starty = e.clientY + el.scrollTop;

    return false;
  }

  handleMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    this.drag = false;

    return false;
  }

  handleMouseMove(e) {
    if (!this.drag) {
      return true;
    }

    e.preventDefault();
    e.stopPropagation();

    const el = this.canvasRef.current;
    el.scrollLeft += (this.startx - (e.clientX + el.scrollLeft));
    el.scrollTop += (this.starty - (e.clientY + el.scrollTop));

    return false;
  }

  handleTaskMove(ref, coords) {
    this.props.model.updateTask(ref, { coords });
  }

  style = style
  canvasRef = React.createRef();
  surfaceRef = React.createRef();

  scale = 0;

  render() {
    const { model } = this.props;

    return (
      <div className={this.style.component} ref={this.canvasRef}>
        <div className={this.style.surface} ref={this.surfaceRef}>
          {
            model.tasks.map((task) => {
              return (
                <Task
                  key={task.name}
                  task={task}
                  handleMove={(...a) => this.handleTaskMove(task.name, ...a)}
                />
              );
            })
          }
          <svg className={this.style.svg} xmlns="http://www.w3.org/2000/svg">
            {
              model.transitions
                .map((transition) => {
                  return (
                    <Transition
                      key={`${transition.from.name}-${transition.to.name}`}
                      from={transition.from}
                      to={transition.to}
                    />
                  );
                })
            }
          </svg>
        </div>
      </div>
    );
  }
}
