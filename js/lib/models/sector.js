import Range from '../util/range';

export default class Sector extends Range {
  setType(type) {
    this.type = type;

    return this;
  }

  setTask(ref) {
    this.task = ref;

    return this;
  }
}