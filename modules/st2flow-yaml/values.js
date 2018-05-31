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
    value: (input: string): { value: null, metadata: any } => ({
      value: null,
      metadata: getCase(input),
    }) },
  {
    test: /^(nan|NaN|NAN)$/,
    value: (input: string): { value: null, metadata: any } => ({
      value: null,
      metadata: getCase(input),
    }) },
  {
    test: /^(true|True|TRUE)$/,
    value: (input: string): { value: bool, metadata: any } => ({
      value: true,
      metadata: getCase(input),
    }) },
  {
    test: /^(false|False|FALSE)$/,
    value: (input: string): { value: bool, metadata: any } => ({
      value: false,
      metadata: getCase(input),
    }) },
  {
    test: /^([-+]?[0-9]+)$/,
    value: (_, input: string): { value: number, metadata: any } => ({
      value: parseInt(input, 10),
      metadata: null,
    }) },
  {
    test: /^0o([0-7]+)$/,
    value: (_, input: string): { value: number, metadata: any } => ({
      value: parseInt(input, 8),
      metadata: null,
    }) },
  {
    test: /^0x([0-9a-fA-F]+)$/,
    value: (_, input: string): { value: number, metadata: any } => ({
      value: parseInt(input, 16),
      metadata: null,
    }) },
  {
    test: /^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/,
    value: (input: string): { value: number, metadata: any } => ({
      value: parseFloat(input),
      metadata: null,
    }) },
  {
    test: /^[-+]?(\.inf|\.Inf|\.INF)$/,
    value: (input: string): { value: number, metadata: any } => ({
      value: input[0] === '-' ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      metadata: getCase(input.slice(-3)),
    }) },
];

export function parseValue(token: string): { value: Value, metadata: any } {
  for (const { test, value } of valueParsers) {
    const match = token.match(test);
    if (match) {
      return value(...match);
    }
  }

  return { value: token, metadata: null };
}

export function stringifyValue(value: Value, metadata: any): string {
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

  return toString(value);
}
