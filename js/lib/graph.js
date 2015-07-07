'use strict';

let _ = require('lodash')
  , dagre = require('dagre')
  , EventEmitter = require('events').EventEmitter
  , mixin = require('mixin');

let Node = require('./node');

class Graph extends mixin(dagre.graphlib.Graph, EventEmitter) {
  constructor() {
    super();

    this.setMaxListeners(0);
    this.setGraph({});
  }

  build(tasks) {
    let nodes = this.nodes();

    _.each(tasks, (task) => {
      const name = task.getProperty('name');

      let node = this.node(name);

      _.remove(nodes, e => e === name);

      if (!node) {
        node = new Node(this, task.getProperty('name'));
      }

      node.ref = task.getProperty('ref');

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

    _.each(this.nodes(), name => {
      if (!this.node(name)) {
        this.removeNode(name);
      }
    });

    _.each(nodes, v => this.removeNode(v));
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

  connect(source, targets, type='success') {
    targets = [].concat(targets);

    _.each(this.successors(source), name => {
      if (this.edge(source, name).type === type) {
        this.removeEdge(source, name);
      }
    });

    _.each(targets, target => {
      this.setEdge(source, target, { type });
    });
  }

  reset() {
    _.each(this.nodes(), (v) => this.removeNode(v));
  }

  layout() {
    dagre.layout(this);
  }
}

module.exports = Graph;
