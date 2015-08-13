const packs = {
  core: '/i/st2.svg',
  linux: '/i/tux.svg'
};

const TRANSPARENT_GIF =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export default function packIcon(node={}) {
  const pack = node.ref && node.ref.split('.')[0];

  return pack && packs[pack] || TRANSPARENT_GIF;
}
