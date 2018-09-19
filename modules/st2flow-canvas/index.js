import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import Task from './task';

import style from './style.css';

export default class Canvas extends Component {
  static propTypes = {
    className: PropTypes.string,
    model: PropTypes.object.isRequired,
  }

  componentDidMount() {
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseWheel = this.handleMouseWheel.bind(this);

    const el = this.canvasRef.current;
    el.addEventListener('wheel', this.handleMouseWheel);
    el.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);

    const { model } = this.props;
    model.on('change', this.handleModelChange);
  }

  componentWillUnmount() {
    const el = this.canvasRef.current;
    const { model } = this.props;
    el.removeEventListener('wheel', this.handleMouseWheel);
    el.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    model.removeListener('change', this.handleModelChange);
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

  handleModelChange = (deltas, yaml) => {
    this.forceUpdate();
  }

  canvasRef = React.createRef();
  surfaceRef = React.createRef();

  scale = 0;

  render() {
    const { model } = this.props;

    return (
      <div className={`${this.props.className} ${style.component}`} ref={this.canvasRef}>
        <div className={style.surface} ref={this.surfaceRef}>
          {
            model.tasks.map((task) => {
              return <Task key={task.name} task={task} />;
            })
          }
        </div>
      </div>
    );
  }
}
