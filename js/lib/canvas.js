import _ from 'lodash';
import d3 from 'd3';
import { EventEmitter } from 'events';

import Arrow from './util/arrow';
import bem from './util/bem';
import { pack, unpack } from './util/packer';
import Vector from './util/vector';

import icons from './util/icon';

const st2Class = bem('viewer')
    , st2Icon = bem('icon')
    ;

let nodeTmpl = (node) =>
`
  <div class="${st2Class('node-icon')}">
    <img src="${icons.icons[node.pack] || ''}" width="32" height="32" />
  </div>
  <div class="${st2Class('node-content')}">
    <form class="${st2Class('node-name-form')}">
      <input type="text" class="${st2Class('node-name')}" value="${node.name}"/>
    </form>
    <div class="${st2Class('node-ref')}">${node.ref}</div>
  </div>
  <div class="${st2Class('node-actions')}">
    <div class="${st2Class('node-edit')} ${st2Icon('edit')}"></div>
    <div class="${st2Class('node-delete')} ${st2Icon('delete')}"></div>
  </div>
  <div class="${st2Class('node-buttons')}">
    <span class="${st2Class('node-button')} ${st2Icon('success')}" draggable="true"></span>
    <span class="${st2Class('node-button')} ${st2Icon('error')}" draggable="true"></span>
    <span class="${st2Class('node-button')} ${st2Icon('complete')}" draggable="true"></span>
  </div>
`;

export default class Canvas extends EventEmitter {
  constructor() {
    super();

    const self = this;

    this.viewer = d3
      .select(st2Class(null, true))
      ;

    const drag = d3.behavior.drag();

    drag.on('dragstart', function () {
      if (d3.event.sourceEvent.target === this) {
        d3.select(this)
          .classed(st2Class(null, 'grabbing'), true)
          ;
      }
    });

    drag.on('dragend', function () {
      if (d3.event.sourceEvent.target === this) {
        d3.select(this)
          .classed(st2Class(null, 'grabbing'), false)
          ;
      }
    });

    drag.on('drag', function () {
      if (d3.event.sourceEvent.target === this) {
        d3.event.sourceEvent.preventDefault();

        const element = self.viewer.node();

        element.scrollLeft -= d3.event.dx;
        element.scrollTop -= d3.event.dy;
      }
    });

    this.svg = this.viewer
      .select(st2Class('canvas', true))
      .call(drag)
      .on('dragover', function () {
        if (d3.event.target === this) {
          d3.event.stopPropagation();
          self.dragOverOverlay(this, d3.event);
        }
      })
      .on('dragenter', function () {
        if (d3.event.target === this) {
          d3.event.stopPropagation();
          self.activateOverlay(this, d3.event);
        }
      })
      .on('dragleave', function () {
        if (d3.event.target === this) {
          d3.event.stopPropagation();
          self.deactivateOverlay(this, d3.event);
        }
      })
      .on('drop', function () {
        if (d3.event.target === this) {
          d3.event.stopPropagation();
          self.dropOnOverlay(this, d3.event);
        }
      });

    const cStyle = window.getComputedStyle(this.svg.node());

    this.paddings = {
      top: parseInt(cStyle.getPropertyValue('padding-top')),
      right: parseInt(cStyle.getPropertyValue('padding-right')),
      bottom: parseInt(cStyle.getPropertyValue('padding-bottom')),
      left: parseInt(cStyle.getPropertyValue('padding-left'))
    };

    this.clear();
    this.resizeCanvas();

    this.viewer
      .attr('tabindex', '-1');

    _.each(['keyup', 'keydown'], (type) => {
      this.viewer
        .on(type, () => {
          this.emit(d3.event.type, d3.event);
        })
        ;
    });

  }

  toInner(x, y) {
    x -= this.paddings.left;
    y -= this.paddings.top;

    x = x < 0 ? 0 : x;
    y = y < 0 ? 0 : y;

    return [x, y];
  }

  fromInner(x, y) {
    x += this.paddings.left;
    y += this.paddings.top;

    return [x, y];
  }

  clear() {
    this.svg
      .selectAll('g')
      .remove('*');

    return this;
  }

  render(graph) {
    this.graph = graph;

    this.createNodes(this.viewer, this.graph);

    this.reposition();
  }

