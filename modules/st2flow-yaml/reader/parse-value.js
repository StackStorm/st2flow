// @flow

import type { Value } from './types';

function getCase(input: string): string {
  if (input.toLowerCase() === input) {
    return 'lower';
  }

  if (input.toUpperCase() === input) {
    return 'upper';
  }

  return 'title';
}

function getWhitespace(input: string): string {
  const whitespace = input.match(/^(\s+)/);
  if (!whitespace) {
    throw new Error('must have leading whitespace');
  }

  return whitespace[0];
}

const valueParsers = [
  { // multiline literal
    test: /^(\|)\r?\n(.+)$/s,
    value: (_, token: string, input: string): { value: string, metadata: string } => {
      const prefix = getWhitespace(input);

      return {
        value: input.split('\n').map(l => l.slice(prefix.length)).join('\n'),
        metadata: `multiline-literal-${prefix}`,
      };
    },
  },
  { // multiline folded
    test: /^(>)\r?\n(.+)$/s,
    value: (_, token: string, input: string): { value: string, metadata: string } => {
      const prefix = getWhitespace(input);
      const lines = input.split('\n');

      return {
        value: input.split('\n').map(l => l.slice(prefix.length)).join(' '),
        metadata: `multiline-${token === '>' ? 'folded' : 'literal'}-${Math.max(...lines.map(v => v.length))}-${prefix}`,
      };
    },
  },
  { // null
    test: /^(null|Null|NULL|~|)$/,
    value: (input: string): { value: null, metadata: string } => ({
      value: null,
      metadata: input.length > 1 ? getCase(input) : input,
    }),
  },
  { // nan
    test: /^(nan|NaN|NAN)$/,
    value: (input: string): { value: null, metadata: string } => ({
      value: null,
      metadata: getCase(input),
    }),
  },
  { // infinity
    test: /^[-+]?(\.inf|\.Inf|\.INF)$/,
    value: (input: string): { value: number, metadata: string } => ({
      value: input[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      metadata: getCase(input.slice(-3)),
    }),
  },
  { // true
    test: /^(true|True|TRUE)$/,
    value: (input: string): { value: bool, metadata: string } => ({
      value: true,
      metadata: getCase(input),
    }),
  },
  { // false
    test: /^(false|False|FALSE)$/,
    value: (input: string): { value: bool, metadata: string } => ({
      value: false,
      metadata: getCase(input),
    }),
  },
  { // integer 10
    test: /^([-+]?[0-9]+)$/,
    value: (_, input: string): { value: number, metadata: string } => ({
      value: parseInt(input, 10),
      metadata: `integer-10-${input.length}`,
    }),
  },
  { // integer 8
    test: /^0o([0-7]+)$/,
    value: (_, input: string): { value: number, metadata: string } => ({
      value: parseInt(input, 8),
      metadata: `integer-8-${input.length}`,
    }),
  },
  { // integer 16
    test: /^0x([0-9a-fA-F]+)$/,
    value: (_, input: string): { value: number, metadata: string } => ({
      value: parseInt(input, 16),
      metadata: `integer-16-${input.toLowerCase() === input ? 'lower' : 'upper'}-${input.length}`,
    }),
  },
  { // float
    test: /^[-+]?(\.[0-9]+|[0-9]+(?:\.[0-9]*)?)([eE][-+]?[0-9]+)?$/,
    value: (input: string, value: string, exp: string): { value: number, metadata: string } => ({
      value: parseFloat(input),
      metadata: `float-${exp || ''}-${value.slice(value.indexOf('.') + 1).length}`,
    }),
  },
];

function parseValue(token: string): { value: Value, metadata: string } {
  for (const { test, value } of valueParsers) {
    const match = token.match(test);
    if (match) {
      return value(...match);
    }
  }

  return { value: token, metadata: '' };
}

export default parseValue;
