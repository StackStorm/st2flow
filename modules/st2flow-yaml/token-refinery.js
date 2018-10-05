// @flow

import type { TokenRawValue, TokenMapping, TokenCollection, AnyToken, Refinement } from './types';
import crawler from './crawler';
import factory from './token-factory';

const DEFAULT_INDENT = '  ';
const DEFAULT_TAIL = '\n';
const STR_COLON = ':';
const REG_INDENT = /\n( +)\S/;
const REG_ALL_WHITESPACE = /^\s+$/;

/**
 * Class for refining tokens whenever mutations are made to the AST.
 */
class Refinery {
  yaml: string;
  tail: string;
  head: string;
  indent: string;

  constructor(yaml: string, head: string, tail: string) {
    // The following fields are required for this module to work properly
    this.yaml = yaml;
    this.head = head;
    this.tail = tail;

    const match = yaml.match(REG_INDENT);
    this.indent = match ? match[1] : DEFAULT_INDENT;
  }

  // This is the only method anybody should care about
  refineTree(tree: TokenMapping): Refinement {
    const newTree: TokenMapping = this.prefixToken(tree, 0, tree.jpath);
    this.reIndexToken(newTree, this.head.length);

    return {
      tree: newTree,
      head: this.head,
      tail: this.tail,
    };
  }

  /**
   * Given a token, refines the token
   *
   * NOTE: this causes side effects on the token!! OMG!!!
   */
  prefixToken(startToken: AnyToken, depth: number, jpath: Array<string | number>): AnyToken {
    startToken.jpath = jpath;

    switch(startToken.kind) {
      case 0:
      case 4:
        return startToken;

      case 1:
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

    // If there is no prefix AND this is not the very first key/value token.
    if(!rawToken.prefix.length && jpath.join('.') !== 'mappings.0') {
      const indent = `${this.indent.repeat(depth)}`;
      rawToken.prefix.unshift(factory.createToken(indent));
    }
  }

  /**
   * Adds the prefix to "value" tokens in a mapping. Most of the time
   * this will include a colon and white space.
   */
  prefixValue(token: AnyToken, depth: number): void {
    switch(token.kind) {
      case 0:
      case 4:
        if (!token.prefix || !token.prefix.length) {
          token.prefix = [ factory.createToken(`${STR_COLON} `) ];
        }

        return;

      case 2: {
        const rawToken: TokenRawValue = crawler.findFirstValueToken(token);

        if(!rawToken.prefix) {
          rawToken.prefix = [];
        }

        // only add the colon if it does not yet exist
        if(rawToken.prefix.every(t => t.value.indexOf(STR_COLON) === -1)) {
          rawToken.prefix.unshift(factory.createToken(STR_COLON));
        }

        return;
      }

      case 3:
        throw new Error('Must use addDashPrefix method');

      default:
        throw new Error(`Cannot add value prefix to token of kind: ${token.kind}`);
    }
  }

  /**
   * Given a TokenMapping (kind: 2), refines each token in the mappings array.
   */
  prefixMapping(startToken: TokenMapping, depth: number, jpath: Array<string | number>) {
    startToken.mappings.forEach((token, i) => {
      if (token === null) {
        return;
      }

      this.prefixToken(token, (token.kind === 2 ? depth + 1 : depth), jpath.concat('mappings', i));
    });
  }

  /**
   * Given a TokenCollection (kind: 3), refines each token in the items array.
   */
  prefixCollection(startToken: TokenCollection, depth: number, jpath: Array<string | number>) {
    startToken.items.forEach((token, i) => {
      if(token === null) {
        return;
      }

      this.prefixToken(token, depth + 1, jpath.concat('items', i));

      const rawToken: TokenRawValue = crawler.findFirstValueToken(token);

      if(!rawToken.prefix) {
        rawToken.prefix = [];
      }

      let dashIndex: number = rawToken.prefix.findIndex(t => t.value.indexOf('- ') !== -1);

      // if it's already there, no need to go further .
      if(dashIndex !== -1) {
        return;
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
        const prefix = `\n${this.indent.repeat(depth - nesting)}- `;
        rawToken.prefix.unshift(factory.createToken(prefix));

        if(++nesting > 0 && firstIndex > 0) {
          break;
        }

        itemsIdx -= 2;
        lastTwo = rawToken.jpath.slice(itemsIdx, itemsIdx + 2);
      }

      // the fist item in a collection should have a colon prefix
      if(i === 0 && rawToken.jpath[itemsIdx + 3] === 0) {
        rawToken.prefix.unshift(factory.createToken(STR_COLON));
      }
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
        token.endPosition = token.startPosition + (token.rawValue || token.value).length;
        break;

      case 1:
        token.startPosition = startPos;
        startPos = this.reIndexToken(token.key, startPos);

        // Detect if this token was inserted at the end of the tree.
        // If so, the old tail should become a prefix.
        if(token.key.startPosition >= this.yaml.length - this.tail.length) {
          const rawToken: TokenRawValue = crawler.findFirstValueToken(token.key);
          const idx = rawToken.prefix[0].rawValue.indexOf(STR_COLON) === -1 ? 0 : 1;

          // Remove any leading newlines from the insertion point
          rawToken.prefix[idx].value = rawToken.prefix[idx].rawValue = rawToken.prefix[idx].rawValue.replace(DEFAULT_TAIL, '');
          rawToken.prefix.splice(idx, 0, factory.createToken(`${this.tail}`));
          this.tail = DEFAULT_TAIL;
        }

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

module.exports = Refinery;
