'use strict';

let _ = require('lodash')
  , ace = require('brace')
  , EventEmitter = require('events').EventEmitter
  , mixin = require('mixin')
  ;

let canvas
  , graph
  , editor
  , intermediate
  ;

// Parser
// ------
{
  let dagreD3 = require('dagre-d3');

  class Node {
    constructor(graph, name) {
      this.name = name;

      this.graph = graph;
      this.graph.setNode(name, this);
    }

    select() {
      this.graph.select(this.name);
    }

    isSelected() {
      return this.graph.isSelected(this.name);
    }

    connectTo(target, type) {
      return this.graph.connect(this.name, target, type);
    }
  }

  class Graph extends mixin(dagreD3.graphlib.Graph, EventEmitter) {
    constructor() {
      super();

      this.setMaxListeners(0);
      this.setGraph({});

      this.notifyChange = _.debounce(() => this.emit('update', this), 0);
    }

    build(tasks) {
      this.reset();

      _.each(tasks, (task) => {
        let node = this.node(task.getProperty('name'));

        if (!node) {
          node = new Node(this, task.getProperty('name'));
        }

        if (task.getProperty('success')) {
          node.connectTo(task.getProperty('success'), 'success');
        }

        if (task.getProperty('error')) {
          node.connectTo(task.getProperty('error'), 'failure');
        }

        if (task.getProperty('complete')) {
          node.connectTo(task.getProperty('complete'), 'complete');
        }
      });

      this.notifyChange();
    }

    select(name) {
      this.__selected__ = name;
      this.emit('select', name);
    }
    get selected() {
      return this.node(this.__selected__);
    }
    isSelected(name) {
      return this.__selected__ === name;
    }

    connect(source, target, type='success') {
      let edge = this.edge(source, target);
      if (!edge) {
        this.setEdge(source, target, { type });
        this.notifyChange();
        return true;
      }
      return false;
    }

    reset() {
      _.each(this.nodes(), (v) => this.removeNode(v));
    }
  }

  graph = new Graph();
}

{
  let Intermediate = require('./lib/intermediate');

  intermediate = new Intermediate();
}

// Editor
// ------
{
  require('brace/mode/yaml');
  require('brace/theme/monokai');

  editor = ace.edit('editor');
  editor.getSession().setMode('ace/mode/yaml');
  editor.setTheme('ace/theme/monokai');
  editor.setHighlightActiveLine(false);

  editor.$blockScrolling = Infinity;
}


