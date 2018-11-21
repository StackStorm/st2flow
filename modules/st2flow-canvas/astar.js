// This code is derived from javascript-astar 0.4.1
// http://github.com/bgrins/javascript-astar
// Copyright (c) Brian Grinstead, http://briangrinstead.com, licensed MIT
// Includes Binary Heap (with modifications) from Marijn Haverbeke.
// http://eloquentjavascript.net/appendix2.html

function pathTo(node) {
  let curr = node;
  const path = [];
  while (curr.parent) {
    path.unshift(curr);
    curr = curr.parent;
  }
  return path;
}

function getHeap() {
  return new BinaryHeap((node) => {
    return node.f;
  });
}


/* entries in the priority queue have form (v, D, lv, bv, p, cv) where v is the
node in the orthogonal visibility graph, D is the “direction of entry” to the node,
6
lv is the length of the partial path from s to v and bv the number of bends in
the partial path, p a pointer to the parent entry (so that the final path can be
reconstructed), and cv the cost of the partial path. There is at most one entry
popped from the queue for each (v, D) pair. When an entry (v, D, lv, bv, p, cv)
is scheduled for addition to the priority queue, it is only added if no entry with
the same (v, D) pair has been removed from the queue, i.e. is on the closed list.
And only the entry with lowest cost for each (v, D) pair is kept on the priority
queue.
When we remove entry (v, D, lv, bv, p, cv) from the priority queue we
1. add the neighbour (v0, D) in the same direction with priority
    f(lv+||(v, v0)||1+||(v0, d)||1, sv + sd);
2. add the neighbours (v0, right(D)) and (v0, left(D)) at right angles to the entry
  with priority f(lv + ||(v, v0)||1 + ||(v0, d)||1, sv + 1 + sd);
*/


export const astar = {
  /**
  * Perform an A* Search on a graph given a start and end node.
  * @param {Array} graph
  * @param {GridNode} start
  * @param {GridNode} end
  * @param {Object} [options]
  * @param {bool} [options.closest] Specifies whether to return the
             path to the closest node if the target is unreachable.
  * @param {Function} [options.heuristic] Heuristic function (see
  *          astar.heuristics).
  */
  search: function(
    vertices: Array<{x: number, y: number}>,
    edges: { [string]: Array<{x: number, y: number}> },
    _start: {x: number, y: number},
    _end: {x: number, y: number}) {
    const graph = new Graph(vertices, edges);
    const start = graph.nodes[`${_start.x}|${_start.y}`];
    const end = graph.nodes[`${_end.x}|${_end.y}`];

    const heuristic = astar.heuristic;

    const openHeap = getHeap();

    start.h = heuristic(start, end);

    openHeap.push(start);

    while (openHeap.size() > 0) {

      // Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
      const currentNode = openHeap.pop();

      // End case -- result has been found, return the traced path.
      if (currentNode === end) {
        return pathTo(currentNode);
      }

      // Normal case -- move currentNode from open to closed, process each of its neighbors.
      currentNode.closed = true;

      // Find all neighbors for the current node.
      const neighbors = graph.neighbors(currentNode);

      for (let i = 0, il = neighbors.length; i < il; ++i) {
        const neighbor = neighbors[i];

        if (neighbor.closed || neighbor.isWall()) {
          // Not a valid node to process, skip to next neighbor.
          continue;
        }

        // The g score is the shortest distance from start to current node.
        // We need to check if the path we have arrived at this neighbor is the shortest one we have seen yet.
        const gScore = currentNode.g + neighbor.getCost(currentNode);
        const beenVisited = neighbor.visited;

        if (!beenVisited || gScore < neighbor.g) {

          // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
          neighbor.visited = true;
          neighbor.parent = currentNode;
          neighbor.h = neighbor.h || heuristic(neighbor, end);
          neighbor.g = gScore;
          neighbor.f = neighbor.g + neighbor.h;
          graph.markDirty(neighbor);

          if (!beenVisited) {
            // Pushing to heap will put it in proper place based on the 'f' value.
            openHeap.push(neighbor);
          }
          else {
            // Already seen the node, but since it has been rescored we need to reorder it in the heap
            openHeap.rescoreElement(neighbor);
          }
        }
      }
    }

    // No result was found, else would have returned in line 79
    //  - empty array signifies failure to find path.
    return [];
  },
  // See list of heuristics: http://theory.stanford.edu/~amitp/GameProgramming/Heuristics.html
  heuristic: function(pos0, pos1) {
    const d1 = Math.abs(pos1.x - pos0.x);
    const d2 = Math.abs(pos1.y - pos0.y);
    return d1 + d2;
  },
  cleanNode: function(node) {
    node.f = 0;
    node.g = 0;
    node.h = 0;
    node.visited = false;
    node.closed = false;
    node.parent = null;
  },
};


export class Graph {
  nodes: {[string]: GridNode};  // map x|y coords to GridNodes
  grid: {[string]: Array<string>} = {}; // map x|y coords to nearest-neighbor x|y coords
  dirtyNodes: Array<GridNode> = []; // hold nodes which are dirty

