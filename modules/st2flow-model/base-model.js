// @flow

import BaseClass from './base-class';

/**
 * The BaseModel class is intended to be extended by the primary models:
 * Orquesta, Mistra, ActionChain
 *
 * This is based on the server model:
 * https://github.com/StackStorm/orquesta/tree/master/orquesta/specs
 */
class BaseModel extends BaseClass {
  get name() {
    return this.get('name');
  }

  get version() {
    return this.get('version');
  }

  get description() {
    return this.get('description');
  }

  get tags() {
    return this.get('tags');
  }
}

export default BaseModel;
