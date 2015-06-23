'use strict';

class Task {
  constructor() {
    this.properties = {};
    this.sectors = {};
  }

  getProperty(name) {
    return this.properties[name];
  }
  setProperty(name, value) {
    this.properties[name] = value;

    return this;
  }
  getSector(type) {
    return this.sectors[type];
  }
  setSector(type, sector) {
    this.sectors[type] = sector;

    return this;
  }
  endSector(type, ...coords) {
    this.sectors[type].setEnd(...coords);

    return this;
  }
}

module.exports = Task;
