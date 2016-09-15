import _ from 'lodash';
import React from 'react';

import Arrow from '../util/arrow';
import bem from '../util/bem';
import Vector from '../util/vector';
import { pack, unpack } from '../util/packer';

const st2Class = bem('viewer')
    ;

import Node from './node';
import Edge from './edge';
import Label from './label';

let hiddenNode;

export default class Canvas extends React.Component {
  static propTypes = {
    model: React.PropTypes.object
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
    this.props.model.on('parse', () => {
      this.draw();

      // If at least one node doesn't have coordinates, relayout them all, but
      // not embed coordinates just yet.
      const nodes = this.props.model.nodes();
      if (!_.isEmpty(nodes)) {
        const hasCoords = (name) => {
          const { x, y } = this.props.model.node(name);

          return x !== undefined && y !== undefined;
        };

        if (!_.some(nodes, hasCoords)) {
          this.props.model.graph.layout();
        }
      }

      this.show(this.props.model.selected);
    });

    this.props.model.on('select', (selected) => {
      this.setState({ selected });
    });
  }

  componentDidUpdate() {
    if (this._pendingEdit) {
      this.edit(this._pendingEdit);
      this._pendingEdit = void 0;
    }
  }

  edit(name) {
    return this.nodes[name].edit(name);
  }

  focus() {
    return this.refs.viewer.focus();
  }

  show(name) {
    const node = this.props.model.node(name)
        , view = this.refs.viewer;

    if (!node) {
      return;
    }

    const { x, y, width, height } = node
        , { scrollLeft, scrollTop, clientWidth, clientHeight } = view
        , [ viewWidth, viewHeight ] = [clientWidth, clientHeight]
        ;

    const A = new Vector(scrollLeft, scrollTop)
        , B = new Vector(x, y)
        , C = new Vector(x + width, y + height)
        , D = new Vector(...[scrollLeft + viewWidth, scrollTop + viewHeight])
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

  draw() {
    const graph = this.props.model.graph;
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
  }

  handleLabelClick(e, edge) {
    const { v, w } = edge;
    this.props.model.disconnect(v.name, w.name);
  }

  handleNodeSelect(event, name) {
    const SHIFT = 1
        , ALT = 2
        , CTRL = 4
        , META = 8
        ;

    const mode =
      event.shiftKey * SHIFT +
      event.altKey * ALT +
      event.ctrlKey * CTRL +
      event.metaKey * META;

    switch(mode) {
      case SHIFT:
        this.props.model.connect(this.props.model.selected, name, 'success');
        break;
      case ALT:
        this.props.model.connect(this.props.model.selected, name, 'error');
        break;
      case SHIFT + ALT:
        this.props.model.connect(this.props.model.selected, name, 'complete');
        break;
      case META:
        this.edit(name);
        break;
      default:
        this.props.model.select(name);
    }
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
    return this.props.model.rename(name, value);
  }

  handleNodeDelete(e, name) {
    this.props.model.delete(name);
    this.focus();
  }

  handleNodeConnect(e, source, destination, type) {
    if (type) {
      this.props.model.connect(source, destination, type);
    } else {
      this.props.model.disconnect(source, destination, type);
    }
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
        , {offsetX: x, offsetY: y} = e.nativeEvent
        ;

      [x, y] = [x - offsetX, y - offsetY];

      this.props.model.move(name, x, y);
      this.setState({ active: false });
      return;
    }

    packet = e.dataTransfer.getData('actionPack');
    if (packet) {
      let { action } = unpack(packet)
        , {offsetX: x, offsetY: y} = e.nativeEvent
        ;

      const node = this.props.model.create(action, x, y);
      this._pendingEdit = node.name;

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

  handleKeyDown(e) {
    const BACKSPACE = 8
        , DELETE = 46
        , Z = 90
        ;

    switch(e.keyCode) {
      case BACKSPACE:
      case DELETE:
        e.preventDefault();
        this.props.model.delete(this.props.model.selected);
        break;
      case Z:
        if (!e.ctrlKey && !e.metaKey) {
          return;
        }
        if (e.shiftKey) {
          this.props.model.redo();
        } else {
          this.props.model.undo();
        }
    }
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
      tabIndex: '-1',
      ref: 'viewer',
      onKeyDown: (e) => this.handleKeyDown(e)
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
