// @flow

import type { TokenRawValue, TokenKeyValue, TokenMapping, TokenCollection, TokenReference } from './types';
import { load } from 'yaml-ast-parser';
import { pick, omit } from './util';

const REG_CARRIAGE = /\r/g;
const REG_NEWLINE = /\n/;
const REG_TAG = /\s!!?[\w]*\s/;
const REG_BOOL_TRUE = /^(?:y(?:es)?|on)$/i; // y yes on
const REG_BOOL_FALSE = /^(?:no?|off)$/i; // y yes on
const REG_FORMATTED_NUMBER = /^[+-]?[\d,_]*(?:\.[\d]*)?(?:e[+-]?\d+)?$/;
const OMIT_FIELDS = [ 'errors', 'parent', 'mappings', 'items' ];

class TokenSet {
  yaml: string;                 // The full YAML file
  head: string;                 // Content before the first token
  tail: string;                 // Content after the last token
  tree: TokenMapping;           // All of the parsed tokens
  lastToken: TokenRawValue;     // The last "value" token (kind: 0) that was processed
  anchors: Object;              // Map of anchor IDs to the original token

  constructor(yaml: string) {
    this.parseYaml(yaml);
  }

  parseYaml(yaml: string) {
    this.yaml = yaml.replace(REG_CARRIAGE, '');

    const rootNode = load(this.yaml);
    if (rootNode.kind !== 2) {
      // YAML can be a simple scalar (kind: 0), mapping (kind: 2), or collection (kind: 3)
      // However, we demand all YAML files to be a mapping
      throw new Error('Invalid root node kind - must be a mapping');
    }

    this.anchors = {};
    this.tree = this.parseNode(rootNode);
    this.head = this.yaml.slice(0, this.tree.startPosition);
    this.tail = this.yaml.slice(this.lastToken.endPosition);
    // console.log(JSON.stringify(this.tree, null, '  '));
  }

  parseNode(node: Object, jpath = []) {
    if(node === null || typeof node === 'undefined') {
      return null;
    }

    if(node.errors.length) {
      throw node.errors;
    }

    switch(node.kind) {
      case 0: { // scalar "value" token (no children)
        const token: TokenRawValue = omit(node, ...OMIT_FIELDS);
        const special = this.parseSpecial(token);

        token.jpath = jpath;
        token.prefix = this.parseExtra(token);
        token.rawValue = this.yaml.slice(token.startPosition, token.endPosition);

        if (special !== undefined) {
          token.valueObject = special;
        }

        if(token.anchorId) {
          this.anchors[token.anchorId] = token;
        }

        return token;
      }

      case 2: { // map (key value pairs)
        const token: TokenMapping = omit(node, ...OMIT_FIELDS);

        if(token.anchorId) {
          this.anchors[token.anchorId] = token;
        }

        token.mappings = node.mappings.map((mapping, i) =>
          this.parseMapping(mapping, jpath.concat('mappings', i))
        );

        return token;
      }

      case 3: { // collection
        const token: TokenCollection = omit(node, ...OMIT_FIELDS);

        token.items = node.items.map((item, i) => {
          return this.parseNode(item, jpath.concat('items', i));
        });

        return token;
      }

      case 4: { // reference
        const token: TokenReference = omit(node, 'value', ...OMIT_FIELDS);

        token.prefix = this.parseExtra(token);
        token.value = omit(this.anchors[token.referencesAnchor], ...OMIT_FIELDS);

        return token;
      }

      default:
        throw new Error(`Unexpected node kind ${node.kind}`);
    }
  }

  parseMapping(mapping: TokenKeyValue, jpath: Array = []): TokenKeyValue {
    if (mapping.errors.length) {
      throw mapping.errors;
    }

    if (mapping.kind !== 1) {
      throw new Error(`Unexpected mapping kind: ${mapping.kind}`);
    }

    if (mapping.key.errors.length) {
      throw mapping.key.errors;
    }

    const token: TokenKeyValue = pick(mapping, 'kind', 'startPosition', 'endPosition');

    switch(mapping.key.kind) {
      case 0:
      case 3:
        token.key = this.parseNode(mapping.key, jpath.concat('key'));
        token.value = this.parseNode(mapping.value, jpath.concat('value'));
        break;

      default:
        throw new Error(`Unexpected mapping key kind: ${mapping.key.kind}`);
    }

    return token;
  }

  /**
   * Parses the space between the last token and the next one.
   * This includes whitespace, comments, colons, and other
   * characters which are not part of the token value.
   */
  parseExtra(token: TokenRawValue): Array<TokenRawValue> {
    const prev = this.lastToken;
    this.lastToken = token;

    if (!prev) {
      return [];
    }

    let startIdx = prev.endPosition;
    const gap = this.yaml.slice(startIdx, token.startPosition);

    token.isTag = REG_TAG.test(gap);

    return gap.split(REG_NEWLINE).map((item, i) => ({
      kind: 0,
      value: item,
      rawValue: (i > 0 ? '\n' : '') + item,
      startPosition: startIdx,
      endPosition: (startIdx += item.length + (i > 0 ? 1 : 0)),
    }));
  }

  parseSpecial(token: TokenRawValue) {
    // Fix some types not handled by the parser
    if(!token.isTag && !token.hasOwnProperty('valueObject')) {
      if(REG_BOOL_TRUE.test(token.value)) {
        return true;
      }
      else if(REG_BOOL_FALSE.test(token.value)) {
        return false;
      }
      else if(REG_FORMATTED_NUMBER.test(token.value)) {
        return parseFloat(token.value.replace(/[,_]/g, ''));
      }
    }
    return undefined;
  }

  toYAML(): string {
    return this.head + this.stringifyToken(this.tree) + this.tail;
  }

  stringifyToken(token, str = ''): string {
    if(!token) {
      return str;
    }

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

  updateToken(jpath: Array, data: Object) {
    // const parent = get(this.tree, jpath.slice(0, -1).join('.'));
  }
}

export default TokenSet;
