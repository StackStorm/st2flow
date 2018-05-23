// @flow

import type { NodeList, Line } from './interfaces';
// import { RootNode, ScalarNode, SequenceNode, MappingNode } from './nodes';
import * as matchers from './matchers';

import type { Node, JSONable } from './interfaces';
class TempNode implements Node {
  prefix: string;
  children: NodeList;

  line: string;

  constructor(meta: Object, data: Object) {
    this.prefix = meta.prefix;
    this.line = data.line;
    this.children = [];
  }

  toJSON(): JSONable {
    return { line: this.line };
  }

  toYAML(): string {
    return `##${this.line}##`;
  }

  toDebug(): string {
    if (this.children.length) {
      // $FlowFixMe
      return `${this.line}\n${this.children.map(child => child.toDebug().split('\n').map(v => `. ${v}`).join('\n')).join('\n')}`;
    }

    return this.line;
  }
}

export default function parse(input: string): Node {
  const root = new TempNode({ prefix: '' }, { line: '!' });
  const ancestors = [ root ];
  let node = root;

  const lines = input.split(/\n|\r\n/);
  for (const line of lines) {
    if (!line.trim()) {
      node = new TempNode({ prefix: node.prefix }, { line });
      ancestors[ancestors.length - 1].children.push(node);
      continue;
    }

    const { meta, data } = parseLine(line);
    const prefix = meta.prefix;

    if (prefix !== node.prefix) {
      if (prefix.startsWith(node.prefix)) {
        // set current node as last parent
        ancestors.push(node);
      }
      else {
        // roll back till previous sibling

        do {
          node = ancestors.pop();
        }
        while(node.prefix !== prefix);
      }
    }

    // create new sibling node
    node = new TempNode(meta, data);
    ancestors[ancestors.length - 1].children.push(node);
  }

  return root;
}

const processors = [
  { regex: /(.*)/, process(line) {
    return {
      line: line.trim(),
    };
  } },
];

export function parseLine(input: string): Line {
  const match = input.match(matchers.whitespaced);
  if (!match) {
    throw new Error(`unparsable line: ${input}`);
  }

  const [ , prefix, remainder ] = match;

  for (const { regex, process } of processors) {
    const match = remainder.match(regex);
    if (match) {
      return {
        meta: {
          prefix,
        },
        data: process(...match.slice(1)),
      };
    }
  }

  throw new Error(`unparsable line: ${input}`);
}
