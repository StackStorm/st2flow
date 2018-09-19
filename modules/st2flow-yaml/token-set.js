// @flow

import type { TokenRawValue, TokenKeyValue, TokenMapping, TokenCollection, TokenReference, AnyToken } from './types';
import { load } from 'yaml-ast-parser';
import { pick, omit } from './util';
import Objectifier from './objectifier';
import perf from '@stackstorm/st2flow-perf';

const REG_CARRIAGE = /\r/g;
const REG_NEWLINE = /\n/;
const REG_TAG = /:\s+!!?[\w]*\s?/;
const REG_BOOL_TRUE = /^(?:y(?:es)?|on)$/i; // y yes on
const REG_BOOL_FALSE = /^(?:no?|off)$/i; // n no off
const REG_FORMATTED_NUMBER = /^[+-]?[\d,_]*(?:\.[\d]*)?(?:e[+-]?\d+)?$/;
const OMIT_FIELDS = [ 'errors', 'parent', 'mappings', 'items' ];

class TokenSet {
  yaml: string;                 // The full YAML file
  head: string;                 // Content before the first token
  tail: string;                 // Content after the last token
  tree: TokenMapping;           // All of the parsed tokens
  lastToken: TokenRawValue;     // The last "value" token (kind: 0) that was processed
  anchors: Object;              // Map of anchor IDs to the original token
  objectified: ?Object;         // POJO representation of the token tree

  constructor(yaml: string) {
    this.parseYAML(yaml);
  }

  parseYAML(yaml: string) {
    perf.start('parseYAML');

    this.yaml = yaml.replace(REG_CARRIAGE, '');

    const rootNode = load(this.yaml);
    if (!rootNode || rootNode.kind !== 2) {
      // YAML can be a simple scalar (kind: 0), mapping (kind: 2), or collection (kind: 3).
      // However, we demand all YAML files to be a mapping
      throw new Error(`Invalid root node kind (${rootNode && rootNode.kind}) - must be a mapping`);
    }

    this.anchors = {};
    this.objectified = null;
    this.tree = this.parseNode(rootNode);
    this.head = this.yaml.slice(0, this.tree.startPosition);
    this.tail = this.yaml.slice(this.lastToken.endPosition);
    perf.stop('parseYAML');
    // debug(JSON.stringify(this.tree, null, '  '));
  }

  parseNode(node: Object, jpath: Array<string | number> = [], isKey: boolean = false): AnyToken {
    if(node === null || typeof node === 'undefined') {
      return null;
    }

    if(node.errors.length) {
      throw node.errors;
    }

    switch(node.kind) {
      case 0: { // scalar "value" token (no children)
        const token: TokenRawValue = omit(node, ...OMIT_FIELDS);

        token.jpath = jpath;
        token.prefix = this.parsePrefix(token);
        token.rawValue = this.yaml.slice(token.startPosition, token.endPosition);

        // This MUST happen after parsePrefix
        if (!isKey) {
          const special = this.parseSpecialValue(token);
          if (special !== undefined) {
            token.valueObject = special;
          }
        }

        if(token.anchorId) {
          this.anchors[token.anchorId] = token;
        }

        return token;
      }

      case 2: { // map (key value pairs)
        const token: TokenMapping = omit(node, ...OMIT_FIELDS);

        token.jpath = jpath;

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

        token.jpath = jpath;
        token.items = node.items.map((item, i) => {
          return this.parseNode(item, jpath.concat('items', i));
        });

        return token;
      }

      case 4: { // reference
        const token: TokenReference = omit(node, 'value', ...OMIT_FIELDS);

        token.jpath = jpath;
        token.prefix = this.parsePrefix(token);
        token.value = omit(this.anchors[token.referencesAnchor], ...OMIT_FIELDS);

        return token;
      }

      default:
        throw new Error(`Unexpected node kind ${node.kind} at ${jpath.join('.')}`);
    }
  }

  parseMapping(kvToken: TokenKeyValue, jpath: Array<string | number> = []): TokenKeyValue {
    if (kvToken.errors.length) {
      throw kvToken.errors;
    }

    if (kvToken.kind !== 1) {
      throw new Error(`Unexpected kvToken kind: ${kvToken.kind}`);
    }

    if (kvToken.key.errors.length) {
      throw kvToken.key.errors;
    }

    // value can be null
    if (kvToken.value && kvToken.value.errors.length) {
      throw kvToken.value.errors;
    }

    const token: TokenKeyValue = pick(kvToken, 'kind', 'startPosition', 'endPosition');

    // Keys are normally scalar keys (foo: bar) but can an array
    // See test files for examples of multiline keys.
    switch(kvToken.key.kind) {
      case 0:
      case 3:
        token.jpath = jpath;
        token.key = this.parseNode(kvToken.key, jpath.concat('key'), true);
        token.value = this.parseNode(kvToken.value, jpath.concat('value'));
        break;

      default:
        throw new Error(`Unexpected kvToken key kind: ${kvToken.key.kind}`);
    }

    return token;
  }

