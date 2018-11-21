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
import astar, { Graph } from './astar';
import type { GridNode } from './astar';

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

    type BoundingBox = {|
      left: number,
      right: number,
      top: number,
      bottom: number,
      midpointX: number,
      midpointY: number,
    |};
    const boundingBoxes: Array<BoundingBox> = Object.keys(taskRefs).map((key: string): BoundingBox => {
      const task: TaskInterface = taskRefs[key].current.props.task;

      const coords = new Vector(task.coords).add(origin);
      const size = new Vector(task.size);

      return {
        left: coords.x - ORBIT_DISTANCE,
        top: coords.y - ORBIT_DISTANCE,
        bottom: coords.y + size.y + ORBIT_DISTANCE,
        right: coords.x + size.x + ORBIT_DISTANCE,
        midpointY: coords.y + size.y / 2,
        midpointX: coords.x + size.x / 2,
      };
    });

    /*  Let I be the set of interesting points (x, y) in the diagram, i.e. the connector
    points and corners of the bounding box of each object. Let XI be the set of x
    coordinates in I and YI the set of y coordinates in I. The orthogonal visibility
    graph V G = (V, E) is made up of nodes V ⊆ XI × YI s.t. (x, y) ∈ V iff there
    exists y0 s.t. (x, y0) ∈ I and there is no intervening object between (x, y) and
    (x, y0) and there exists x0 s.t. (x0, y) ∈ I and there is no intervening object
    between (x, y) and (x0, y). There is an edge e ∈ E between each point in V to its
    nearest neighbour to the north, south, east and west iff there is no intervening
    object in the original diagram */
    const I = [].concat(...boundingBoxes.map(box => {
      return [
        { x: box.left, y: box.top },
        { x: box.left, y: box.bottom },
        { x: box.right, y: box.top },
        { x: box.right, y: box.bottom },
        // our connectors are currently at the midpoints of each edge.
        //  That can be changed here.
        { x: box.left, y: box.midpointY },
        { x: box.midpointX, y: box.top },
        { x: box.midpointX, y: box.bottom },
        { x: box.right, y: box.midpointY },
      ];
    }));
    const XI = I.reduce((a, i) => {
      a[i.x] = a[i.x] || [];
      a[i.x].push(i.y);
      return a;
    }, {});
    const YI = I.reduce((a, i) => {
      a[i.y] = a[i.y] || [];
      a[i.y].push(i.x);
      return a;
    }, {});
    const E = {};
    const V = [].concat(...Object.keys(XI).map(_x => {
      const x = +_x;
      return Object.keys(YI).filter(_y => {
        const y = +_y;
        // optimization: find nearest neighbor first.
        //  if nearest neighbors are blocked then all are.
        let nearestNeighborUp = -Infinity;
        let nearestNeighborDown = Infinity;
        let nearestNeighborLeft = -Infinity;
        let nearestNeighborRight = Infinity;
        YI[y].forEach(_x => {
          // x > _x means _x is to the left
          if(x !== _x) {
            if(x > _x && _x > nearestNeighborLeft) {
              nearestNeighborLeft = _x;
            }
            if(x < _x && _x < nearestNeighborRight) {
              nearestNeighborRight = _x;
            }
          }
        });
        XI[x].forEach(_y => {
          // y > _y means _y is above
          if(y !== _y) {
            if(y > _y && _y > nearestNeighborUp) {
              nearestNeighborUp = _y;
            }
            if(y < _y && _y < nearestNeighborDown) {
              nearestNeighborDown = _y;
            }
          }
        });

        boundingBoxes.forEach(box => {
          // Make visibility checks.  If a box is beween (x, y) and the nearest "interesting" neighbor,
          // (interesting neighbors are the points in I which share either an X or Y coordinate)
          // remove that nearest neighbor.
          if(nearestNeighborUp > -Infinity) {
            if(x > box.left && x < box.right && y > box.top && nearestNeighborUp < box.bottom) {
              nearestNeighborUp = -Infinity;
            }
          }
          if(nearestNeighborDown < Infinity) {
            if(x > box.left && x < box.right && y < box.bottom && nearestNeighborDown > box.top) {
              nearestNeighborDown = Infinity;
            }
          }
          if(nearestNeighborLeft > -Infinity) {
            if(y > box.top && y < box.bottom && x > box.left && nearestNeighborLeft < box.right) {
              nearestNeighborLeft = -Infinity;
            }
          }
          if(nearestNeighborRight < Infinity) {
            if(y > box.top && y < box.bottom && x < box.right && nearestNeighborRight > box.left) {
              nearestNeighborRight = Infinity;
            }
          }
        });

        if (XI[x].indexOf(y) > -1 ||
          (nearestNeighborUp !== -Infinity ||
             nearestNeighborDown !== Infinity) &&
            (nearestNeighborLeft !== -Infinity ||
             nearestNeighborRight !== Infinity)
        ) {
          E[`${x}|${y}`] = E[`${x}|${y}`] || [];
          if(nearestNeighborUp !== -Infinity) {
            // for what to put in the graph edges, now we want to look
            // at any point in V, not just interesting ones.
            // If there exists a point of interest (x, yi) such that there
            // is no bounding box in V
            nearestNeighborUp = Object.keys(YI).reduce((bestY, _yStr) => {
              const _y = +_yStr;
              return _y < y && _y > bestY ? _y : bestY;
            }, nearestNeighborUp);
            E[`${x}|${y}`].push({x, y: nearestNeighborUp});
          }
          if(nearestNeighborDown !== Infinity) {
            nearestNeighborDown = Object.keys(YI).reduce((bestY, _yStr) => {
              const _y = +_yStr;
              return _y > y && _y < bestY ? _y : bestY;
            }, nearestNeighborDown);
            E[`${x}|${y}`].push({x, y: nearestNeighborDown});
          }
          if(nearestNeighborLeft !== -Infinity) {
            nearestNeighborLeft = Object.keys(XI).reduce((bestX, _xStr) => {
              const _x = +_xStr;
              return _x < x && _x > bestX ? _x : bestX;
            }, nearestNeighborLeft);
            E[`${x}|${y}`].push({x: nearestNeighborLeft, y});
          }
          if(nearestNeighborRight !== Infinity) {
            nearestNeighborRight = Object.keys(XI).reduce((bestX, _xStr) => {
              const _x = +_xStr;
              return _x > x && _x < bestX ? _x : bestX;
            }, nearestNeighborRight);
            E[`${x}|${y}`].push({x: nearestNeighborRight, y});
          }
          return true;
        }
        else {
          return false;
        }
      }).map(y => ({ x, y: +y }));
    }));

    // now for the A* algorithm
    const pathElements = astar.search(
      V,
      E,
      fromPoint.add(new Vector(0, ORBIT_DISTANCE)),
      toPoint.add(new Vector(0, -ORBIT_DISTANCE/2))
    );

    pathElements.forEach(nextPoint => {
      path.moveTo(new Vector(nextPoint.x, nextPoint.y));
    });
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

    // TODO: make this debug routine a const var and add to the return concats below.
    // this.state && this.state.graph && [ Object.keys(this.state.graph.grid).map(e => {
    //   const [ x, y ] = e.split('|');
    //   return this.state.graph.grid[e].map(et => {
    //     const [ xt, yt ] = et.split('|');
    //     return <path key={e+et} stroke="red" strokeWidth="1" d={`M ${x} ${y} L ${xt} ${yt}`} />;
    //   });
    // }).concat(Object.values(this.state.graph.nodes).map((node: GridNode) => {
    //   const { x, y } = node;
    //   return <circle key={`${node.x}|${node.y}`} cx={x} cy={y} r="3" fill="black" />;
    // })) ],

    return [ markers ]
      .concat(activeBorders)
      .concat(actives)
      .concat(paths);

  }
}
