// @flow

import type { Node, NodeMeta, NodeList, JSONable } from './interfaces';

export class RootNode implements Node {
  meta: NodeMeta = { indent: '' };
  children: NodeList = [];

  toJSON(): string | number {
    return '';
  }

  toYAML(): string {
    return '';
  }

  toDebug(): string {
    function getDebug({ constructor: { name }, line, children }) {
      if (children.length) {
        return `${name}: ${line}\n${children.map((child) => {
          // $FlowFixMe
          return getDebug(child).split('\n').map(v => `. ${v}`).join('\n');
        }).join('\n')}`;
      }

      return `${name}: ${line}`;
    }

    // $FlowFixMe
    return getDebug({ constructor: { name: 'RootNode' }, line: 'RootNode', children: this.children });
  }
}

export class WhitespaceNode implements Node {
  meta: NodeMeta;
  children: NodeList = [];

  line: string;

  constructor(meta: Object, line: string) {
    this.meta = meta;
    this.line = line;
  }

  toJSON(): string | number {
    return '';
  }

  toYAML(): string {
    return '';
  }
}

export class ScalarNode implements Node {
  meta: NodeMeta;
  children: NodeList = [];

  toJSON(): string | number {
    return '';
  }

  toYAML(): string {
    return '';
  }
}

export class SequenceNode implements Node {
  meta: NodeMeta;
  children: NodeList = [];

  toJSON(): Array<JSONable> {
    return [];
  }

  toYAML(): string {
    return '';
  }
}

export class MappingNode implements Node {
  meta: NodeMeta;
  children: NodeList = [];

  toJSON(): {} {
    return {};
  }

  toYAML(): string {
    return '';
  }
}


export class TempNode implements Node {
  meta: NodeMeta;
  children: NodeList;

  line: string;

  constructor(meta: Object, line: string) {
    this.meta = meta;
    this.line = line;
    this.children = [];
  }

  toJSON(): JSONable {
    return { line: this.line };
  }

  toYAML(): string {
    return `##${this.line}##`;
  }
}