  reposition() {
    let nodes = this.viewer.selectAll(st2Class('node', true));

    this.positionNodes(nodes, this.graph);
    this.createEdgePaths(this.svg, this.graph);
    this.createEdgeLabels(this.viewer, this.graph);
  }

  createNodes(selection, g) {
    let self = this;

    let nodes = selection
      .selectAll(st2Class('node', true))
      .data(g.nodes(), (v) => v)
      ;

    let enter = nodes.enter()
      .append('div')
        .attr('class', st2Class('node'))
        .attr('draggable', 'true')
        .html((d) => nodeTmpl(g.node(d)))
        .on('click', function (name) {
          d3.event.stopPropagation();
          self.selectNode(this, d3.event, name);
        })
        .on('dragenter', function () {
          d3.event.stopPropagation();
          self.activateNode(this, d3.event);
        })
        .on('dragleave', function () {
          d3.event.stopPropagation();
          self.deactivateNode(this, d3.event);
        })
        .on('dragover', function () {
          d3.event.stopPropagation();
          self.dragOverNode(this, d3.event);
        })
        .on('dragstart', function (name) {
          d3.event.stopPropagation();
          d3.select(this)
            .classed(st2Class('node', 'dragged'), true);
          self.dragMove(this, d3.event, name);
        })
        .on('dragend', function () {
          d3.event.stopPropagation();
          d3.select(this)
            .classed(st2Class('node', 'dragged'), false);
        })
        .on('drop', function (name) {
          d3.event.stopPropagation();
          self.dropOnNode(this, d3.event, name);
        })
        .each(d => {
          const node = g.node(d);

          node.on('change', (changes) => {
            const refChanges = _.find(changes, {name: 'ref'});

            if (refChanges) {
              const target = d3.select(node.elem);

              target
                .select(st2Class('node-ref', true))
                .text(refChanges.object.ref);

              target
                .select(st2Class('node-icon', true) + ' img')
                .attr('src', icons.icons[node.pack] || '')
                ;
            }
          });

          g.on('select', (name) => {
            d3.select(node.elem)
              .classed(st2Class('node', 'selected'), name === d);
          });
        });

    enter.select(st2Icon('success', true))
      .on('dragstart', function (name) {
        d3.event.stopPropagation();
        self.dragSuccess(this, d3.event, name);
      })
      ;

    enter.select(st2Icon('error', true))
      .on('dragstart', function (name) {
        d3.event.stopPropagation();
        self.dragError(this, d3.event, name);
      })
      ;

    enter.select(st2Icon('complete', true))
      .on('dragstart', function (name) {
        d3.event.stopPropagation();
        self.dragComplete(this, d3.event, name);
      })
      ;

    enter.select(st2Icon('delete', true))
      .on('click', function (name) {
        d3.event.stopPropagation();
        self.deleteNode(this, d3.event, name);
      })
      ;

    enter.select(st2Icon('edit', true))
      .on('click', function (name) {
        d3.event.stopPropagation();
        self.edit(name);
      })
      ;

    enter.select(st2Class('node-name', true))
      .on('keyup', () => d3.event.stopPropagation())
      .on('keydown', () => d3.event.stopPropagation())
      .on('blur', function (name) {
        const value = this.value // HTMLInputElement
            ;

        if (value) {
          self.emit('rename', name, value);
        } else {
          this.value = name;
        }
      })
      ;

    enter.select(st2Class('node-name-form', true))
      .on('submit', function () {
        d3.event.preventDefault();

        d3.select(this)
          .select(st2Class('node-name', true))
            .node().blur()
            ;
      })
      ;

    nodes.exit()
      .remove()
      ;

    nodes.each(function (name) {
      let node = g.node(name)
        , nodeElement = d3.select(this);

      let {width, height} = nodeElement.node().getBoundingClientRect();

      node.width = width;
      node.height = height;

      node.elem = this;
    });

    return nodes;
  }

  positionNodes(selection, g) {
    const transformer = (v) => {
      let {x, y} = g.node(v);

      [x, y] = this.fromInner(x, y);

      return `translate(${x}px,${y}px)`;
    };

    selection.style('transform', transformer);
    selection.style('-webkit-transform', transformer);
  }

