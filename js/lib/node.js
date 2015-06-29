'use strict';

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

module.exports = Node;
