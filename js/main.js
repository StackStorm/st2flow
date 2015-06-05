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
    , dagreD3 = require('dagre-d3');

  let render = dagreD3.render();

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

      try {
        render(this.element, this.graph);

        this.centerElement();
      } catch(e) {}
    }

    centerElement() {
      if (this.element) {
        let xCenterOffset = (this.svg[0][0].clientWidth - this.graph.graph().width) / 2;
        let yCenterOffset = (this.svg[0][0].clientHeight - this.graph.graph().height) / 2;
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
