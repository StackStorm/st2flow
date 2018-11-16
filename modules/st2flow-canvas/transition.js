//@flow

import type { TaskInterface } from '@stackstorm/st2flow-model/interfaces';
import type { Node } from 'react';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import Vector from './vector';
import { origin } from './const';

import style from './style.css';

const ANCHORS = {
  top: new Vector(.5, 0),
  left: new Vector(0, .5),
  bottom: new Vector(.5, 1),
  right: new Vector(1, .5),
};

const HORISONTAL_MASK = new Vector(1, 0);
const VERTICAL_MASK = new Vector(0, 1);

const CONTROLS = {
  top: new Vector(0, -1),
  left: new Vector(-1, 0),
  bottom: new Vector(0, 1),
  right: new Vector(1, 0),
};

const ORBIT_DISTANCE = 20;
const APPROACH_DISTANCE = 10;

// function roundCorner (from: Vector, origin: Vector, to: Vector): {| origin: Vector, approach: Vector, departure: Vector |} {
//   return {
//     origin,
//     approach: from.subtract(origin).unit().multiply(APPROACH_DISTANCE).add(origin),
//     departure: to.subtract(origin).unit().multiply(APPROACH_DISTANCE).add(origin),
//   };
// }

interface PathElementInterface {
  direction?: Direction;
  calcNewPosition({ origin: Vector, dir: Direction }): {| point: Vector, dir: Direction |};
  toPathString({ origin: Vector, next: PathElementInterface }): string;
}

type Direction = 'up' | 'down' | 'left' | 'right';
class Line {
  px: number;
  direction: Direction;
  constructor(px: number, dir: Direction) {
    Object.defineProperties(this, {
      direction: {
        value: dir,
      },
      px: {
        value: px,
      },
    });
  }
  calcNewPosition(origin: Vector): Vector {
    const point = new Vector(origin.x, origin.y);
    switch(this.direction) {
      case 'up':
        point.y -= this.px;
        break;
      case 'down':
        point.y += this.px;
        break;
      case 'left':
        point.x -= this.px;
        break;
      case 'right':
        point.x += this.px;
        break;
    }
    return point;
  }
  toPathString(origin: Vector, next: Line): string {
    const newPoint = this.calcNewPosition(origin);

    // does the next line segment curve out?
    const adjustmentNext = next && next.direction !== this.direction ? ORBIT_DISTANCE : 0;
    // does this line go up and down?  or left and right?
    const isYDimension = this.direction === 'up' || this.direction === 'down';
    // Which direction in pixels from 0,0?
    const dimensionScale = this.direction === 'up' || this.direction === 'left' ? -1 : 1;

    let curvePath = '';

    if(adjustmentNext) {
      const adjustmentMax = Math.min(adjustmentNext, next.px / 2, this.px / 2);
      const nextIsYDimension = next.direction === 'up' || next.direction === 'down';
      const nextDimensionScale = next.direction === 'up' || next.direction === 'left' ? -1 : 1;

      if(isYDimension && !nextIsYDimension) {
        const oldPointY = newPoint.y;
        newPoint.y -= adjustmentMax * dimensionScale;
        const controlPointX = newPoint.x + adjustmentMax * nextDimensionScale;
        curvePath = ` Q ${newPoint.x} ${oldPointY}, ${controlPointX} ${oldPointY}`;
      }
      else if(nextIsYDimension) {
        const oldPointX = newPoint.x;
        const controlPointY = newPoint.y + adjustmentMax * nextDimensionScale;
        newPoint.x -= adjustmentMax * dimensionScale;
        curvePath = ` Q ${oldPointX} ${newPoint.y}, ${oldPointX} ${controlPointY}`;
      }
    }

    return `L ${newPoint.x} ${newPoint.y}${curvePath}`;
  }
  toString(): string {
    return `${this.px} ${this.direction}`;
  }
}

class Path {
  origin: Vector
  elements: Array<Line> = [];
  initialDir: Direction
  constructor(origin: Vector, dir: Direction) {
    Object.assign(this, { origin, initialDir: dir });
  }

