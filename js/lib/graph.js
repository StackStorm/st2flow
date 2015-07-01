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
    this.reset();

    _.each(tasks, (task) => {
      let node = this.node(task.getProperty('name'));

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
      return true;
    }
    return false;
  }

  reset() {
    _.each(this.nodes(), (v) => this.removeNode(v));
  }
}

module.exports = Graph;
