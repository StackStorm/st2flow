// @flow

import type { Node } from './interfaces';
import parse from './parse';

export default class YamlAST {
  tree: Node

  constructor(yaml: string) {
    this.tree = parse(yaml);
  }

  toJSON(): Object {
    return {};
  }

  toYAML(): string {
    return '';
  }
}
