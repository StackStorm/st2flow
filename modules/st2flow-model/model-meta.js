// @flow

import BaseClass from './base-class';
import schema from './schemas/metadata.json';

class MetaModel extends BaseClass {
  constructor(yaml: ?string) {
    super(schema, yaml);
  }

  get name() {
    return this.get('name');
  }

  get description() {
    return this.get('description');
  }

  get enabled() {
    return this.get('enabled');
  }

  get entry_point() {
    return this.get('entry_point');
  }

  get pack() {
    return this.get('pack');
  }

  get runner_type() {
    return this.get('runner_type');
  }

  get parameters() {
    return this.get('parameters');
  }
}

export default MetaModel;
