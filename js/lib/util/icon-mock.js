const packs = {
  core: '/i/st2.svg',
  linux: '/i/tux.svg'
};

export default function packIcon(node={}) {
  const pack = node.ref && node.ref.split('.')[0];

  return pack && packs[pack] || '';
}
