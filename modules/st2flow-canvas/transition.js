//@flow

import type { TaskInterface } from '@stackstorm/st2flow-model/interfaces';
import type { Node } from 'react';

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import Vector from './vector';
import { origin, ORBIT_DISTANCE } from './const';
import Path from './path/';
import Line from './path/line';
import type { Task } from './task';

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
  taskRefs: {| [taskname: string]: { current: Task } |},
}> {
  static propTypes = {
    transitions: PropTypes.arrayOf(
      PropTypes.shape({
        from: PropTypes.object.isRequired,
        to: PropTypes.object.isRequired,
      })
    ),
    taskRefs: PropTypes.object.isRequired,
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
    const fromSize = new Vector(from.task && from.task.size);

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

    const taskElements: Array<?HTMLElement> = Object.keys(taskRefs).map((key: string): ?HTMLElement => {
      const task = taskRefs[key].current;

      // Filter out path start and end points, which produce false positives
      if(this.props.from.task && task.props.task.name === this.props.from.task.name
        || this.props.to.task && task.props.task.name === this.props.to.task.name) {
        return null;
      }

      if(task.taskRef.current instanceof HTMLElement) {
        return task.taskRef.current;
      }
      else {
        return null;
      }
    }).filter(e => e);
    type BoundingBox = {|
      left: number,
      right: number,
      top: number,
      bottom: number,
      midpointX: number,
      midpointY: number,
    |};
    const boundingBoxes: Array<BoundingBox> = taskElements.map(element => {
      if(!element) {
        return { left: NaN, right: NaN, top: NaN, bottom: NaN, midpointX: NaN, midpointY: NaN };
      }

      const matrixString = getComputedStyle(element).getPropertyValue('transform');
      const Matrix = 'DOMMatrix' in window ? window.DOMMatrix : window.WebKitCSSMatrix;
      const coords = new Matrix(matrixString);

      return {
        left: coords.m41 - ORBIT_DISTANCE / 2,
        top: coords.m42 - ORBIT_DISTANCE / 2,
        bottom: coords.m42 + element.offsetHeight + ORBIT_DISTANCE / 2,
        right: coords.m41 + element.offsetWidth + ORBIT_DISTANCE / 2,
        midpointY: coords.m42 + element.offsetHeight / 2,
        midpointX: coords.m41 + element.offsetWidth / 2,
      };
    });

    function doesPathSegmentIntersectBox(line: Line, origin: Vector, box: BoundingBox): boolean {
      const newPos = line.calcNewPosition(origin);
      const withinY = !(
        newPos.y < box.top && origin.y < box.top ||
        newPos.y > box.bottom && origin.y > box.bottom
      );
      const withinX = !(
        newPos.x < box.left && origin.x < box.left ||
        newPos.x > box.right && origin.x > box.right
      );
      return withinX && withinY;
    }


    [ fromOrbit, fromLagrange, toLagrange, toOrbit, toPoint ].forEach(nextPoint => {
      let origin = path.currentPosition;
      //const dir = path.currentDir;
      path.moveTo(nextPoint);
      let lastSegment: Line = path.elements.pop();

      boundingBoxes.forEach(box => {
        if(doesPathSegmentIntersectBox(lastSegment, origin, box)) {

          // cut box into quadrants so we know which direction to push the line around.
          const ul: BoundingBox = { left: box.left, right: box.midpointX, top: box.top, bottom: box.midpointY, midpointX: NaN, midpointY: NaN };
          const ur: BoundingBox = { left: box.midpointX, right: box.right, top: box.top, bottom: box.midpointY, midpointX: NaN, midpointY: NaN };
          const ll: BoundingBox = { left: box.left, right: box.midpointX, top: box.midpointY, bottom: box.bottom, midpointX: NaN, midpointY: NaN };
          const lr: BoundingBox = { left: box.midpointX, right: box.right, top: box.midpointY, bottom: box.bottom, midpointX: NaN, midpointY: NaN };

          const ulint = doesPathSegmentIntersectBox(lastSegment, origin, ul);
          const urint = doesPathSegmentIntersectBox(lastSegment, origin, ur);
          const llint = doesPathSegmentIntersectBox(lastSegment, origin, ll);
          const lrint = doesPathSegmentIntersectBox(lastSegment, origin, lr);

          switch(lastSegment.direction) {
            case 'up':
            case 'down':
              if(ulint || llint) {
                path.moveTo(new Vector(box.left, origin.y));
                origin = path.currentPosition;
                path.moveTo(new Vector(box.left, nextPoint.y));
                lastSegment = path.elements.pop();
              }
              if(urint || lrint) {
                path.moveTo(new Vector(box.right, origin.y));
                origin = path.currentPosition;
                path.moveTo(new Vector(box.right, nextPoint.y));
                lastSegment = path.elements.pop();
              }
              break;
            case 'left':
            case 'right':
              if(ulint || urint) {
                path.moveTo(new Vector(origin.x, box.top));
                origin = path.currentPosition;
                path.moveTo(new Vector(nextPoint.x, box.top));
                lastSegment = path.elements.pop();
              }
              if(llint || lrint) {
                path.moveTo(new Vector(origin.x, box.bottom));
                origin = path.currentPosition;
                path.moveTo(new Vector(nextPoint.x, box.bottom));
                lastSegment = path.elements.pop();
              }
              break;
          }

        }
      });
      path.elements.push(lastSegment);
    });

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