  /**
   * Parses the space between the last token and the next one.
   * This includes whitespace, comments, colons, and other
   * characters which are not part of the token value.
   */
  parsePrefix(token: TokenRawValue): Array<TokenRawValue> {
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
    })).filter(item => !!item.rawValue);
  }

  /**
   * Parses special values that [appear to be] standard YAML but
   * not supported by the yaml-ast-parser for some reason.
   *   - If the value uses a !!tag, we ignore it.
   *   - If the value has the `valueObject` property, the parser
   *     already recognized it - no need to process it.
   */
  parseSpecialValue(token: TokenRawValue): ?boolean | ?number {
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

  createToken(data: any) {
    if(Array.isArray(data)) {
      return this.createCollectionToken(data);
    }

    if(Object.prototype.toString.call(data) === '[object Object]') {
      return this.createMappingToken(data);
    }

    if(data === null || typeof data === 'undefined') {
      data = null;
    }

    // Date, new String(), new Number(), et al
    if(typeof data === 'object') {
      return this.createRawValueToken(JSON.stringify(data), data);
    }

    return this.createRawValueToken(`${data}`, data);
  }

  /**
   * Given a value string, creates a raw value token (kind: 0)
   * The valObj is the object form of the value. This should be the
   * JS primitive/native form of the value (eg. dates, booleans, numbers, etc.)
   */
  createRawValueToken(val: string, valObj: any): TokenRawValue {
    const token: TokenRawValue = {
      kind: 0,
      value: val,
      rawValue: val,
      doubleQuoted: false,
      plainScalar: true,
      startPosition: 0,
      endPosition: val.length,
      prefix: [ /* keep this empty */ ],
    };

    if(typeof valObj !== 'undefined' && val !== valObj) {
      token.valueObject = valObj;
    }

    return token;
  }

  /**
   * Given a key and a value, creates a key/value token (kind: 1)
   * The value can be any type.
   */
  createKeyValueToken(key: string, val: any): TokenKeyValue {
    return {
      kind: 1,
      key: this.createToken(key),
      value: this.createToken(val),
    };
  }

  /**
   * Given a plain JS object, creates a mapping token (kind: 2)
   * The values can be a mix of types.
   */
  createMappingToken(data: Object): TokenMapping {
    const mappings = Object.keys(data).reduce((arr, key) => {
      arr.push(this.createKeyValueToken(key, data[key]));
      return arr;
    }, []);

    return {
      kind: 2,
      mappings,
    };
  }

  /**
   * Given an array of values, creates a collection token (kind: 3).
   * The data can be a mix of types of values.
   */
  createCollectionToken(data: Array<any>): TokenCollection {
    const items = data.map(item => this.createToken(item));

    return {
      kind: 3,
      items,
    };
  }

  /**
   * Should be called any time a mutation is made to the tree.
   * This will reindex all tokens, ensure proper jpaths and prefixes,
   * reset any internal caches, and otherwise *refresh* the state of
   * things after any mutations are made (see the crawler).
   *
   * IMPORTANT: it is the responsibility of consumers to call this method
   * any time a mutation is made! Consumers should not have to pass any
   * paremeters and can simply call the method.
   */
  refineTree(startToken: AnyToken, startPos: number = 0, depth: number = 0, jpath: Array<string | number> = []) {
    if(typeof startToken === 'undefined' || startToken === this.tree) {
      startToken = this.tree;
      startPos = this.head.length;
      depth = 0;
      jpath = [ 'mappings' ];
      this.objectified = null;
    }

    startToken.jpath = jpath;

    switch(startToken.kind) {
      case 0:
        startToken.startPosition = startToken.prefix.reduce((pos, token) => {
          token.startPosition = pos;
          token.endPosition = token.startPosition + token.rawValue.length;
          return token.endPosition;
        }, startPos);
        startToken.endPosition = startToken.startPosition + startToken.rawValue.length;

        break;

      case 1:
        this.refineTree(startToken.key, startPos, depth + 1, jpath.concat('key'));
        startToken.startPosition = startToken.key.startPosition;
        startToken.endPosition = startToken.key.endPosition;

        // If there is no prefix AND this is not the first key/value token.
        if( (!startToken.key.prefix || !startToken.key.prefix.length) && jpath.join('.') !== 'mappings.0') {
          if(!startToken.key.prefix) {
            startToken.key.prefix = [];
          }

          startToken.key.prefix.unshift(this.createToken(`\n${' '.repeat(depth * 2)}`));

          if(startToken.startPosition === this.yaml.length - this.tail.length) {
            startToken.key.prefix.unshift(this.createToken(`${this.tail}`));
            this.tail = '\n';
          }
        }

        if(startToken.value !== null) {
          this.refineTree(startToken.value, startToken.key.endPosition, depth + 1, jpath.concat('value'));
          startToken.endPosition = startToken.value.endPosition;
          this._addValuePrefix(startToken.value, depth);
        }

        break;

      case 2:
        this._refineCollection(startToken, 'mappings', startPos, depth, jpath);
        break;

      case 3:
        this._refineCollection(startToken, 'items', startPos, depth, jpath);
        break;

      case 4:
        startToken.startPosition = startToken.prefix.reduce((pos, token) => {
          token.startPosition = pos;
          token.endPosition = token.startPosition + token.rawValue.length;
          return token.endPosition;
        }, startPos);

        break;

      default:
        throw new Error('ahhhhh');
    }

    return startToken;
  }

  _refineCollection(startToken: TokenMapping | TokenCollection, key: string, startPos: number, depth: number, jpath: Array<string | number>) {
    let lastToken: AnyToken;

    startToken[key].reduce((pos, token, i) => {
      if (token !== null) {
        this.refineTree(token, pos, depth, jpath.concat(i));

        if(!lastToken) {
          startToken.startPosition = token.startPosition;
        }

        lastToken = token;
        return token.endPosition;
      }

      return pos;
    }, startPos);

    if (!lastToken) {
      throw new Error('Expected lastToken not to be null. This is likely an edge case that needs to be fixed.');
    }

    startToken.endPosition = lastToken.endPosition;
  }

  /**
   * Finds the first token of type 0 or 4
   */
  _findFirstValueToken(token: AnyToken): TokenRawValue {
    switch(token.kind) {
      case 0:
      case 4:
        return token;

      case 1:
        return this._findFirstValueToken(token.key);

      case 2:
        return this._findFirstValueToken(token.mappings[0]);

      case 3:
        return this._findFirstValueToken(token.items[0]);

      default:
        throw new Error(`Unrecognized token kind: ${token.kind}`);
    }
  }

  /**
   * This is for adding a prefix to "value" tokens (eg. the right hand
   * side of a key/value pair).
   */
  _addValuePrefix(token: AnyToken, depth: number): void {
    switch(token.kind) {
      case 0:
      case 4:
        if (!token.prefix || !token.prefix.length) {
          token.prefix = [ this.createToken(': ') ];
        }
        return;

      case 1:
        this._addValuePrefix(this._findFirstValueToken(token), depth);
        return;

      case 2:
        token = this._findFirstValueToken(token);
        if(!token.prefix) {
          token.prefix = [];
        }
        if(!token.prefix.length || token.prefix.every(t => t.value.indexOf(':') === -1)) {
          token.prefix.unshift(this.createToken(`:`));
        }
        return;

      case 3:
        token.items.forEach((t, i) => {
          const token = this._findFirstValueToken(t);
          if(!token.prefix) {
            token.prefix = [];
          }
          if(!token.prefix.length || token.prefix.every(t => t.value.indexOf('- ') === -1)) {
            token.prefix.unshift(this.createToken(`\n${' '.repeat(depth * 2)} - `));
          }
          if(i === 0 && token.prefix[0].value.indexOf(':') === -1) {
            token.prefix.unshift(this.createToken(':'));
          }
        });
        return;
    }
  }

  /**
   * Returns an object representation of the token tree. Most consumers
   * should work with the friendly object returned by this method. The
   * crawler is the "bridge" between this plain object and the AST. The
   * crawler should be used to make modifications to the AST.
   */
  toObject(): Object {
    if (!this.objectified) {
      const objectifier = new Objectifier(this);
      this.objectified = objectifier.getTokenValue(this.tree);
    }
    return this.objectified;
  }

  /**
   * Contructs a YAML string from the token tree.
   */
  toYAML(): string {
    return this.head + this.stringifyToken(this.tree) + this.tail;
  }

  /**
   * Recursively stringifies tokens.
   */
  stringifyToken(token: AnyToken, str: string = ''): string {
    if(!token) {
      return str;
    }

    switch(token.kind) {
      case 0:
        token.prefix.forEach(pre => str += pre.rawValue);
        str += token.rawValue;
        break;

      case 1:
        str += this.stringifyToken(token.key) + this.stringifyToken(token.value);
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