  moveTo(newPosition: Vector) {
    const pos = this.currentPosition;
    const dir = this.currentDir;

    const yMove = newPosition.y !== pos.y;
    const xMove = newPosition.x !== pos.x;

    let xLine: Line;
    let yLine: Line;
    if(xMove) {
      if(this.elements.length && (dir === 'left' || dir === 'right')) {
        xLine = this.elements.pop();
        xLine = new Line(xLine.px += (newPosition.x - pos.x) * (dir === 'left' ? -1 : 1), xLine.direction);
      }
      else {
        xLine = new Line(
          Math.abs(newPosition.x - pos.x),
          newPosition.x > pos.x ? 'right' : 'left'
        );
      }
    }
    if(yMove) {
      if(this.elements.length && (dir === 'up' || dir === 'down')) {
        yLine = this.elements.pop();
        yLine = new Line(yLine.px + (newPosition.y - pos.y) * (dir === 'up' ? -1 : 1), yLine.direction);
      }
      else {
        yLine = new Line(
          Math.abs(newPosition.y - pos.y),
          newPosition.y > pos.y ? 'down' : 'up'
        );
      }
    }
    if(dir === 'left' || dir === 'right') {
      xLine && this.elements.push(xLine);
      yLine && this.elements.push(yLine);
    }
    else {
      yLine && this.elements.push(yLine);
      xLine && this.elements.push(xLine);
    }
  }

  get currentDir() {
    return this.elements.length > 0
      ? this.elements[this.elements.length - 1].direction
      : this.initialDir;
  }

  get currentPosition() {
    let currentPoint = this.origin;
    this.elements.forEach(el => {
      currentPoint = el.calcNewPosition(currentPoint);
    });
    return currentPoint;
  }

  toString(): string {
    let origin: Vector = this.origin;
console.log(`new path at ${origin.x}, ${origin.y}`);
    const path = this.elements.map((el, idx) => {
      const next = this.elements[idx + 1];
      const prev = this.elements[idx - 1];
console.log(el.toString());
      const str = el.toPathString(origin, next);
      origin = el.calcNewPosition(origin);

      return str;
    }).join(' ');
    return `M ${this.origin.x} ${this.origin.y} ${path}`;
  }
}

type Target = {
  task: TaskInterface,
  anchor: string
}

class SVGPath extends Component<{
  onClick: Function
}> {
  componentDidMount() {
    // React fail: onClick isn't supported for SVG elements, so
    // manually set up the click handler here.
    if(this.pathElement.current && this.pathElement.current instanceof Element) {
      this.pathElement.current.addEventListener('click', () => this.props.onClick);
    }
  }

  componentWillUnmount() {
    if(this.pathElement.current && this.pathElement.current instanceof Element) {
      this.pathElement.current.removeEventListener('click', this.props.onClick);
    }
  }

  pathElement = React.createRef()

  render() {
    return <path ref={this.pathElement} {...this.props} />;
  }
}

