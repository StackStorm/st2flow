import _ from 'lodash';

export default class Task {
  constructor() {
    this.properties = {};
    this.sectors = {};
  }

  isEmpty() {
    return _.isEmpty(this.properties);
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
  startSector(type, ...coords) {
    this.sectors[type].setStart(...coords);

    return this;
  }
  endSector(type, ...coords) {
    this.sectors[type].setEnd(...coords);

    return this;
  }
}
