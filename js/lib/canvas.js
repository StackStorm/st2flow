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
  <div class='${st2Class('node-name')}'>${node.name}</div>
  <div class='${st2Class('node-ref')}'>${node.ref}</div>
`;

class Canvas extends EventEmitter {
  constructor() {
    super();

    this.canvas = d3
      .select('#canvas')
      ;

    this.overlay = this.canvas
      .append('div')
      .classed(st2Class('overlay'), true);

    this.svg = d3
      .select('#canvas svg');

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

  createNodes(selection, g) {
    let nodes = selection
      .selectAll(st2Class('node', true))
      .data(g.nodes(), (v) => v)
      ;

    nodes.enter()
      .append('div')
        .attr('class', st2Class('node'))
        .html((d) => nodeTmpl(g.node(d)))
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
    let {scrollWidth: width, scrollHeight: height} = this.canvas.node();

    this.svg.attr('width', width);
    this.svg.attr('height', height);

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
}

module.exports = Canvas;
