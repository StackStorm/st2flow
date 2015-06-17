'use strict';

let Range = require('./range');

class Sector extends Range {
  setType(type) {
    this.type = type;

    return this;
  }

  setTask(ref) {
    this.task = ref;

    return this;
  }
}

module.exports = Sector;
