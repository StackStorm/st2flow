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

function roundCorner(from, origin, to) {
  return {
    origin,
    approach: from.subtract(origin).unit().multiply(APPROACH_DISTANCE).add(origin),
    departure: to.subtract(origin).unit().multiply(APPROACH_DISTANCE).add(origin),
  };
}

type Target = {
  task: TaskInterface,
  anchor: string
}

class Path extends Component<{
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
    if (!from.task || !to.task) {
      return '';
    }

    const path = [];

    const fromAnchor = ANCHORS[from.anchor];
    const fromControl = CONTROLS[from.anchor];
    const fromCoords = new Vector(from.task.coords).add(origin);
    const fromSize = new Vector(from.task.size);

    const fromPoint = fromSize.multiply(fromAnchor).add(fromCoords);
    const fromOrbit = fromControl.multiply(ORBIT_DISTANCE).add(fromPoint);

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

    const fromOrbitCorner = roundCorner(fromPoint, fromOrbit, fromLagrange);
    const fromLagrangeCorner = roundCorner(fromOrbit, fromLagrange, toLagrange);
    const toLagrangeCorner = roundCorner(fromLagrange, toLagrange, toOrbit);
    const toOrbitCorner = roundCorner(toLagrange, toOrbit, toPoint);

    path.push(`M ${fromPoint.x} ${fromPoint.y}`);

    if (lagrangePoint.y <= 0) {
      path.push(`L ${fromOrbitCorner.approach.x} ${fromOrbitCorner.approach.y}`);
      path.push(`Q ${fromOrbitCorner.origin.x} ${fromOrbitCorner.origin.y}, ${fromOrbitCorner.departure.x} ${fromOrbitCorner.departure.y}`);
    }

    path.push(`L ${fromLagrangeCorner.approach.x} ${fromLagrangeCorner.approach.y}`);
    path.push(`Q ${fromLagrangeCorner.origin.x} ${fromLagrangeCorner.origin.y}, ${fromLagrangeCorner.departure.x} ${fromLagrangeCorner.departure.y}`);

    path.push(`L ${toLagrangeCorner.approach.x} ${toLagrangeCorner.approach.y}`);
    path.push(`Q ${toLagrangeCorner.origin.x} ${toLagrangeCorner.origin.y}, ${toLagrangeCorner.departure.x} ${toLagrangeCorner.departure.y}`);

    if (lagrangePoint.y <= 0) {
      path.push(`L ${toOrbitCorner.approach.x} ${toOrbitCorner.approach.y}`);
      path.push(`Q ${toOrbitCorner.origin.x} ${toOrbitCorner.origin.y}, ${toOrbitCorner.departure.x} ${toOrbitCorner.departure.y}`);
    }

    path.push(`L ${toPoint.x} ${toPoint.y}`);

    return path.join(' ');
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
      <Path
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
      <Path
        className={cx(this.style.transitionActive, selected && this.style.selected)}
        key={`${from}-${to}-pathActive`}
        d={path}
        markerEnd={`url(#${this.uniqId}-${selected && 'selected' || ''}-Active)`}
        {...props}
      />
    ));

    const paths = transitionPaths.map(({ from, to, path }) => (
      <Path
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
