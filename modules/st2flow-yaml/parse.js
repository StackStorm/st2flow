// @flow

import type { Node } from './interfaces';
import { RootNode, WhitespaceNode /*, ScalarNode, SequenceNode, MappingNode */, TempNode } from './nodes';

export default function parse(input: string): Node {
  const root = new RootNode();
  const ancestors = [ root ];
  let curNode = root;

  const lines = input.split(/\n|\r\n/);
  for (const line of lines) {
    let previousNode = curNode;
    curNode = getNode(line);

    if (curNode instanceof WhitespaceNode) {
      curNode.meta.indent = previousNode.meta.indent;
      const parent = ancestors.length > 1 ? ancestors[ancestors.length - 2] : ancestors[ancestors.length - 1];
      parent.children.push(curNode);
      continue;
    }

    if (curNode.meta.indent !== previousNode.meta.indent) {
      if (curNode.meta.indent.startsWith(previousNode.meta.indent)) {
        // set old node as last parent
        ancestors.push(previousNode);
      }
      else {
        // roll back till previous sibling

        while(previousNode.meta.indent !== curNode.meta.indent) {
          previousNode = ancestors.pop();
        }
      }
    }

    ancestors[ancestors.length - 1].children.push(curNode);
  }

  return root;
}

const processors = [
  {
    test: (input) => input.match(/( *)(.*)/),
    make(_, indent, line) {
      return new TempNode({ indent }, line.trim());
    },
  },
];

export function getNode(input: string): Node {
  if (!input.trim()) {
    return new WhitespaceNode({ indent: '' }, input);
  }

  for (const { test, make } of processors) {
    const match = test(input);
    if (match) {
      return make(...match);
    }
  }

  throw new Error(`unparsable line: ${input}`);
}
