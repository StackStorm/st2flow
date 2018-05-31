// @flow

import type { Value } from './types';
const toString = String;

function getCase(input: string): string {
  if (input.toLowerCase() === input) {
    return 'lower';
  }

  if (input.toUpperCase() === input) {
    return 'upper';
  }

  return 'title';
}

const valueParsers = [
  {
    test: /^(null|Null|NULL|~|)$/,
    value: (input: string): { value: null, metadata: string } => ({
      value: null,
      metadata: input.length > 1 ? getCase(input) : input,
    }) },
  {
    test: /^(nan|NaN|NAN)$/,
    value: (input: string): { value: null, metadata: string } => ({
      value: null,
      metadata: getCase(input),
    }) },
  {
    test: /^(true|True|TRUE)$/,
    value: (input: string): { value: bool, metadata: string } => ({
      value: true,
      metadata: getCase(input),
    }) },
  {
    test: /^(false|False|FALSE)$/,
    value: (input: string): { value: bool, metadata: string } => ({
      value: false,
      metadata: getCase(input),
    }) },
  {
    test: /^([-+]?[0-9]+)$/,
    value: (_, input: string): { value: number, metadata: string } => ({
      value: parseInt(input, 10),
      metadata: `base-10-${input.length}`,
    }) },
  {
    test: /^0o([0-7]+)$/,
    value: (_, input: string): { value: number, metadata: string } => ({
      value: parseInt(input, 8),
      metadata: `base-8-${input.length}`,
    }) },
  {
    test: /^0x([0-9a-fA-F]+)$/,
    value: (_, input: string): { value: number, metadata: string } => ({
      value: parseInt(input, 16),
      metadata: `base-16-${input.toLowerCase() === input ? 'lower' : 'upper'}-${input.length}`,
    }) },
  {
    test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)([eE][-+]?[0-9]+)?$/,
    value: (input: string, exp: string): { value: number, metadata: string } => ({
      value: parseFloat(input),
      metadata: `float-${exp}`,
    }) },
  {
    test: /^[-+]?(\.inf|\.Inf|\.INF)$/,
    value: (input: string): { value: number, metadata: string } => ({
      value: input[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      metadata: getCase(input.slice(-3)),
    }) },
];

const integerPrefixes = {
  '8' : '0o',
  '16': '0x',
};

export function parseValue(token: string): { value: Value, metadata: string } {
  for (const { test, value } of valueParsers) {
    const match = token.match(test);
    if (match) {
      return value(...match);
    }
  }

  return { value: token, metadata: '' };
}

export function stringifyValue(value: Value, metadata: string): string {
  if (value === null) {
    if (metadata === '~' || metadata === '') {
      return metadata;
    }
  }

  if (metadata === 'lower') {
    return toString(value).toLowerCase();
  }

  if (metadata === 'upper') {
    return toString(value).toUpperCase();
  }

  if (metadata === 'title') {
    return toString(value).replace(/\w\S*/g, (word) => {
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  const baseTest = metadata.match(/^base-([0-9]+)(-.+)?$/);
  if (baseTest) {
    const base = parseInt(baseTest[1]);
    const options = baseTest[2];

    const prefix = integerPrefixes[base] || '';
    let output = value.toString(base);

    if (options) {
      if (options.includes('-upper-')) {
        output = output.toUpperCase();
      }
      if (options.includes('-lower-')) {
        output = output.toLowerCase();
      }

      const lengthTest = options.match(/-([0-9]+)$/);
      if (lengthTest) {
        const length = parseInt(lengthTest[1]);

        while (output.length < length) {
          output = `0${output}`;
        }
      }
    }

    return `${prefix}${output}`;
  }

  const float = metadata.match(/^float-(?:e([-+]?[0-9]+))?$/);
  if (float) {
    const points = parseInt(float[1]);
    return `${(value / Math.pow(10, points)).toString(10)}e${float[1]}`;
  }

  if (typeof value === 'string' && value.includes('\\')) { // has escape sequence
    return `"${value.replace(/"/g, '\\"')}"`;
  }

  return toString(value);
}
