import _ from 'lodash';
import React from 'react';
import { EventEmitter } from 'events';

import bem from './util/bem';
import Vector from './util/vector';
import { unpack } from './util/packer';

const st2Class = bem('viewer')
    ;

class CanvasController extends EventEmitter {
  toInner(x, y) {
    x -= this.paddings.left;
    y -= this.paddings.top;

    x = x < 0 ? 0 : x;
    y = y < 0 ? 0 : y;

    return [x, y];
  }

  fromInner(x=0, y=0) {
    x += this.paddings.left;
    y += this.paddings.top;

    return [x, y];
  }
}



import Node from './canvas/node';
import Edge from './canvas/edge';
import Label from './canvas/label';

export default class Canvas extends React.Component {
  static propTypes = {
    graph: React.PropTypes.object
  }

  state = {
    scale: 1
  }
  nodes = {}

  componentDidMount() {
    this._canvas = new CanvasController();

    this._canvas.on('select', (selected) => {
      this.setState({ selected });
    });
  }

  on(...args) {
    return this._canvas.on(...args);
  }

  reposition() {
    //return this._canvas.reposition();
  }

  resizeCanvas() {
    // return this._canvas.resizeCanvas();
  }

  edit(name) {
    console.log(name, this.nodes, this.nodes[name]);
    // return this._canvas.edit(name);
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
    // self.zoomer.style('transform', `scale(${self.scale})`);
  }

  getSvgSize() {
    const element = this.refs.viewer;

    let dimensions = {
      width: element.offsetWidth,
      height: element.offsetHeight
    };

    if (this.state.nodes) {
       dimensions = _.reduce(this.state.nodes, (acc, node) => {
        let {x, y, width, height} = node;

        // [x, y] = this.fromInner(x, y);

        x += width;// + this.paddings.right;
        y += height;// + this.paddings.bottom;

        acc.width = acc.width < x ? x : acc.width;
        acc.height = acc.height < y ? y : acc.height;

        return acc;
      }, dimensions);
    }

    return dimensions;
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

    const canvasProps = {
      className: st2Class('canvas'),
      onDragEnter: (e) => this.handleCanvasDragEnter(e),
      onDragLeave: (e) => this.handleCanvasDragLeave(e),
      onDragOver: (e) => this.handleCanvasDragOver(e),
      onDrop: (e) => this.handleCanvasDrop(e)
    };

    if (this.refs.viewer) {
      const svgSize = this.getSvgSize();
      canvasProps.width = svgSize.width;
      canvasProps.height = svgSize.height;
    }

    return <div {...containerProps} >
      <div {...viewerProps} >
        <div {...zoomerProps} >
          <svg {...canvasProps} >
            {
              _.map(this.state.edges, (v, k) => {
                const props = {
                  key: k,
                  value: v
                };

                return <Edge {...props} />;
              })
            }
          </svg>
          {
            _.map(this.state.edges, (v, k) => {
              const props = {
                key: k,
                value: v,
                onClick: (e) => this.handleLabelClick(e, v)
              };

              return <Label {...props} />;
            })
          }
          {
            _.map(this.state.nodes, (v, k) => {
              const props = {
                key: k,
                value: v,
                selected: k === this.state.selected,
                ref: (c) => this.nodes[k] = c,
                onSelect: (e) => this.handleNodeSelect(e, k),
                onRename: (e, v) => this.handleNodeRename(e, k, v),
                onDelete: (e) => this.handleNodeDelete(e, k),
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
