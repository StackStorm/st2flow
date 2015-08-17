import _ from 'lodash';
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

  _setSpecial(obj) {
    return _.assign(this, obj);
  }

  isUndefined() {
    return this.isStart() && this.isEnd();
  }
}
