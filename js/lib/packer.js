'use strict';

function pack(o) {
  return JSON.stringify(o);
}

function unpack(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return {};
  }
}

module.exports = { pack, unpack };