  constructor(vertices: Array<{x: number, y: number}>, edges: { [string]: Array<{x: number, y: number}> }) {
    this.nodes = vertices.reduce((nodes, v) => {
      const gn = new GridNode(v.x, v.y, 1);
      this.grid[gn.toString()] = edges[gn.toString()].map(({x, y}) => `${x}|${y}`);

      nodes[gn.toString()] = gn;
      return nodes;
    }, {});
    this.init();
  }
  init() {
    this.dirtyNodes = [];
    const keys = Object.keys(this.nodes);
    for (let i = 0; i < keys.length; i++) {
      astar.cleanNode(this.nodes[keys[i]]);
    }
  }

  cleanDirty() {
    for (let i = 0; i < this.dirtyNodes.length; i++) {
      astar.cleanNode(this.dirtyNodes[i]);
    }
    this.dirtyNodes = [];
  }

  markDirty(node: GridNode) {
    this.dirtyNodes.push(node);
  }

  neighbors(node: GridNode) {
    return this.grid[node.toString()].map(vStr => this.nodes[vStr]).filter(node => node);
  }
}


export class GridNode {
  // grid coordinates
  x: number;
  y: number;
  // weight of node itself
  weight: number;
  // calculated forms
  f: number = 0;
  g: number = 0; // cost of node plus cost of parent
  h: number = 0;
  // traversal state
  visited: boolean = false;
  closed: boolean = false;
  parent: GridNode = null;

  constructor(x, y, weight) {
    this.x = x;
    this.y = y;
    this.weight = weight;
  }

  toString(): string {
    return `${this.x}|${this.y}`;
  }

  getCost(fromNeighbor: GridNode): number {
    // Take diagonal weight into consideration.
    if (fromNeighbor && fromNeighbor.x !== this.x && fromNeighbor.y !== this.y) {
      return this.weight * 1.41421;
    }
    return this.weight;
  }

  isWall(): boolean {
    return this.weight === 0;
  }
}

class BinaryHeap {
  scoreFunction: Function;
  content: Array<GridNode>;

  constructor(scoreFunction: Function) {
    this.content = [];
    this.scoreFunction = scoreFunction;
  }

  push(element: GridNode) {
    // Add the new element to the end of the array.
    this.content.push(element);

    // Allow it to sink down.
    this.sinkDown(this.content.length - 1);
  }
  pop(): GridNode {
    // Store the first element so we can return it later.
    const result = this.content[0];
    // Get the element at the end of the array.
    const end = this.content.pop();
    // If there are any elements left, put the end element at the
    // start, and let it bubble up.
    if (this.content.length > 0) {
      this.content[0] = end;
      this.bubbleUp(0);
    }
    return result;
  }
  remove(node: GridNode) {
    const i = this.content.indexOf(node);

    // When it is found, the process seen in 'pop' is repeated
    // to fill up the hole.
    const end = this.content.pop();

    if (i !== this.content.length - 1) {
      this.content[i] = end;

      if (this.scoreFunction(end) < this.scoreFunction(node)) {
        this.sinkDown(i);
      }
      else {
        this.bubbleUp(i);
      }
    }
  }
  size(): number {
    return this.content.length;
  }
  rescoreElement(node: GridNode) {
    this.sinkDown(this.content.indexOf(node));
  }
  sinkDown(n: number) {
    // Fetch the element that has to be sunk.
    const element = this.content[n];

    // When at 0, an element can not sink any further.
    while (n > 0) {

      // Compute the parent element's index, and fetch it.
      const parentN = ((n + 1) >> 1) - 1; //eslint-disable-line no-bitwise
      const parent = this.content[parentN];
      // Swap the elements if the parent is greater.
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        // Update 'n' to continue at the new position.
        n = parentN;
      }
      // Found a parent that is less, no need to sink any further.
      else {
        break;
      }
    }
  }
  bubbleUp(n: number) {
    // Look up the target element and its score.
    const length = this.content.length;
    const element = this.content[n];
    const elemScore = this.scoreFunction(element);

    // This is used to store the new position of the element, if any.
    let swap = null;
    do {
      swap = null;
      // Compute the indices of the child elements.
      const child2N = (n + 1) << 1; //eslint-disable-line no-bitwise
      const child1N = child2N - 1;
      // If the first child exists (is inside the array)...
      let child1Score;
      if (child1N < length) {
        // Look it up and compute its score.
        const child1 = this.content[child1N];
        child1Score = this.scoreFunction(child1);

        // If the score is less than our element's, we need to swap.
        if (child1Score < elemScore) {
          swap = child1N;
        }
      }

      // Do the same checks for the other child.
      if (child2N < length) {
        const child2 = this.content[child2N];
        const child2Score = this.scoreFunction(child2);
        if (child2Score < (swap === null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      // If the element needs to be moved, swap it, and continue.
      if (swap !== null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
    } while(swap !== null);
  }
}

export default astar;
