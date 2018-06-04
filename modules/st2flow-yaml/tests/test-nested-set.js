import { expect } from 'chai';

import NestedSet from '../nested-set';

describe('st2flow-yaml: NestedSet', () => {

  describe('parses simple.yaml', () => {
    const set = new NestedSet([
      { start:   0, end:   5, level: 1, type: 'key', value: 'version', prefix: '', suffix: '' },
      { start:   5, end:   7, level: 2, type: 'token-separator', value: ':', prefix: '', suffix: '\n' },
      { start:   7, end:  14, level: 3, type: 'value', value: 1, valueMetadata: 'float--1', prefix: ' ', suffix: '\n' },
    ]);

    const version = set.get('version');
    expect(version).to.have.property('type', 'value');
    expect(version).to.have.property('value', 1);
  });

});
