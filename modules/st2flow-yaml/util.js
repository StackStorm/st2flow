// @flow

// Some lodashy functions without all the dashy

function pick(obj, ...keys) {
  return keys.reduce((o, key) => {
    o[key] = obj[key];
    return o;
  }, {});
}

function omit(obj, ...keys) {
  return Object.keys(obj).reduce((o, key) => {
    if (!keys.includes(key)) {
      o[key] = obj[key];
    }
    return o;
  }, {});
}

// TODO: support keys with dots
function get(obj, dotKey: string | Array) {
  if (typeof dotKey === 'string') {
    dotKey = dotKey.split('.');
  }

  return dotKey.reduce((o, key) => o[key], obj);
}

export {
  pick,
  omit,
  get,
};
