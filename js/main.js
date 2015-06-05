'use strict';

let _ = require('lodash');

let draw
  , parse;

// Parser
// ------
{
  let YAML = require('js-yaml')
    , dagreD3 = require('dagre-d3');

  parse = (data) => {
    let ast = YAML.safeLoad(data)
      , graph = new dagreD3.graphlib.Graph().setGraph({});

    if (ast.chain && ast.chain.length) {
      _.each(ast.chain, (node) => {
        graph.setNode(node.name, {
          label: node.name
        });

        if (node['on-success']) {
          graph.setEdge(node.name, node['on-success'], {
            type: 'success'
          });
        }

        if (node['on-failure']) {
          graph.setEdge(node.name, node['on-failure'], {
            type: 'failure'
          });
        }
      });
    }

    draw(graph);
  };
}

// Editor
// ------
{
  let ace = require('brace');
  require('brace/mode/yaml');
  require('brace/theme/monokai');

  let editor = ace.edit('editor');
  editor.getSession().setMode('ace/mode/yaml');
  editor.setTheme('ace/theme/monokai');

  editor.$blockScrolling = Infinity;

  window.editor = editor;

  editor.on("change", _.debounce(function () {
    var str = editor.env.document.doc.getAllLines();

    parse(str.join('\n'));
  }, 100));
}


// Canvas
// ------
{
  let d3 = require('d3')
    , dagre = require('dagre-d3').dagre;

  class Canvas {
    constructor() {
      this.svg = d3
        .select('#canvas svg');

      this.clear();
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

      // Temporary transformation to separate data from representation
      {
        _.each(this.graph.edges(), (e) => {
          let edge = this.graph.edge(e.v, e.w);

          edge.class = "st2-viewer__edge--" + edge.type;
        });
      }

      let ok = this.render();

      if (ok) {
        this.centerElement();
      }
    }

    render() {
      let createNodes = require("dagre-d3/lib/create-nodes")
        , createClusters = require("dagre-d3/lib/create-clusters")
        , createEdgeLabels = require("dagre-d3/lib/create-edge-labels")
        , createEdgePaths = require("dagre-d3/lib/create-edge-paths")
        , positionNodes = require("dagre-d3/lib/position-nodes")
        , positionEdgeLabels = require("dagre-d3/lib/position-edge-labels")
        , positionClusters = require("dagre-d3/lib/position-clusters")
        , shapes = require("dagre-d3/lib/shapes")
        , arrows = require("dagre-d3/lib/arrows")
        ;

      let createOrSelectGroup = function (root, name) {
        var selection = root.select("g." + name);
        if (selection.empty()) {
          selection = root.append("g").attr("class", name);
        }
        return selection;
      };

      var NODE_DEFAULT_ATTRS = {
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 10,
        paddingBottom: 10,
        rx: 0,
        ry: 0,
        shape: "rect"
      };

      var EDGE_DEFAULT_ATTRS = {
        arrowhead: "normal",
        lineInterpolate: "linear"
      };

      let svg = this.element
        , g = this.graph
        ;

      try {
        g.nodes().forEach(function(v) {
          var node = g.node(v);
          if (!_.has(node, "label") && !g.children(v).length) { node.label = v; }

          _.defaults(node, NODE_DEFAULT_ATTRS);

          _.each(["paddingLeft", "paddingRight", "paddingTop", "paddingBottom"], function(k) {
            node[k] = Number(node[k]);
          });
        });

        g.edges().forEach(function(e) {
          var edge = g.edge(e);
          if (!_.has(edge, "label")) { edge.label = ""; }
          _.defaults(edge, EDGE_DEFAULT_ATTRS);
        });

        let outputGroup = createOrSelectGroup(svg, "output")
          , clustersGroup = createOrSelectGroup(outputGroup, "clusters")
          , edgePathsGroup = createOrSelectGroup(outputGroup, "edgePaths")
          , edgeLabels = createEdgeLabels(createOrSelectGroup(outputGroup, "edgeLabels"), g)
          ;

        let nodes = createNodes(createOrSelectGroup(outputGroup, "nodes"), g, shapes)
          ;

        dagre.layout(g);

        positionNodes(nodes, g);
        positionEdgeLabels(edgeLabels, g);
        createEdgePaths(edgePathsGroup, g, arrows);

        var clusters = createClusters(clustersGroup, g);
        positionClusters(clusters, g);

        return true;
      } catch(e) {
        console.error(e);
        return false;
      }
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

  let canvas = new Canvas();

  draw = (graph) => {
    canvas.draw(graph);
  };

  window.addEventListener('resize', () => {
    canvas.centerElement();
  });
}