// Canvas
// ------
{
  let d3 = require('d3')
    , dagreD3 = require('dagre-d3')
    , intersectRect = require('dagre-d3/lib/intersect/intersect-rect')
    ;

  let render = dagreD3.render();

  let st2Class = (element) => `st2-viewer__${element}`;

  class Canvas extends EventEmitter {
    constructor() {
      super();

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
      try {
        render(this.element, this.graph);

        return true;
      } catch(e) {
        return false;
      }
    }

    createNodes(selection, g) {
      // Initialize selection with data set
      let svgNodes = selection.selectAll('.' + st2Class('node'))
        .data(g.nodes(), (v) => v)
        .classed('update', true);

      // Clean everything inside selection
      svgNodes.selectAll('*').remove();

      // For each new node added to the selection
      svgNodes.enter()
        .append('g')
          .attr('class', st2Class('node'))
          .style('opacity', 0)
          .on('click', (name) => {
            this.emit('node:select', name, d3.event);
          });

      // For every node currently in selection
      svgNodes.each(function(name) {
        let node = g.node(name),
            nodeGroup = d3.select(this);

        node.elem = this;

        let labelGroup = nodeGroup.append('g').attr('class', st2Class('node-label'));

        {
          // Set IDs
          if (node.id) { nodeGroup.attr('id', node.id); }
          if (node.labelId) { labelGroup.attr('id', node.labelId); }
        }

        {
          g.on('select', () => {
            let result = node.isSelected();
            nodeGroup.classed(st2Class('node--selected'), result);
          });
        }

        {
          // Add label
          let labelDom = labelGroup.append('g')
            , textNode = labelDom.append('text');

          textNode
            .append('tspan')
            .attr('xml:space', 'preserve')
            .attr('dy', '1em')
            .attr('x', '1')
            .text(node.name);

          textNode
            .attr('style', node.labelStyle);

          let labelBBox = labelDom.node().getBBox()
            , xMiddle = -labelBBox.width / 2
            , yMiddle = -labelBBox.height / 2
            ;

          labelDom.attr('transform', `translate(${xMiddle},${yMiddle})`);

        }

        let bbox = _.pick(labelGroup.node().getBBox(), 'width', 'height');

        {
          // Set class
          nodeGroup
            .attr('class', st2Class('node'));
        }

        (padding) => {
          // Add paddings
          let top = 0
            , right = 0
            , bottom = 0
            , left = 0
            ;

          if (_.isArray(padding)) {
            [top, right, bottom, left] = padding;
          } else if (_.isPlainObject(padding)) {
            ({top, left, bottom, right} = padding); // jshint ignore:line
          } else if (_.isString(padding)){
            let _padding = _.parseInt(padding);

            top = _padding;
            left = _padding;
            bottom = _padding;
            right = _padding;
          } else if (_.isNumber(padding)) {
            top = padding;
            left = padding;
            bottom = padding;
            right = padding;
          }

          bbox.width += left + right;
          bbox.height += top + bottom;

          let xNormOffset = (left - right) / 2
            , yNormOffset = (top - bottom) / 2
            ;

          labelGroup.attr('transform', `translate(${xNormOffset},${yNormOffset})`);
        }(7);

        {
          // Pick node shape
          let shapeSvg = nodeGroup.insert('rect', ':first-child')
            .attr('rx', 5)
            .attr('ry', 5)
            .attr('x', -bbox.width / 2)
            .attr('y', -bbox.height / 2)
            .attr('width', bbox.width)
            .attr('height', bbox.height);

          node.intersect = function(point) {
            return intersectRect(node, point);
          };

          shapeSvg
            .attr('style', node.style);

          let shapeBBox = shapeSvg.node().getBBox();
          node.width = shapeBBox.width;
          node.height = shapeBBox.height;
        }

      });

      // For every node removed from selection
      svgNodes.exit()
        .style('opacity', 0)
        .remove();

      return svgNodes;
    }

    createEdgePaths(selection, g, arrows) {
      let escapeId = (str) => str ? String(str).replace(/:/g, '\\:') : '';

      // Initialize selection with data set
      let svgPaths = selection.selectAll('.' + st2Class('edge'))
        .data(g.edges(), (e) => `${escapeId(e.v)}:${escapeId(e.w)}:${escapeId(e.name)}`);

      {
        // For each new edge added to the selection
        let svgPathsEnter = svgPaths.enter()
          .append('g')
            .attr('class', st2Class('edge'))
            .style('opacity', 0);

        // Add path
        svgPathsEnter.append('path')
          .attr('class', st2Class('edge-path'))
          .attr('d', function(e) {
            let edge = g.edge(e),
                sourceElem = g.node(e.v).elem,
                points = _.range(edge.points.length).map(function() {
                  let bbox = sourceElem.getBBox(),
                      matrix = sourceElem.getTransformToElement(sourceElem.ownerSVGElement)
                        .translate(bbox.width / 2, bbox.height / 2);
                  return { x: matrix.e, y: matrix.f };
                });

            let line = d3.svg.line()
              .x((d) => d.x)
              .y((d) => d.y);

            return line(points);
          });

        // Add resources block
        svgPathsEnter.append('defs');
      }

      {
        // For each edge removed from the selection
        let svgPathExit = svgPaths.exit();

        // Remove an edge
        svgPathExit
          .style('opacity', 0)
          .remove();

        // TODO: This very much looks like an artifact, either badly transferred from dagre-d3 or pending refactoring there. Figure out whether we have any use for that.
        svgPathExit.select('.' + st2Class('edge-path'))
          .attr('d', function(e) {
            let source = g.node(e.v);

            if (source) {
              let points = _.range(this.pathSegList.length).map(function() { return source; });

              let line = d3.svg.line()
                .x(function(d) { return d.x; })
                .y(function(d) { return d.y; });

              return line(points);
            } else {
              return d3.select(this).attr('d');
            }
          });
      }

      svgPaths
        .style('opacity', 1);

      {
        // For every edge currently in selection
        svgPaths.each(function(e) {
          let domEdge = d3.select(this);
          let edge = g.edge(e);
          edge.elem = this;

          if (edge.id) {
            domEdge.attr('id', edge.id);
          }

          domEdge
            .attr('class', st2Class('edge') + ' ' + st2Class(`edge--${edge.type}`));
        });
      }

      {
        // For every path
        svgPaths.selectAll('.' + st2Class('edge-path'))
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
                let edge = g.edge(e)
                  , tail = g.node(e.v)
                  , head = g.node(e.w)
                  , points = edge.points.slice(1, edge.points.length - 1);

                points.unshift(tail.intersect(points[0]));
                points.push(head.intersect(points[points.length - 1]));

                let line = d3.svg.line()
                  .x((d) => d.x)
                  .y((d) => d.y);

                return line(points);
              });
          });
      }

      {
        // Add arrow shape
        svgPaths.selectAll('defs *').remove();
        svgPaths.selectAll('defs')
          .each(function(e) {
            let edge = g.edge(e),
                arrowhead = arrows[edge.arrowhead];
            arrowhead(d3.select(this), edge.arrowheadId, edge, 'arrowhead');
          });
      }

      return svgPaths;
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

  canvas = new Canvas();
}

