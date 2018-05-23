// @flow

import type { Node, NodeList, JSONable } from './interfaces';

export class ScalarNode implements Node {
  prefix: string;
  children: NodeList = [];

  toJSON(): string | number {
    return '';
  }

  toYAML(): string {
    return '';
  }
}

export class SequenceNode implements Node {
  prefix: string;
  children: NodeList = [];

  toJSON(): Array<JSONable> {
    return [];
  }

  toYAML(): string {
    return '';
  }
}

export class MappingNode implements Node {
  prefix: string;
  children: NodeList = [];

  toJSON(): {} {
    return {};
  }

  toYAML(): string {
    return '';
  }
}
