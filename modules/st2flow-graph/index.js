import cytoscape from 'cytoscape';
import _ from 'lodash';

function edgeId(sourceId, destId) {
  return `${sourceId}_${destId}`;
}

function checkGroup(item, type) {
  const validTypes = [ 'nodes', 'edges' ];
  if (!validTypes.includes(type)) {
    throw 'Invalid type';
  }
  if (item.group() !== type) {
    throw `Not of type ${type}`;
  }
}

function updateElement(element, type, updates) {
  checkGroup(element, type);
  _.forEach(updates, (value, key) => {
    element.data(key, value);
    if (key === 'coords') {
      element.position('x', value.x);
      element.position('y', value.y);
      element.position('z', value.z);
    }
  });
}

function getEdge(transitionData, graph) {
  const source = graph.getElementById(transitionData.from.name);
  const dest = graph.getElementById(transitionData.to[0].name);
  const edge = graph.getElementById(edgeId(source.id(), dest.id()));
  checkGroup(edge, 'edges');

  return edge;
}

class Graph {
  constructor() {
    this.graph = cytoscape({ headless: true });
  }

  addTask(taskData) {
    this.graph.add({
      group: 'nodes',
      data: {
        id: taskData.name,
        ...taskData,
      },
      position: {
        x: taskData.coords.x,
        y: taskData.coords.y,
        z: taskData.coords.z,
      },
    });
  }

  updateTask(task, updates) {
    const element = this.graph.getElementById(task.name);
    updateElement(element, 'nodes', updates);
  }

  deleteTask(task) {
    const element = this.graph.getElementById(task.name);
    checkGroup(element, 'nodes');
    element.remove();
  }

  addTransition(transitionData) {
    const source = this.graph.getElementById(transitionData.from.name);
    const dest = this.graph.getElementById(transitionData.to[0].name);

    checkGroup(source, 'nodes');
    checkGroup(dest, 'nodes');

    if (!source || !dest) {
      throw 'Task not found';
    }

    this.graph.add({
      group: 'edges',
      data: {
        id: edgeId(source.id(), dest.id()),
        source: source.id(),
        target: dest.id(),
      },
    });
  }

  setTransitionProperty(transitionData, key, value) {
    const edge = getEdge(transitionData, this.graph);
    updateElement(edge, 'edges', { [key]: value });
  }

  deleteTransitionProperty(transitionData, key) {
    const edge = getEdge(transitionData, this.graph);
    edge.removeData(key);
  }

  deleteTransition(transitionData) {
    const edge = getEdge(transitionData, this.graph);
    edge.remove();
  }

  connections(sourceId) {
    const source = this.graph.getElementById(sourceId);
    checkGroup(source, 'nodes');

    return _.map(source.connectedEdges(), (edge) => {
      return edge.target().id(); 
    });
  }

  edges(sourceId) {
    const source = this.graph.getElementById(sourceId);
    checkGroup(source, 'nodes');

    return _.map(source.connectedEdges(), (edge) => {
      return edge.id(); 
    });
  }
}

export default Graph;
