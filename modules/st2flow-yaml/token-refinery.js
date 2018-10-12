// @flow

import type { TokenRawValue, TokenMapping, TokenCollection, AnyToken, Refinement } from './types';
import crawler from './crawler';
import factory from './token-factory';
import stringifier from './stringifier';

const DEFAULT_INDENT = '  ';
const STR_COLON = ':';
const STR_DASH = '-';
const STR_FIRST_TOKEN = 'mappings.0';
const REG_INDENT = /\n( +)\S/;
const REG_LEADING_SPACE = /$\s+/;
const REG_ALL_WHITESPACE = /^\s+$/;
const REG_COMMENT = /^\s*#(?:\s*)?/;
const REG_JSON_START = /^\s*(?:[-:] )?[{[]/;

/**
 * Class for refining tokens whenever mutations are made to the AST.
 */
class Refinery {
  newYaml: string = '';
  indent: string;
  tree: TokenMapping;
  lastToken: TokenRawValue;

  constructor(tree: TokenMapping, oldYaml: string = '') {
    const match = oldYaml.match(REG_INDENT);
    this.indent = match ? match[1] : DEFAULT_INDENT;
    this.tree = tree;
  }

  // This is the only method anybody should care about
  refineTree(): Refinement {
    const newTree: TokenMapping = this.prefixToken(this.tree, 0, this.tree.jpath || []);
    const firstToken: TokenRawValue = crawler.findFirstValueToken(newTree);
    const startPos: number = firstToken.prefix.reduce((pos, prefix) => pos + prefix.rawValue.length, 0);
    this.reIndexToken(newTree, startPos);

    return {
      tree: newTree,
      yaml: this.newYaml,
    };
  }

  /**
   * Given a token, refines the token
   */
  prefixToken(startToken: AnyToken, depth: number, jpath: Array<string | number>): AnyToken {
    startToken.jpath = jpath;

    switch(startToken.kind) {
      case 0:
      case 4:
        this.lastToken = startToken;
        return startToken;

      case 1:
        if(!startToken.key) {
          console.log(JSON.stringify(startToken, null, '  '));
        }
        this.prefixToken(startToken.key, depth + 1, jpath.concat('key'));
        this.prefixKey(startToken.key, depth, jpath);

        if(startToken.value !== null) {
          this.prefixToken(startToken.value, depth + 1, jpath.concat('value'));

          if(startToken.value.kind !== 3) {
            this.prefixValue(startToken.value, depth);
          }
        }

        return startToken;

      case 2:
        this.prefixMapping(startToken, depth, jpath);
        return startToken;

      case 3:
        this.prefixCollection(startToken, depth, jpath);
        return startToken;

      default:
        throw new Error(`Unknown token kind: ${startToken.kind}`);
    }
  }

  /**
   * Adds the prefix to "key" tokens in a mapping. This is mostly whitespace.
   */
  prefixKey(token: TokenRawValue | TokenCollection, depth: number, jpath: Array<string | number>): void {
    const rawToken: TokenRawValue = crawler.findFirstValueToken(token);

    if(!rawToken.prefix) {
      rawToken.prefix = [];
    }

    const { prefix } = rawToken;
    if(depth && prefix.length && prefix[prefix.length - 1].value.indexOf(STR_DASH) !== -1) {
      depth--;
    }

    // Only the LAST token in a tree should have a suffix
    // If new tokens are inserted AFTER the previously last token,
    // then the suffix becomes a prefix for the following token.
    if(this.lastToken && this.lastToken.suffix) {
      rawToken.prefix.unshift(factory.createToken(this.lastToken.suffix));
      delete this.lastToken.suffix;
    }

    // TODO: smarter indentation detection per token
    // (using depth and leading whitespace in prefix)
    const indent = this.indent.repeat(depth);
    const missingIndent = prefix.every(t => !REG_ALL_WHITESPACE.test(t.rawValue) && t.value.indexOf(indent) === -1);

    // If there is no indent prefix AND this is not the very first key/value token.
    if(missingIndent && jpath.join('.') !== STR_FIRST_TOKEN) {
      prefix.forEach(t => {
        if(REG_COMMENT.test(t.value)) {
          t.value = t.rawValue = indent + t.rawValue.replace(REG_LEADING_SPACE, '');
        }
      });

      if(!prefix.length || prefix[prefix.length - 1].rawValue.indexOf(STR_DASH) === -1) {
        prefix.push(factory.createToken(`\n${indent}`));
      }
    }
  }

  /**
   * Adds the prefix to "value" tokens in a mapping. Most of the time
   * this will include a colon and white space.
   */
  prefixValue(token: AnyToken, depth: number): void {
    let rawToken: TokenRawValue;

    switch(token.kind) {
      case 0:
      case 4:
        rawToken = token;
        break;

      case 2: {
        rawToken = crawler.findFirstValueToken(token);
        break;
      }

      case 3:
        throw new Error('Must use addDashPrefix method');

      default:
        throw new Error(`Cannot add value prefix to token of kind: ${token.kind}`);
    }

    if(!rawToken) {
      // This only happens when an empty JSON object is used in yaml:
      // foo: {}
      return;
    }

    if(!rawToken.prefix) {
      rawToken.prefix = [];
    }

    this.addColonPrefix(rawToken.prefix);
  }

  /**
   * Given a prefix collection, adds the color if it does not exist
   */
  addColonPrefix(prefix: Array<TokenRawValue>) {
    if(prefix.every(t => t.value.indexOf(STR_COLON) === -1)) {
      let colon = STR_COLON;

      if(!prefix.length || !/^\n/.test(prefix[prefix.length - 1].rawValue)) {
        colon += ' ';
      }

      prefix.unshift(factory.createToken(colon));
    }
  }

  /**
   * Given a TokenMapping (kind: 2), refines each token in the mappings array.
   */
  prefixMapping(startToken: TokenMapping, depth: number, jpath: Array<string | number>) {
    startToken.mappings.some((token, i) => {
      if (token === null) {
        return false;
      }

      const rawToken: TokenRawValue = crawler.findFirstValueToken(startToken);
      const jsonIndex: number = rawToken.prefix && rawToken.prefix.findIndex(t => REG_JSON_START.test(t.value));

      if(jsonIndex !== -1) {
        // The array is a JSON-style array: [foo, bar]
        // The tokens are already prefixed - no need to continue
        return true; // break
      }

      this.prefixToken(token, (token.kind === 2 ? depth + 1 : depth), jpath.concat('mappings', i));

      return false;
    });
  }

  /**
   * Given a TokenCollection (kind: 3), refines each token in the items array.
   */
  prefixCollection(startToken: TokenCollection, depth: number, jpath: Array<string | number>) {
    startToken.items.some((token, i) => {
      if(token === null) {
        return false;
      }

      const rawToken: TokenRawValue = crawler.findFirstValueToken(token);

      if(!rawToken.prefix) {
        rawToken.prefix = [];
      }

      if(rawToken.prefix.find(t => REG_JSON_START.test(t.value))) {
        // The array is a JSON-style array: [foo, bar]
        // The tokens are already prefixed - no need to continue
        return true; // break
      }

      this.prefixToken(token, depth + 1, jpath.concat('items', i));

      let dashIndex: number = rawToken.prefix.findIndex(t => t.value.indexOf(STR_DASH) !== -1);

      // if it's already there, no need to go further .
      if(dashIndex !== -1) {
        return false;
      }

      // First remove any whitespace tokens at the top of the prefix
      let pre = rawToken.prefix[++dashIndex];
      while(pre && REG_ALL_WHITESPACE.test(pre.rawValue)) {
        rawToken.prefix.splice(dashIndex, 1);
        pre = rawToken.prefix[dashIndex];
      }

      /**
       * For every instance of ["items", \d] near the top of the jpath,
       * add an indent + dash. So for values nested 3 levels deep like this:
       *   foo: [ [ [ 'bar' ] ] ]
       * the jpath for "bar" will look something like this:
       *   ['mappings', 3, 'value', 'items', 0, 'items', 0, 'items', 0]
       * For object values values nested 3 levels deep like this:
       *   foo: [ [ [ { bing: 'bar' } ] ] ]
       * the jpath for "bing" will look something like this:
       *   ['mappings', 3, 'value', 'items', 0, 'items', 0, 'items', 0, 'mappings', 0, 'key']
       */
      let nesting = 0;
      let itemsIdx = rawToken.jpath.lastIndexOf('items');
      let lastTwo = rawToken.jpath.slice(itemsIdx, itemsIdx + 2);
      const firstIndex = lastTwo[1];

      while(lastTwo[0] === 'items' && lastTwo[1] >= firstIndex) {
        const dash = nesting === 0 ? `${STR_DASH} ` : STR_DASH;
        const prefix = `\n${this.indent.repeat(depth - nesting)}${dash}`;
        rawToken.prefix.unshift(factory.createToken(prefix));

        if(++nesting > 0 && firstIndex > 0) {
          break;
        }

        itemsIdx -= 2;
        lastTwo = rawToken.jpath.slice(itemsIdx, itemsIdx + 2);
      }

      // the fist item in a collection should have a colon prefix
      if(i === 0 && rawToken.jpath[itemsIdx + 3] === 0) {
        this.addColonPrefix(rawToken.prefix);
      }

      return false;
    });
  }

  reIndexToken(token: AnyToken, startPos: number): number {
    if(token === null) {
      return startPos;
    }

    switch(token.kind) {
      case 0:
      case 4:
        token.startPosition = token.prefix.reduce((pos, prefix) => {
          return pos + prefix.rawValue.length;
        }, startPos);
        this.newYaml += stringifier.stringifyToken(token);
        token.endPosition = token.startPosition + (token.rawValue || token.value).length;
        break;

      case 1:
        token.startPosition = startPos;
        startPos = this.reIndexToken(token.key, token.startPosition);
        token.endPosition = this.reIndexToken(token.value, startPos);
        break;

      case 2:
        token.startPosition = startPos;
        token.endPosition = token.mappings.reduce((pos, t) => {
          return this.reIndexToken(t, pos);
        }, startPos);
        break;

      case 3:
        token.startPosition = startPos;
        token.endPosition = token.items.reduce((pos, t) => {
          return this.reIndexToken(t, pos);
        }, startPos);
        break;

      default:
        throw new Error(`Unknown token kind: ${token.kind}`);
    }

    return token.endPosition;
  }
}

export default Refinery;
