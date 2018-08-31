// @flow

import type { Value } from './types';

const toString = String;
const integerPrefixes = {
  '8' : '0o',
  '16': '0x',
};

function stringifyValue(value: Value, metadata: string): string {
  if (typeof metadata === 'undefined') {
    return value;
  }

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

  const multilineLiteral = metadata.match(/^multiline-literal-(\s+)$/);
  if (multilineLiteral) {
    const prefix = multilineLiteral[1];

    return `|\n${value.split('\n').map(v => `${prefix}${v}`).join('\n')}`;
  }

  const multilineFolded = metadata.match(/^multiline-folded-([0-9]+)-(\s+)$/);
  if (multilineFolded) {
    const length = parseInt(multilineFolded[1]);
    const prefix = multilineFolded[2];
    const lines = [];

    let index = -1;
    while (index < value.length) {
      const next = value.lastIndexOf(' ', index + 1 + length);
      if (next === -1 || next === index || index + length > value.length) {
        lines.push(`${prefix}${value.slice(index + 1)}`);
        index = value.length;
      }
      else {
        lines.push(`${prefix}${value.slice(index + 1, next)}`);
        index = next;
      }
    }

    return `>\n${lines.join('\n')}`;
  }

  const integerTest = metadata.match(/^integer-([0-9]+)(-.+)?$/);
  if (integerTest) {
    const integer = parseInt(integerTest[1]);
    const options = integerTest[2];

    const prefix = integerPrefixes[integer] || '';
    let output = value.toString(integer);

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

  const float = metadata.match(/^float-(?:e([-+]?[0-9]+))?-([0-9]+)$/);
  if (float) {
    const points = parseInt(float[2]);

    const pow10 = parseInt(float[1]);
    if (pow10) {
      return `${(value / Math.pow(10, pow10)).toFixed(points)}e${float[1]}`;
    }

    return value.toFixed(points);
  }

  if (typeof value === 'string' && value.includes('\\') || value.includes('\n')) {
    return JSON.stringify(value).replace(/\\\\/g, '\\');
  }

  return toString(value);
}

export default stringifyValue;
