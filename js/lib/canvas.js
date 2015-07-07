'use strict';

let _ = require('lodash')
  , bem = require('./bem')
  , d3 = require('d3')
  , EventEmitter = require('events').EventEmitter
  , { pack, unpack } = require('./packer')
  ;

let st2Class = bem('viewer');

let nodeTmpl = (node) =>
`
  <div class="${st2Class('node-name')}">${node.name}</div>
  <div class="${st2Class('node-ref')}">${node.ref}</div>
  <div class="${st2Class('node-buttons')}">
    <span class="${st2Class('node-button')} ${st2Class('node-button-move')}" draggable="true"></span>
    <span class="${st2Class('node-button')} ${st2Class('node-button-success')}" draggable="true"></span>
    <span class="${st2Class('node-button')} ${st2Class('node-button-error')}" draggable="true"></span>
  </div>
`;

class Canvas extends EventEmitter {
  constructor() {
    super();

    let self = this;

    this.viewer = d3
      .select(st2Class(null, true))
      ;

    this.svg = this.viewer
      .select(st2Class('canvas', true))
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

    this.clear();
    this.resizeCanvas();
  }

  clear() {
    this.svg
      .selectAll('g')
      .remove('*');

    this.element = this.svg
      .append('g');

    return this;
  }

  draw(graph) {
    this.graph = graph;

    let ok = this.render();

    if (ok) {
      this.centerElement();
    }
  }

  render() {
    this.createNodes(this.viewer, this.graph);

    this.reposition();
  }

  reposition() {
    let nodes = this.viewer.selectAll(st2Class('node', true));

    this.positionNodes(nodes, this.graph);
    this.createEdgePaths(this.svg, this.graph, require('./arrows'));
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
        .html((d) => nodeTmpl(g.node(d)))
        .on('dragenter', function () {
          self.activateNode(this, d3.event);
        })
        .on('dragleave', function () {
          self.deactivateNode(this, d3.event);
        })
        .on('dragover', function () {
          self.dragOverNode(this, d3.event);
        })
        .on('dragstart', function () {
          d3.select(this)
            .classed(st2Class('node', 'dragged'), true);
        })
        .on('dragend', function () {
          d3.select(this)
            .classed(st2Class('node', 'dragged'), false);
        })
        .on('drop', function (name) {
          self.dropOnNode(this, d3.event, name);
        })
        .each(d => {
          let node = g.node(d);

          node.on('change', (changes) => {
            const refChanges = _.find(changes, {name: 'ref'});

            if (refChanges) {
              d3.select(node.elem)
                .select(st2Class('node-ref', true))
                .text(refChanges.object.ref);
            }
          });
        });

    enter.select(st2Class('node-button-move', true))
      .on('dragstart', function (name) {
        self.dragMove(this, d3.event, name);
      })
      ;

    enter.select(st2Class('node-button-success', true))
      .on('dragstart', function (name) {
        self.dragSuccess(this, d3.event, name);
      })
      ;

    enter.select(st2Class('node-button-error', true))
      .on('dragstart', function (name) {
        self.dragError(this, d3.event, name);
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
    selection.style('transform', (v) => {
      let {x, y} = g.node(v);
      return `translate(${x}px,${y}px)`;
    });
  }

  createEdgePaths(selection, g, arrows) {
    this.resizeCanvas();

    // Initialize selection with data set
    let svgPaths = selection.selectAll(st2Class('edge', true))
      .data(g.edges(), (e) => `${e.v}:${e.w}:${e.name}`);

    let svgPathsEnter = svgPaths.enter()
      .append('g')
        .attr('class', (e) => st2Class('edge') + ' ' + st2Class('edge', g.edge(e).type))
        ;

    svgPathsEnter.append('path')
      .attr('class', st2Class('edge-path'));

    svgPathsEnter.append('defs');

    let svgPathExit = svgPaths.exit();

    svgPathExit
      .remove();

    svgPaths.selectAll(st2Class('edge-path', true))
      .each(function(e) {
        let edge = g.edge(e);
        edge.arrowheadId = _.uniqueId('arrowhead');

        let domEdge = d3.select(this)
          .attr('marker-end', function() {
            return 'url(#' + edge.arrowheadId + ')';
          })
          .style('fill', 'none');

        domEdge
          .attr('d', function(e) {
            let tail = g.node(e.v)
              , head = g.node(e.w)
              , points = [tail.intersect(head), head.intersect(tail)];

            let line = d3.svg.line()
              .x((d) => d.x)
              .y((d) => d.y);

            return line(points);
          });
      });

    // Add arrow shape
    svgPaths.selectAll('defs *').remove();
    svgPaths.selectAll('defs')
      .each(function(e) {
        let edge = g.edge(e)
          , arrowhead = arrows.normal;
        arrowhead(d3.select(this), edge.arrowheadId, edge, 'arrowhead');
      });
  }

  centerElement() {
    if (this.element) {
      let canvasBounds = this.svg[0][0].getBoundingClientRect()
        , elementBounds = this.element[0][0].getBoundingClientRect();

      let xCenterOffset = (canvasBounds.width - elementBounds.width) / 2;
      let yCenterOffset = (canvasBounds.height - elementBounds.height) / 2;

      this.element.attr('transform', 'translate(' + xCenterOffset + ', ' + yCenterOffset + ')');
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

        x += width;
        y += height;

        acc.width = acc.width < x ? x : acc.width;
        acc.height = acc.height < y ? y : acc.height;

        return acc;
      }, dimensions);
    }

    this.svg.attr('width', dimensions.width);
    this.svg.attr('height', dimensions.height);
  }

  // Event Handlers

  activateOverlay(element) {
    element.classList.add(st2Class(null, 'active'));
  }

  deactivateOverlay(element) {
    element.classList.remove(st2Class(null, 'active'));
  }

  dragOverOverlay(element, event) {
    let dt = event.dataTransfer;

    if (dt.effectAllowed === 'move' || dt.effectAllowed === 'copy') {
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

      this.emit('move', name, x - offsetX, y - offsetY);
      this.deactivateOverlay(element);
      return;
    }

    packet = event.dataTransfer.getData('actionPack');
    if (packet) {
      let { action } = unpack(packet)
        , {offsetX: x, offsetY: y} = event // Relative to itself (Viewer)
        ;

      this.emit('create', action, x, y);
      this.deactivateOverlay(element);
      return;
    }
  }

  activateNode(element) {
    element.classList.add(st2Class('node', 'active'));
  }

  deactivateNode(element) {
    element.classList.remove(st2Class('node', 'active'));
  }

  dragOverNode(element, event) {
    let dt = event.dataTransfer;

    if (dt.effectAllowed === 'link') {
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
      , [offsetX, offsetY] = [x - node.x, y - node.y]
      ;

    dt.setDragImage(node.elem, offsetX, offsetY);
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
}

module.exports = Canvas;