{
  let Range = require('./lib/range');

  let rename = function rename(name) {
    let task = intermediate.task(name)
      , sector = task.getSector('name')
      , range = new Range(sector.start.row, sector.start.column, sector.end.row, sector.end.column)
      ;

    editor.selection.setRange(range);
    editor.centerSelection();
    editor.focus();
  };

  canvas.on('node:select', function (name, event) {
    const SHIFT = 1
        , ALT = 2
        , CTRL = 4
        , META = 8
        ;

    let mode =
      event.shiftKey * SHIFT +
      event.altKey * ALT +
      event.ctrlKey * CTRL +
      event.metaKey * META;

    switch(mode) {
      case SHIFT:
        this.graph.selected.connectTo(name);
        break;
      case META:
        rename(name);
        break;
      default:
        this.graph.select(name);
    }
  });

  graph.on('update', (graph) => {
    canvas.draw(graph);
  });

  // TODO: re-enable back channel when parser is done
  // graph.on('update', (graph) => {
  //   editor.getSession().setValue(graph.serialize());
  // });

  editor.on('change', (delta) => {
    let str = editor.env.document.doc.getAllLines();

    intermediate.update(delta, str.join('\n'));
  });

  intermediate.on('parse', (tasks) => {
    graph.build(tasks);
  });

  let debugSectorMarkers = [];
  intermediate.on('parse', () => {
    {
      _.each(debugSectorMarkers, (marker) => {
        editor.session.removeMarker(marker);
      });
      debugSectorMarkers = [];
    }

    {
      intermediate.sectors.map((e) =>
        console.log(`[${e.start.row}, ${e.start.column}]->[${e.end.row}, ${e.end.column}]`)
      );

      console.log('---');
    }

    _.each(intermediate.sectors, (sector) => {
        let range, marker;

        range = new Range(sector.start.row, sector.start.column, sector.end.row, sector.end.column);
        marker = editor.session.addMarker(range, `st2-editor__active-${sector.type}`, 'text');
        debugSectorMarkers.push(marker);
      });
  });

  let selectMarker;

  graph.on('select', (taskName) => {
    let sector = _.find(intermediate.sectors, (e) => {
      return e.type === 'task' && e.task.getProperty('name') === taskName;
    });

    // Since we're using `fullLine` marker, remove the last (zero character long) line from range
    let range = new Range(sector.start.row, sector.start.column, sector.end.row - 1, Infinity);

    if (selectMarker) {
      editor.session.removeMarker(selectMarker);
    }

    selectMarker = editor.session.addMarker(range, 'st2-editor__active-task', 'fullLine');
  });

  editor.selection.on('changeCursor', () => {
    let { row, column } = editor.selection.getCursor()
      , range = new Range(row, column, row, column)
      , sectors = intermediate.search(range, ['task'])
      , sector = _.first(sectors)
      ;

    if (sector && sector.task) {
      graph.select(sector.task.getProperty('name'));
    }
  });

  editor.selection.on('changeSelection', (e, selection) => {
    let sectors = intermediate.search(selection.getRange())
      , types = _.groupBy(sectors, 'type');
    console.log('->', `Selected ${types.task ? types.task.length : 'no'} tasks ` +
                      `and ${types.name ? types.name.length : 'no'} names`);
  });

  intermediate.on('update', (sectors) => {
    let types = _.groupBy(sectors, 'type');
    console.log('->', `Updates ${types.task ? types.task.length : 'no'} tasks ` +
                      `and ${types.name ? types.name.length : 'no'} names`);
  });

  window.addEventListener('resize', () => {
    canvas.centerElement();
  });

  window.editor = editor;
}
