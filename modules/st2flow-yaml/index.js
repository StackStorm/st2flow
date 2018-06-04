// @flow

import type { TokenList } from './types';
import Reader from './reader';
import Writer from './writer';

import NestedSet from './nested-set';

export function read(yaml: string): TokenList {
  const reader = new Reader(yaml);
  const tokens = [];

  let token;
  do {
    token = reader.next();
    tokens.push(token);
  }
  while (token.type !== 'eof');

  return tokens;
}

export function readSet(yaml: string): NestedSet {
  return new NestedSet(read(yaml));
}

export function write(tokens: TokenList): string {
  const writer = new Writer();

  for (const token of tokens) {
    writer.write(token);
  }

  return writer.toString();
}
