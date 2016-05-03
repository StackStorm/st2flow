import _ from 'lodash';
import React from 'react';
import { EventEmitter } from 'events';

import Arrow from './util/arrow';
import bem from './util/bem';
import Vector from './util/vector';
import { pack, unpack } from './util/packer';

const st2Class = bem('viewer')
    ;

import Node from './canvas/node';
import Edge from './canvas/edge';
import Label from './canvas/label';

let hiddenNode;

class CanvasController extends EventEmitter {}

export default class Canvas extends React.Component {
  static propTypes = {
    graph: React.PropTypes.object
  }

  state = {
    scale: 1
  }

  nodes = {}

  paddings = {
    top: 45,
    right: 10,
    bottom: 10,
    left: 10
  }

  toInner(x, y) {
    x -= this.paddings.left / this.state.scale;
    y -= this.paddings.top / this.state.scale;

    x = x < 0 ? 0 : x;
    y = y < 0 ? 0 : y;

    return [x, y];
  }

  fromInner(x=0, y=0) {
    if (_.isObject(x)) {
      y = x.y;
      x = x.x;
    }

    x += this.paddings.left / this.state.scale;
    y += this.paddings.top / this.state.scale;

    return [x, y];
  }

  componentDidMount() {
    this._canvas = new CanvasController();

    this._canvas.on('select', (selected) => {
      this.setState({ selected });
    });
  }

  on(...args) {
    return this._canvas.on(...args);
  }

  edit(name) {
    return this.nodes[name].edit(name);
  }

  focus() {
    return this.refs.viewer.focus();
  }

  show(name) {
    const node = this._canvas.graph.node(name)
        , view = this.refs.viewer
        , { x, y, width, height } = node
        , { scrollLeft, scrollTop, clientWidth, clientHeight } = view
        , [ viewWidth, viewHeight ] = [clientWidth, clientHeight]//this.toInner(clientWidth, clientHeight)
        ;

    const A = new Vector(scrollLeft, scrollTop)
        , B = new Vector(x, y)
        , C = new Vector(x + width, y + height)
        , D = new Vector(...[scrollLeft + viewWidth, scrollTop + viewHeight])//this.toInner(scrollLeft + viewWidth, scrollTop + viewHeight))
        , AB = B.subtract(A)
        , CD = D.subtract(C)
        ;

    if (AB.x < 0) {
      view.scrollLeft += AB.x;
    }

    if (AB.y < 0) {
      view.scrollTop += AB.y;
    }

    if (CD.x < 0) {
      view.scrollLeft -= CD.x;
    }

    if (CD.y < 0) {
      view.scrollTop -= CD.y;
    }
  }

  draw(graph) {
    const nodes = graph._nodes;
    const edges = _.mapValues(graph._edgeObjs, (edge, key) => {
      const { v, w } = edge;

      return Object.assign({
        arrowheadId: _.uniqueId('arrowhead'),
        v: graph._nodes[v],
        w: graph._nodes[w]
      }, graph._edgeLabels[key]);
    });

    this.setState({ nodes, edges });
    this._canvas.graph = graph;
  }

  handleLabelClick(e, edge) {
    const { v, w } = edge;
    this._canvas.emit('disconnect', { v: v.name, w: w.name });
  }

  handleNodeSelect(e, name) {
    this._canvas.emit('select', name, e);
    // this.setState({ selected });
  }

  handleNodePick(e, name) {
    const dt = e.dataTransfer;

    const {layerX: targetX, layerY: targetY} = e.nativeEvent;
    const { x, y } = this.state.nodes[name];

    const vViewport = new Vector(targetX, targetY);
    const vNode = new Vector(x, y);
    const vOrigin = new Vector(this.paddings.left, this.paddings.top);

    const offset = vViewport.subtract(vOrigin).divide(this.state.scale).subtract(vNode);

    const crt = e.target.cloneNode(true);
    crt.style.removeProperty('transform');
    crt.style.removeProperty('-webkit-transform');
    crt.style.setProperty('z-index', -1);

    if (hiddenNode) {
      hiddenNode.parentNode.replaceChild(crt, hiddenNode);
    } else {
      document.body.appendChild(crt);
    }

    hiddenNode = crt;

    dt.setDragImage(crt, offset.x, offset.y);
    dt.setData('nodePack', pack({ name, offsetX: offset.x, offsetY: offset.y }));
    dt.effectAllowed = 'move';
  }

  handleNodeRename(e, name, value) {
    this._canvas.emit('rename', name, value);
  }

  handleNodeDelete(e, name) {
    this._canvas.emit('delete', name);
  }

  handleNodeConnect(e, source, destination, type) {
    this._canvas.emit('link', source, destination, type);
  }

  handleCanvasDragEnter(e) {
    e.stopPropagation();
    this.setState({ active: true });
  }

  handleCanvasDragLeave(e) {
    e.stopPropagation();
    this.setState({ active: false });
  }

  handleCanvasDragOver(e) {
    e.stopPropagation();
    const dt = e.dataTransfer;

    if (_.includes(['move', 'copy', 'all'], dt.effectAllowed)) {
      e.preventDefault();
    }
  }

  handleCanvasDrop(e) {
    e.stopPropagation();

    let packet;

    packet = e.dataTransfer.getData('nodePack');
    if (packet) {
      let { name, offsetX, offsetY } = unpack(packet)
        , {offsetX: x, offsetY: y} = e.nativeEvent // Relative to itself (Viewer)
        ;

      [x, y] = [x - offsetX, y - offsetY]; //this.toInner(x - offsetX, y - offsetY);

      this._canvas.emit('move', name, x, y);
      this.setState({ active: false });
      return;
    }

    packet = e.dataTransfer.getData('actionPack');
    if (packet) {
      let { action } = unpack(packet)
        , {offsetX: x, offsetY: y} = e.nativeEvent // Relative to itself (Viewer)
        ;

      // [x, y] = this.toInner(x, y);

      this._canvas.emit('create', action, x, y);
      this.setState({ active: false });
      return;
    }
  }

