// @flow

import BaseClass from './base-class';
import schema from './schemas/metadata.json';

class MetaModel extends BaseClass {
  constructor(yaml: ?string) {
    super(schema, yaml);
  }

  static minimum = 'pack: default\nenabled: true\n';

  get name(): string {
    return this.get('name');
  }

  get description(): string {
    return this.get('description');
  }

  get enabled(): string {
    return this.get('enabled');
  }

  get entry_point(): string {
    return this.get('entry_point');
  }

  get pack(): string {
    return this.get('pack');
  }

  get runner_type(): string {
    return this.get('runner_type');
  }

  get parameters(): Object {
    return this.get('parameters');
  }
}

export default MetaModel;