  createEdgePaths(selection, g) {
    this.resizeCanvas();

    // Initialize selection with data set
    let svgPaths = selection.selectAll(st2Class('edge', true))
      .data(g.edges(), (e) => `${e.v}:${e.w}:${e.name}`);

    const svgPathsEnter = svgPaths.enter()
      .append('g')
        .attr('class', (e) => st2Class('edge') + ' ' + st2Class('edge', g.edge(e).type))
        ;

    svgPathsEnter.append('path')
      .attr('class', st2Class('edge-path'))
      ;

    svgPathsEnter.append('defs');

    const svgPathExit = svgPaths.exit();

    svgPathExit
      .remove();

    svgPaths
      .each(function(e) {
        const element = d3.select(this)
            , edge = g.edge(e)
            ;

        edge.arrowheadId = _.uniqueId('arrowhead');

        const tail = g.node(e.v)
            , head = g.node(e.w)
            , A = tail.intersect(head)
            , B = head.intersect(tail)
            // Shift line back a little
            , AB = B.subtract(A)
            , delta = AB.unit().multiply(Arrow.size.x)
            , points = [A.subtract(delta), B.subtract(delta)]
            ;

        const line = d3.svg.line()
          .x((d) => d.x)
          .y((d) => d.y)
          ;

        element.select(st2Class('edge-path', true))
          .attr('marker-end', () => `url(#${edge.arrowheadId})`)
          .style('fill', 'none')
          .attr('d', line(points))
          ;
      });

    // Add arrow shape
    svgPaths.selectAll('defs *').remove();
    svgPaths.selectAll('defs')
      .each(function(e) {
        let edge = g.edge(e)
          ;
        new Arrow(d3.select(this), edge.arrowheadId, edge, 'arrowhead');
      });
  }

  createEdgeLabels(selection, g) {
    const self = this
        , labels = selection
            .selectAll(st2Class('label', true))
            .data(g.edges(), (e) => `${e.v}:${e.w}:${e.name}`)
            ;

    labels.enter()
      .append('div')
        .attr('class', (e) => st2Class('label') + ' ' + st2Class('label', g.edge(e).type))
        .on('click', function (edge) {
          d3.event.stopPropagation();
          self.deleteEdge(this, d3.event, edge);
        })
        ;

    labels.exit()
      .remove()
      ;

    const transformer = (e) => {
      const head = g.node(e.v)
          , tail = g.node(e.w)
          , [A, B] = [head.intersect(tail), tail.intersect(head)]
          // find mid point on the line excluding arrow
          , AB = B.subtract(A)
          , length = AB.length() - Arrow.size.x
          , C = AB.unit().multiply(length/2).add(A)
          , [x, y] = this.fromInner(C.x, C.y)
          ;

      return `translate(${x}px,${y}px)`;
    };

    labels
      .style('transform', transformer)
      .style('-webkit-transform', transformer)
      ;
  }

  centerElement() {
    if (this.element) {
      let canvasBounds = this.svg[0][0].getBoundingClientRect()
        , elementBounds = this.element[0][0].getBoundingClientRect();

      let xCenterOffset = (canvasBounds.width - elementBounds.width) / 2;
      let yCenterOffset = (canvasBounds.height - elementBounds.height) / 2;

      const transformer = 'translate(' + xCenterOffset + ', ' + yCenterOffset + ')';

      this.element.attr('transform', transformer);
    }
  }

  resizeCanvas() {
    let element = this.viewer.node()
      , dimensions = {
        width: element.clientWidth,
        height: element.clientHeight
      };

    if (this.graph) {
       dimensions = _.reduce(this.graph.nodes(), (acc, name) => {
        let {x, y, width, height} = this.graph.node(name);

        [x, y] = this.fromInner(x, y);

        x += width + this.paddings.right;
        y += height + this.paddings.bottom;

        acc.width = acc.width < x ? x : acc.width;
        acc.height = acc.height < y ? y : acc.height;

        return acc;
      }, dimensions);
    }

    this.svg.attr('width', dimensions.width);
    this.svg.attr('height', dimensions.height);
  }

  focus() {
    this.viewer
      .node()
        .focus();
  }

  edit(name) {
    const node = this.graph.node(name);
    d3.select(node.elem)
      .classed(st2Class('node', 'edited'), true)
      .select(st2Class('node-name', true))
        .node().select() // This one is HTMLInputElement.select, not d3.select
        ;
  }