export default class TransitionGroup extends Component<{
  transitions: Array<{
    from: Target,
    to: Target,
  }>,
  color: string,
  selected: boolean,
  onClick: Function,
  taskRefs: {},
}> {
  static propTypes = {
    transitions: PropTypes.arrayOf(
      PropTypes.shape({
        from: PropTypes.object.isRequired,
        to: PropTypes.object.isRequired,
      })
    ),
    selected: PropTypes.bool,
    onClick: PropTypes.func,
  }

  uniqId = 'some'

  style = style

  makePath(from: Target, to: Target) {
    const { taskRefs } = this.props;
    if (!from.task || !to.task) {
      return '';
    }
    if (!taskRefs[from.task.name].current || !taskRefs[to.task.name].current) {
      return '';
    }

    const fromAnchor = ANCHORS[from.anchor];
    const fromControl = CONTROLS[from.anchor];
    const fromCoords = new Vector(from.task.coords).add(origin);
    const fromSize = new Vector(from.task.size);

    const fromPoint = fromSize.multiply(fromAnchor).add(fromCoords);
    const fromOrbit = fromControl.multiply(ORBIT_DISTANCE).add(fromPoint);
    const path = new Path(fromPoint, 'down');

    const toAnchor = ANCHORS[to.anchor];
    const toControl = CONTROLS[to.anchor];
    const toCoords = new Vector((to.task || {}).coords).add(origin);
    const toSize = new Vector((to.task || {}).size);

    const arrowCompensation = toControl.multiply(10);
    const toPoint = toSize.multiply(toAnchor).add(toCoords).add(arrowCompensation);
    const toOrbit = toControl.multiply(ORBIT_DISTANCE).add(toPoint);

    const lagrangePoint = toOrbit.subtract(fromOrbit).divide(2);
    const fromLagrange = lagrangePoint.multiply(lagrangePoint.y > 0 ? VERTICAL_MASK : HORISONTAL_MASK).add(fromOrbit);
    const toLagrange = lagrangePoint.multiply(lagrangePoint.y > 0 ? VERTICAL_MASK : HORISONTAL_MASK).multiply(-1).add(toOrbit);

    // const fromOrbitCorner = roundCorner(fromPoint, fromOrbit, fromLagrange);
    // const fromLagrangeCorner = roundCorner(fromOrbit, fromLagrange, toLagrange);
    // const toLagrangeCorner = roundCorner(fromLagrange, toLagrange, toOrbit);
    // const toOrbitCorner = roundCorner(toLagrange, toOrbit, toPoint);

    // path.push(`M ${fromPoint.x} ${fromPoint.y}`);
    path.moveTo(fromOrbit);
    path.moveTo(fromLagrange);
    path.moveTo(toLagrange);
    path.moveTo(toOrbit);
    path.moveTo(toPoint);

    return path.toString();
  }

  render(): Array<Node> {
    const { color, transitions, selected, ...props } = this.props;

    const transitionPaths = transitions
      .map(({ from, to }) => ({
        from: from.task.name,
        to: to.task.name,
        path: this.makePath(from, to),
      }));

    const markers = (
      <defs key="marker">
        {selected && [
          <marker id={`${this.uniqId}-${selected && 'selected'}-${color}-ActiveBorder`} key="activeBorderMarker" markerWidth="13" markerHeight="13" refX="1" refY="1" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,2 L3,1 z" className={this.style.transitionArrow} style={{ fill: color }} />
          </marker>,
          <marker id={`${this.uniqId}-${selected && 'selected'}-Active`} key="activeMarker" markerWidth="12" markerHeight="12" refX="1" refY="1" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,2 L3,1 z" className={this.style.transitionArrowActive} />
          </marker>,
        ]}
        <marker id={`${this.uniqId}-${color}`} markerWidth="10" markerHeight="10" refX="1" refY="1" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,2 L3,1 z" className={this.style.transitionArrow} style={{ fill: color }} />
        </marker>
      </defs>
    );

    const activeBorders = transitionPaths.map(({ from, to, path }) => (
      <SVGPath
        className={cx(this.style.transitionActiveBorder, selected && this.style.selected)}
        style={{ stroke: color }}
        key={`${from}-${to}-pathActiveBorder`}
        d={path}
        markerEnd={`url(#${this.uniqId}-${selected && 'selected' || ''}-${color}-ActiveBorder)`}
        onClick={this.props.onClick}
        {...props}
      />
    ));

    const actives = transitionPaths.map(({ from, to, path }) => (
      <SVGPath
        className={cx(this.style.transitionActive, selected && this.style.selected)}
        key={`${from}-${to}-pathActive`}
        d={path}
        markerEnd={`url(#${this.uniqId}-${selected && 'selected' || ''}-Active)`}
        {...props}
      />
    ));

    const paths = transitionPaths.map(({ from, to, path }) => (
      <SVGPath
        className={this.style.transition}
        style={{ stroke: color }}
        key={`${from}-${to}-path`}
        d={path}
        markerEnd={`url(#${this.uniqId}-${color})`}
        {...props}
      />
    ));

    return [ markers ]
      .concat(activeBorders)
      .concat(actives)
      .concat(paths);

  }
}
