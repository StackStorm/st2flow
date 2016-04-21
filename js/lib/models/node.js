import { EventEmitter } from 'events';
import 'object.observe';

import intersectRect from '../util/intersect-rect';

export default class Node extends EventEmitter {
  constructor(graph, name) {
    super();

    this.name = name;

    this.graph = graph;
    this.graph.setNode(name, this);

    Object.observe(this, changes => {
      this.emit('change', changes);
    });
  }

  width = 210
  height = 52

  select() {
    this.graph.select(this.name);
  }

  isSelected() {
    return this.graph.isSelected(this.name);
  }

  connectTo(target, type) {
    return this.graph.connect(this.name, target, type);
  }

  get center() {
    return {
      x: this.x + (this.width / 2),
      y: this.y + (this.height / 2),
      width: this.width,
      height: this.height
    };
  }

  intersect(node) {
    return intersectRect(this.center, node.center);
  }
}
