import React from 'react';

import Arrow from '../util/arrow';
import bem from '../util/bem';

const st2Class = bem('viewer')
    ;

export default class Edge extends React.Component {
  static propTypes = {
    value: React.PropTypes.object
  }

  render() {
    const { v, w } = this.props.value;

    const A = w.intersect(v)
        , B = v.intersect(w)
        // Shift line back a little
        , AB = A.subtract(B)
        , delta = AB.unit().multiply(Arrow.size.x)
        , head = A.subtract(delta)
        , tail = B.subtract(delta)
        ;

    const groupProps = {
      className: st2Class('edge') + ' ' + st2Class('edge', this.props.value.type)
    };

    const pathProps = {
      className: st2Class('edge-path'),
      markerEnd: `url(#${this.props.value.arrowheadId})`,
      d: `M${tail.x},${tail.y}L${head.x},${head.y}`,
      style: {
        fill: null
      }
    };

    const markerProps = {
      id: this.props.value.arrowheadId,
      viewBox: '0 0 10 16',
      refX: '1',
      refY: '8',
      markerUnits: 'userSpaceOnUse',
      markerWidth: 10,
      markerHeight: 16,
      orient: 'auto'
    };

    return <g {...groupProps} >
      <path {...pathProps} />
      <defs>
        <marker refX='1' {...markerProps} >
          <path d="M 0 0 L 10 8 L 0 16 z"></path>
        </marker>
      </defs>
    </g>;
  }
}