  handleCanvasMouseMove(e) {
    if (this.state.grabbing) {
      e.stopPropagation();
      e.preventDefault();

      const element = this.refs.viewer;

      const { clientX, clientY } = e.nativeEvent;

      const A1 = this.state.grabbing
        , B = new Vector(clientX, clientY)
        , { x, y } = A1.subtract(B)
        ;

      element.scrollLeft = x;
      element.scrollTop = y;
    }
  }

  handleCanvasMouseDown(e) {
    e.preventDefault(); // prevents text getting selected during mouse drag
    e.stopPropagation();

    const { scrollLeft, scrollTop } = this.refs.viewer;
    const { clientX, clientY } = e.nativeEvent;

    const P = new Vector(scrollLeft, scrollTop)
        , A = new Vector(clientX, clientY)
        ;

    this.setState({ grabbing: A.add(P) });
  }

  handleCanvasMouseUp(e) {
    e.preventDefault();
    e.stopPropagation();

    this.setState({ grabbing: false });
  }

  handleCanvasMouseEnter(e) {
    if (this.state.grabbing && e.nativeEvent.buttons !== 1) {
      this.setState({ grabbing: false });
    }
  }

  handleCanvasOnWheel(e) {
    e.preventDefault();

    const delta = e.deltaY;
    let { scale } = this.state;

    scale += parseInt(delta) / 1000;

    if (scale < .1) {
      scale = .1;
    }

    if (scale > 1) {
      scale = 1;
    }

    this.setState({ scale });
  }

  getSvgSize() {
    const { nodes={}, scale } = this.state;

    let { offsetWidth: width, offsetHeight: height } = this.refs.viewer;

    const { top, bottom, left, right } = this.paddings;

    width -= left + right;
    height -= top + bottom;

    width /= scale;
    height /= scale;

    for (const key of Object.keys(nodes)) {
      const { width: w, height: h } = nodes[key];
      let [ x, y ] = this.fromInner(nodes[key]);

      x += w;
      y += h;

      width = width < x ? x : width;
      height = height < y ? y : height;
    }

    return { width, height };
  }

  render() {
    const containerProps = {
      style: {
        height: '100%'
      },
      onMouseMove: (e) => this.handleCanvasMouseMove(e),
      onMouseDown: (e) => this.handleCanvasMouseDown(e),
      onMouseUp: (e) => this.handleCanvasMouseUp(e),
      onMouseEnter: (e) => this.handleCanvasMouseEnter(e),
      onWheel: (e) => this.handleCanvasOnWheel(e)
    };

    const viewerProps = {
      className: st2Class(null),
      tabindex: -1,
      ref: 'viewer'
    };

    if (this.state.active) {
      viewerProps.className += ' ' + st2Class(null, 'active');
    }

    if (this.state.grabbing) {
      viewerProps.className += ' ' + st2Class(null, 'grabbing');
    }

    const zoomerProps = {
      className: st2Class('zoomer'),
      style: {
        transform: `scale(${this.state.scale})`
      }
    };

    const { top, bottom, left, right } = this.paddings;

    const canvasProps = {
      className: st2Class('canvas'),
      style: {
        margin: [top, right, bottom, left].map(v => (v / this.state.scale) + 'px').join(' ')
      },
      onDragEnter: (e) => this.handleCanvasDragEnter(e),
      onDragLeave: (e) => this.handleCanvasDragLeave(e),
      onDragOver: (e) => this.handleCanvasDragOver(e),
      onDrop: (e) => this.handleCanvasDrop(e)
    };

    if (this.refs.viewer) {
      const { width, height } = this.getSvgSize();
      Object.assign(canvasProps, { width, height });
    }

    return <div {...containerProps} >
      <div {...viewerProps} >
        <div {...zoomerProps} >
          <svg {...canvasProps} >
            {
              _.map(this.state.edges, (edge, key) => {
                const props = {
                  key,
                  value: edge
                };

                return <Edge {...props} />;
              })
            }
          </svg>
          {
            _.map(this.state.edges, (edge, key) => {
              const { v, w } = edge;

              const A = w.intersect(v)
                  , B = v.intersect(w)
                  // find mid point on the line excluding arrow
                  , AB = B.subtract(A)
                  , length = AB.length() + Arrow.size.x
                  , M = AB.unit().multiply(length/2).add(A)
                  , [x, y] = this.fromInner(M)
                  ;

              const props = {
                key,
                value: edge,
                x,
                y,
                onClick: (e) => this.handleLabelClick(e, edge)
              };

              return <Label {...props} />;
            })
          }
          {
            _.map(this.state.nodes, (node, key) => {
              const [ x, y ] = this.fromInner(node);

              const props = {
                key,
                value: node,
                x,
                y,
                selected: key === this.state.selected,
                ref: (c) => this.nodes[key] = c,
                onSelect: (e) => this.handleNodeSelect(e, key),
                onPick: (e) => this.handleNodePick(e, key),
                onRename: (e, v) => this.handleNodeRename(e, key, v),
                onDelete: (e) => this.handleNodeDelete(e, key),
                onConnect: (...args) => this.handleNodeConnect(...args)
              };

              return <Node {...props} />;
            })
          }
        </div>
      </div>
    </div>;
  }
}