  show(name) {
    const node = this.graph.node(name)
        , view = this.viewer.node()
        , { x, y } = node
        , { scrollWidth: width, scrollHeight: height } = node.elem
        , { scrollLeft, scrollTop, clientWidth, clientHeight } = view
        , [ viewWidth, viewHeight ] = this.toInner(clientWidth, clientHeight)
        ;

    const A = new Vector(scrollLeft, scrollTop)
        , B = new Vector(x, y)
        , C = new Vector(x + width, y + height)
        , D = new Vector(...this.toInner(scrollLeft + viewWidth, scrollTop + viewHeight))
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

  // Event Handlers

  activateOverlay(element) {
    element.classList.add(st2Class('canvas', 'active'));
  }

  deactivateOverlay(element) {
    element.classList.remove(st2Class('canvas', 'active'));
  }

  dragOverOverlay(element, event) {
    let dt = event.dataTransfer;

    if (_.includes(['move', 'copy', 'all'], dt.effectAllowed)) {
      event.preventDefault();
    }
  }

  dropOnOverlay(element, event) {
    let packet;

    packet = event.dataTransfer.getData('nodePack');
    if (packet) {
      let { name, offsetX, offsetY } = unpack(packet)
        , {offsetX: x, offsetY: y} = event // Relative to itself (Viewer)
        ;

      [x, y] = this.toInner(x - offsetX, y - offsetY);

      this.emit('move', name, x, y);
      this.deactivateOverlay(element);
      return;
    }

    packet = event.dataTransfer.getData('actionPack');
    if (packet) {
      let { action } = unpack(packet)
        , {offsetX: x, offsetY: y} = event // Relative to itself (Viewer)
        ;

      [x, y] = this.toInner(x, y);

      this.emit('create', action, x, y);
      this.deactivateOverlay(element);
      return;
    }
  }

  selectNode(element, event, name) {
    this.emit('select', name, event);
  }

  activateNode(element) {
    element.classList.add(st2Class('node', 'active'));
  }

  deactivateNode(element) {
    element.classList.remove(st2Class('node', 'active'));
  }

  dragOverNode(element, event) {
    let dt = event.dataTransfer;

    if (_.includes(['link', 'all'], dt.effectAllowed)) {
      event.preventDefault();
    }
  }

  dropOnNode(element, event, name) {
    event.stopPropagation();

    let dt = event.dataTransfer
      , {source, type} = unpack(dt.getData('linkPack'))
      , destination = name
      ;

    this.emit('link', source, destination, type);
    this.deactivateNode(element);
  }

  dragMove(element, event, name) {
    let dt = event.dataTransfer
      , {layerX: x, layerY: y} = event // Relative to the closest positioned element (Viewer)
      , node = this.graph.node(name)
      , [offsetX, offsetY] = this.toInner(x - node.x, y - node.y)// [x - node.x, y - node.y]
      ;

    const crt = node.elem.cloneNode(true);
    crt.style.removeProperty('transform');
    crt.style.removeProperty('-webkit-transform');
    crt.style.setProperty('z-index', 0);

    if (this._hiddenNode) {
      this._hiddenNode.parentNode.replaceChild(crt, this._hiddenNode);
    } else {
      document.body.appendChild(crt);
    }

    this._hiddenNode = crt;

    dt.setDragImage(crt, offsetX, offsetY);
    dt.setData('nodePack', pack({ name, offsetX, offsetY }));
    dt.effectAllowed = 'move';
  }

  dragSuccess(element, event, name) {
    let dt = event.dataTransfer;

    dt.setData('linkPack', pack({
      source: name,
      type: 'success'
    }));
    dt.effectAllowed = 'link';
  }

  dragError(element, event, name) {
    let dt = event.dataTransfer;

    dt.setData('linkPack', pack({
      source: name,
      type: 'error'
    }));
    dt.effectAllowed = 'link';
  }

  dragComplete(element, event, name) {
    let dt = event.dataTransfer;

    dt.setData('linkPack', pack({
      source: name,
      type: 'complete'
    }));
    dt.effectAllowed = 'link';
  }

  dragDisconnect(element, event, name) {
    let dt = event.dataTransfer;

    dt.setData('linkPack', pack({
      source: name
    }));
    dt.effectAllowed = 'link';
  }

  deleteNode(element, event, name) {
    this.emit('delete', name);
  }

  deleteEdge(element, event, edge) {
    this.emit('disconnect', edge);
  }
}
