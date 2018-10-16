import React, { Component } from 'react';
import { PropTypes } from 'prop-types';

import Vector from './vector';

import style from './style.css';

window.vec = Vector;

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

function roundCorner(from, origin, to) {
  return {
    origin,
    approach: from.subtract(origin).unit().multiply(APPROACH_DISTANCE).add(origin),
    departure: to.subtract(origin).unit().multiply(APPROACH_DISTANCE).add(origin),
  };
}

export default class Transition extends Component {
  static propTypes = {
    from: PropTypes.object.isRequired,
    to: PropTypes.object.isRequired,
  }

  style = style

  uniqId = 'some'

  makePath(from, to) {
    const path = [];

    const fromAnchor = ANCHORS[from.anchor];
    const fromControl = CONTROLS[from.anchor];
    const fromCoords = new Vector(from.task.coords);
    const fromSize = new Vector(from.task.size);

    const fromPoint = fromSize.multiply(fromAnchor).add(fromCoords);
    const fromOrbit = fromControl.multiply(ORBIT_DISTANCE).add(fromPoint);

    const toAnchor = ANCHORS[to.anchor];
    const toControl = CONTROLS[to.anchor];
    const toCoords = new Vector(to.task.coords);
    const toSize = new Vector(to.task.size);

    const arrowCompensation = toControl.multiply(10);
    const toPoint = toSize.multiply(toAnchor).add(toCoords).add(arrowCompensation);
    const toOrbit = toControl.multiply(ORBIT_DISTANCE).add(toPoint);

    const lagrangePoint = toOrbit.subtract(fromOrbit).divide(2);  
    const fromLagrange = lagrangePoint.multiply(lagrangePoint.y > 0 ? VERTICAL_MASK : HORISONTAL_MASK).add(fromOrbit);
    const toLagrange = lagrangePoint.multiply(lagrangePoint.y > 0 ? VERTICAL_MASK : HORISONTAL_MASK).multiply(-1).add(toOrbit);

    const fromOrbitCorner = roundCorner(fromPoint, fromOrbit, fromLagrange);
    const fromLagrangeCorner = roundCorner(fromOrbit, fromLagrange, toLagrange);
    const toLagrangeCorner = roundCorner(fromLagrange, toLagrange, toOrbit);
    const toOrbitCorner = roundCorner(toLagrange, toOrbit, toPoint);

    path.push(`M ${fromPoint.x} ${fromPoint.y}`);
    path.push(`L ${fromOrbitCorner.approach.x} ${fromOrbitCorner.approach.y}`);
    path.push(`Q ${fromOrbitCorner.origin.x} ${fromOrbitCorner.origin.y}, ${fromOrbitCorner.departure.x} ${fromOrbitCorner.departure.y}`);

    path.push(`L ${fromLagrangeCorner.approach.x} ${fromLagrangeCorner.approach.y}`);
    path.push(`Q ${fromLagrangeCorner.origin.x} ${fromLagrangeCorner.origin.y}, ${fromLagrangeCorner.departure.x} ${fromLagrangeCorner.departure.y}`);

    path.push(`L ${toLagrangeCorner.approach.x} ${toLagrangeCorner.approach.y}`);
    path.push(`Q ${toLagrangeCorner.origin.x} ${toLagrangeCorner.origin.y}, ${toLagrangeCorner.departure.x} ${toLagrangeCorner.departure.y}`);

    path.push(`L ${toOrbitCorner.approach.x} ${toOrbitCorner.approach.y}`);
    path.push(`Q ${toOrbitCorner.origin.x} ${toOrbitCorner.origin.y}, ${toOrbitCorner.departure.x} ${toOrbitCorner.departure.y}`);
    path.push(`L ${toPoint.x} ${toPoint.y}`);

    return path.join(' ');
  }

  render() {
    const { from, to, ...props } = this.props;

    const path = this.makePath(from, to);

    return (
      [
        <defs key="marker">
          <marker id={this.uniqId} markerWidth="10" markerHeight="10" refX="1" refY="1" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,2 L3,1 z" className={this.style.transitionArrow} />
          </marker>
        </defs>,
        <path
          key="path"
          className={this.style.transition}
          d={path}
          markerEnd={`url(#${this.uniqId})`}
          {...props}
        />,
      ]
    );
  }
}
