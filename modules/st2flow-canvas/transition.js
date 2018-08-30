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

const CONTROLS = {
  top: new Vector(0, -1),
  left: new Vector(-1, 0),
  bottom: new Vector(0, 1),
  right: new Vector(1, 0),
};

const CONTROL_SIZE = 100;

export default class Task extends Component {
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
    const fromControlPoint = fromControl.multiply(CONTROL_SIZE).add(fromPoint);

    path.push(`M ${fromPoint.x} ${fromPoint.y}`);
    path.push(`C ${fromControlPoint.x} ${fromControlPoint.y},`);

    const toAnchor = ANCHORS[to.anchor];
    const toControl = CONTROLS[to.anchor];
    const toCoords = new Vector(to.task.coords);
    const toSize = new Vector(to.task.size);

    // Compensating for the arrow
    const toRealPoint = toSize.multiply(toAnchor).add(toCoords);

    const toControlPoint = toControl.multiply(CONTROL_SIZE).add(toRealPoint);
    const toPoint = toControl.multiply(10).add(toRealPoint);

    path.push(`${toControlPoint.x} ${toControlPoint.y},`);
    path.push(`${toPoint.x} ${toPoint.y}`);

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
