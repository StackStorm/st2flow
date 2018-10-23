// @flow

import type { TokenRawValue, TokenKeyValue, TokenMapping, TokenCollection, TokenReference, AnyToken } from './types';
import { load } from 'yaml-ast-parser';
import { pick, omit } from './util';
import Objectifier from './objectifier';
import stringifier from './stringifier';
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

    // IMPORTANT: Only the lastToken has a suffix!
    // This is crucial for the refinery and stringifier.
    const endPos = this.lastToken.endPosition;
    this.tree.suffix = this.tokenizeString(this.yaml.slice(endPos), endPos);
    perf.stop('parseYAML');
    // console.log(JSON.stringify(this.tree, null, '  '));
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

  parseMapping(kvToken: TokenKeyValue, jpath: Array<string | number>): TokenKeyValue {
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
    const startIdx  = prev ? prev.endPosition : 0;
    const gap = this.yaml.slice(startIdx, token.startPosition);

    token.isTag = REG_TAG.test(gap);
    this.lastToken = token;

    return this.tokenizeString(gap, startIdx);
  }

  /**
   * Splits a string into tokens for every line.
   */
  tokenizeString(str: string, startPos: number): Array<TokenRawValue> {
    return str.split(REG_NEWLINE).map((item, i) => ({
      kind: 0,
      value: item,
      rawValue: (i > 0 ? '\n' : '') + item,
      startPosition: startPos,
      endPosition: (startPos += item.length + (i > 0 ? 1 : 0)),
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
   * things after any mutations are made (see the crawler for usage).
   *
   * IMPORTANT: it is the responsibility of consumers to call this method
   * any time a mutation is made! In general, the crawler should be
   * the only thing that needs to call this method.
   */
  refineTree() {
    this.objectified = null;
    this.stringified = null;

    perf.start('refineTree');
    const refinery = new Refinery(this.tree, this.yaml);
    const { tree, yaml } = refinery.refineTree();
    perf.stop('refineTree');

    this.tree = tree;
    this.yaml = this.stringified = yaml;
  }

  /**
   * Returns a POJO representation of the token tree. Most consumers
   * should work with the friendly object returned by this method. The
   * crawler is the "bridge" between this plain object and the AST and
   * should be used to make modifications to the AST.
   */
  toObject(): Object {
    if (!this.objectified) {
      perf.start('tree.toObject()');
      const objectifier = new Objectifier(this.anchors);
      this.objectified = objectifier.getTokenValue(this.tree);
      perf.stop('tree.toObject()');
    }

    return this.objectified || {};
  }

  /**
   * Contructs a YAML string from the token tree.
   */
  toYAML(): string {
    if(!this.stringified) {
      perf.start('tree.toYAML()');
      this.stringified = stringifier.stringifyToken(this.tree);
      perf.stop('tree.toYAML()');
    }

    return this.stringified || '';
  }
}

export default TokenSet;
