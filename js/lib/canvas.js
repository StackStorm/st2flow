'use strict';

let _ = require('lodash')
  , d3 = require('d3')
  , dagreD3 = require('dagre-d3')
  , EventEmitter = require('events').EventEmitter
  ;

let render = dagreD3.render();

let st2BEM = (prefix, block, el, mod) =>
  `${prefix ? prefix + '-' : ''}${block}${el ? '__' + el : ''}${_.isString(mod) ? '--' + mod : ''}`;

let st2Class = (element, modifier, selector) => {
  return st2BEM(selector || modifier === true ? '.st2' : 'st2', 'viewer', element, modifier);
};

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

function pack(o) {
  return JSON.stringify(o);
}

function unpack(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return {};
  }
}

class Canvas extends EventEmitter {
  constructor() {
    super();

    let self = this;

    this.viewer = d3
      .select(st2Class(null, true))
      ;

    this.overlay = this.viewer
      .append('div')
      .classed(st2Class('overlay'), true)
      .on('dragover', function () {
        if (event.target === this) {
          event.stopPropagation();
          self.dragOverOverlay(this, d3.event);
        }
      })
      .on('dragenter', function () {
        if (event.target === this) {
          event.stopPropagation();
          self.activateOverlay(this, d3.event);
        }
      })
      .on('dragleave', function () {
        if (event.target === this) {
          event.stopPropagation();
          self.deactivateOverlay(this, d3.event);
        }
      })
      .on('drop', function () {
        if (event.target === this) {
          event.stopPropagation();
          self.dropOnOverlay(this, d3.event);
        }
      });

    this.svg = this.viewer
      .select(st2Class('canvas', true));

    this.clear();

    render.createNodes(this.createNodes.bind(this));
    render.createEdgePaths(this.createEdgePaths.bind(this));
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
    let nodes = this.createNodes(this.overlay, this.graph);

    dagreD3.dagre.layout(this.graph);

    this.positionNodes(nodes, this.graph);
    this.createEdgePaths(this.svg, this.graph, require('dagre-d3/lib/arrows'));
  }

  reposition() {
    let nodes = this.overlay.selectAll(st2Class('node', true));

    this.positionNodes(nodes, this.graph);
    this.createEdgePaths(this.svg, this.graph, require('dagre-d3/lib/arrows'));
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
        .on('drop', function (name) {
          self.dropOnNode(this, d3.event, name);
        });

    enter.select(st2Class('node-button-move', true))
      .on('dragstart', function (name) {
        self.dragMove(this, d3.event, name);
      })
      ;

    enter.select(st2Class('node-button-success', true))
      .on('dragstart', (name) => {
        self.dragSuccess(this, d3.event, name);
      })
      ;

    enter.select(st2Class('node-button-error', true))
      .on('dragstart', (name) => {
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
    let {scrollWidth: width, scrollHeight: height} = this.viewer.node();

    this.svg.attr('width', width);
    this.svg.attr('height', height - 6); // A number of pixels my browser is adding for no particular reason;

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

  // Event Handlers

  activateOverlay(element) {
    element.classList.add(st2Class('overlay', 'active'));
  }

  deactivateOverlay(element) {
    element.classList.remove(st2Class('overlay', 'active'));
  }

  dragOverOverlay(element, event) {
    let dt = event.dataTransfer;

    if (dt.effectAllowed === 'move') {
      event.preventDefault();
    }
  }

  dropOnOverlay(element, event) {
    let { name, offsetX, offsetY } = unpack(event.dataTransfer.getData('nodePack'))
      , {clientX: x, clientY: y} = event
      ;

    this.emit('move', name, x - offsetX, y - offsetY);
    this.deactivateOverlay(element);
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
      , {clientX: x, clientY: y} = event
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
