import dagre from 'dagre';

export function layout(model) {
  const g = new dagre.graphlib.Graph();

  g.setGraph({});

  g.setDefaultEdgeLabel(() => ({}));

  model.tasks.forEach(task => {
    const { size } = task;
    g.setNode(task.name, { width: size.x, height: size.y });
  });

  model.transitions.forEach(transition => {
    const { from, to } = transition;

    g.setEdge(from.name, to.name);
  });

  dagre.layout(g);

  g.nodes().forEach(name => {
    const { x, y } = g.node(name);
    model.updateTask({ name }, { coords: { x, y }});
  });
}
