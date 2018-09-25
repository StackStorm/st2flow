// @flow

import type { TokenRawValue, TokenKeyValue, TokenMapping, TokenCollection, TokenReference, AnyToken } from './types';
import { load } from 'yaml-ast-parser';
import { pick, omit } from './util';
import Objectifier from './objectifier';
import Refinery from './token-refinery';
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
  stringified: ?string;         // Stringified YAML

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
    this.stringified = null;
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
      isComment: item.indexOf('#') !== -1,
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
  refineTree() {
    perf.start('refineTree');

    this.objectified = null;
    this.stringified = null;

    const refinery = new Refinery(this.yaml, this.head, this.tail);
    const { tree, tail } = refinery.refineTree(this.tree);

    this.tree = tree;
    this.tail = tail;
    this.yaml = this.toYAML();

    perf.stop('refineTree');
  }

  /**
   * Returns a POJO representation of the token tree. Most consumers
   * should work with the friendly object returned by this method. The
   * crawler is the "bridge" between this plain object and the AST and
   * should be used to make modifications to the AST.
   */
  toObject(): Object {
    if (!this.objectified) {
      const objectifier = new Objectifier(this.anchors);
      this.objectified = objectifier.getTokenValue(this.tree);
    }

    return this.objectified;
  }

  /**
   * Contructs a YAML string from the token tree.
   */
  toYAML(): string {
    if(!this.stringified) {
      this.stringified = this.head + this.stringifyToken(this.tree) + this.tail;
    }

    return this.stringified;
  }

  /**
   * Recursively stringifies tokens into YAML.
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
