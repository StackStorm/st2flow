// @flow

import type { TokenRawValue, TokenKeyValue, TokenMapping, TokenCollection, TokenReference } from './types';
import { load } from 'yaml-ast-parser';

const REG_NEWLINE = /\n/;
const OMIT_FIELDS = ['errors', 'parent', 'mappings', 'items'];

function pick(obj, ...keys) {
  return keys.reduce((o, key) => {
    o[key] = obj[key];
    return o;
  }, {});
}

function omit(obj, ...keys) {
  return Object.keys(obj).reduce((o, key) => {
    if (!keys.includes(key)) o[key] = obj[key];
    return o;
  }, {});
}

class TokenSet {
  yaml: string;                 // The full YAML file
  head: string;                 // Content before the first token
  tail: string;                 // Content after the last token
  tokens: TokenMapping;         // All of the parsed tokens
  lastToken: TokenRawValue;     // The last "value" token that was processed
  anchors: Object;              // Map of anchor IDs to the original token

  constructor(yaml: string) {
    this.parseYaml(yaml);
  }

  parseYaml(yaml: string) {
    this.yaml = yaml.replace(/\r/g, '');
    this.anchors = {};
    this.tokens = this.parseNode(load(this.yaml));
    this.head = this.yaml.slice(0, this.tokens.startPosition);
    this.tail = this.yaml.slice(this.lastToken.endPosition);
    // console.log(JSON.stringify(this.tokens, null, '  '));
  }

  parseNode(node: Object, jpath = []) {
    if(node === null || typeof node === 'undefined') return null;
    if(node.errors.length) throw node.errors;

    switch(node.kind) {
      case 0: { // simple "value" token (no children)
        const token: TokenRawValue = omit(node, ...OMIT_FIELDS);
        token.jpath = jpath;
        token.prefix = this.parseExtra(token);
        token.rawValue = this.yaml.slice(token.startPosition, token.endPosition);

        if(token.anchorId) this.anchors[token.anchorId] = token;
        this.lastToken = token;

        return token;
      }

      case 2: { // map (key value pairs)
        const token: TokenMapping = omit(node, ...OMIT_FIELDS);
        if(token.anchorId) this.anchors[token.anchorId] = token;
        token.mappings = node.mappings.map((mapping, i) =>
          this.parseMapping(mapping, jpath.concat('mappings', i))
        );

        return token;
      }

      case 3: { // collection
        const token: TokenCollection = omit(node, ...OMIT_FIELDS);
        token.items = node.items.map((item, i) => {
          if(!item) return null;
          return this.parseNode(item, jpath.concat('items', i))
        });

        return token;
      }

      case 4: { // reference
        const token: TokenReference = omit(node, 'value', ...OMIT_FIELDS);
        token.prefix = this.parseExtra(token);
        token.value = omit(this.anchors[token.referencesAnchor], ...OMIT_FIELDS);
        this.lastToken = token;

        return token;
      }

      default:
        throw new Error('Unexpected node kind' + node.kind)
    }
  }

  makeTokenFromNode(node, ...omitKeys) {
    const token = omit(node, ...omitKeys);
  }

  parseMapping(mapping: Object, jpath = []) {
    if (mapping.errors.length) throw mapping.errors;
    if (mapping.kind !== 1) throw new Error('Unexpected mapping kind', mapping)
    if (mapping.key.errors.length) throw mapping.key.errors;

    const token: TokenKeyValue = pick(mapping, 'kind', 'startPosition', 'endPosition');

    switch(mapping.key.kind) {
      case 0:
      case 3:
        token.key = this.parseNode(mapping.key, jpath.concat('key'));
        token.value = this.parseNode(mapping.value, jpath.concat('value'))
        break;

      default:
        throw new Error('Unexpected mapping key kind: ' + mapping.key.kind)
    }

    return token;
  }

  /**
   * Parses the space between the last token and the next one.
   * This includes whitespace, comments, colons, and other
   * characters which are not part of the token value.
   */
  parseExtra(token) {
    if (!this.lastToken) {
      return [];
    }

    let startIdx = this.lastToken.endPosition;
    const gap = this.yaml.slice(startIdx, token.startPosition);

    return gap.split(REG_NEWLINE).map((item, i) => ({
      kind: 0,
      value: item,
      rawValue: (i > 0 ? '\n' : '') + item,
      startPosition: startIdx,
      endPosition: (startIdx += item.length + (i > 0 ? 1 : 0))
    }));
  }

  toYAML() {
    return this.head + this.stringifyToken(this.tokens) + this.tail;
  }

  stringifyToken(token, str = '') {
    if(!token) return str;

    switch(token.kind) {
    case 0:
      token.prefix.forEach(pre => str += pre.rawValue);
      str += token.rawValue;
      break;

    case 1:
      str = this.stringifyToken(token.key, str);
      str = this.stringifyToken(token.value, str);
      break;

    case 2:
      str += token.mappings.reduce((s, t) => this.stringifyToken(t, s), '');
      break;

    case 3:
      str += token.items.reduce((s, t) => this.stringifyToken(t, s), '');
      break;

    case 4:
      token.prefix.forEach(pre => str += pre.rawValue);
      str += token.referencesAnchor;
      break;
    }

    return str;
  }
}

export default TokenSet;
