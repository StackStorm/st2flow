import Vector from './vector';

export default function intersectRect(node, point) {
  var x = node.x;
  var y = node.y;

  // The algorithm below finds the point on the line connecting center of the node with the `point`,
  // which is the closest to the center of the rectangle yet lies outside the rectangle bounds.
  // The calculation is needed to make sure the arrow on the transition line points to the node 
  // instead of hiding behind it.
  var dx = point.x - x;
  var dy = point.y - y;
  var w = node.width / 2;
  var h = node.height / 2;

  var sx, sy;
  if (Math.abs(dy) * w > Math.abs(dx) * h) {
    // The line approaches the rectangle from tom or bottom
    if (dy < 0) {
      h = -h;
    }
    sx = dy === 0 ? 0 : h * dx / dy;
    sy = h;
  } else {
    // The line approaches the rectangle from left or right
    if (dx < 0) {
      w = -w;
    }
    sx = w;
    sy = dx === 0 ? 0 : w * dy / dx;
  }

  return new Vector(x + sx, y + sy);
}
