export default class Arrow {
  static size = { x: 10, y: 16 }

  constructor(parent, id, edge, type) {
    const size = this.constructor.size;

    const marker = parent.append('marker')
      .attr('id', id)
      .attr('viewBox', `0 0 ${size.x} ${size.y}`)
      .attr('refX', 1)
      .attr('refY', size.y/2)
      .attr('markerUnits', 'userSpaceOnUse')
      .attr('markerWidth', size.x)
      .attr('markerHeight', size.y)
      .attr('orient', 'auto');

    marker.append('path')
      .attr('d', `M 0 0 L ${size.x} ${size.y/2} L 0 ${size.y} z`)
      .style('stroke-width', 1)
      .style('stroke-dasharray', '1,0')
      .attr('style', edge[type + 'Style']);
  }
}
