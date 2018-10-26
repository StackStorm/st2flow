// @flow

import type { TokenRawValue, TokenKeyValue, TokenMapping, TokenCollection, AnyToken } from './types';

import factory from './token-factory';
import TokenSet from './token-set';
import { get, splitKey } from './util';

type JpathKey = string | Array<string | number>;

const REG_COMMENT = /^\s*#/;

const crawler = {
  getValueByKey(tokenSet: TokenSet, key: JpathKey): any {
    if(tokenSet) {
      return get(tokenSet.toObject(), key);
    }

    return undefined;
  },

  set(tokenSet: TokenSet, key: JpathKey, value: any) {
    const keyArr: Array<string | number> = splitKey(key);
    const token = getTokenByKey(tokenSet.tree, keyArr);

    if(token) {
      this.replaceTokenValue(tokenSet, keyArr, value);
    }
    else {
      const parentPath = keyArr.slice(0, -1);
      const parentValue = getTokenValueByKey(tokenSet.tree, parentPath);

      switch(parentValue.kind) {
        case 2:
          this.assignMappingItem(tokenSet, keyArr, value);
          return;

        case 3: {
          let index = parseInt(keyArr[keyArr.length - 1], 10);

          if(isNaN(index) || index > parentValue.items.length) {
            index = parentValue.items.length;
          }

          this.spliceCollection(tokenSet, parentPath, index, 0, value);
          return;
        }
      }
    }
  },

  /**
   * Given a key and value, replaces the existing value with the new value.
   *
   * {
   *   version: 1,
   *   tasks: {
   *     task1: {
   *       action: "core.local"
   *     }
   *   }
   * }
   *
   * crawler.replaceTokenValue(tokenSet, 'tasks.task1', { action: 'aws.lambda' });
   *
   * {
   *   version: 1,
   *   tasks: {
   *     task1: {
   *       action: "aws.lambda"
   *     }
   *   }
   * }
   */
  replaceTokenValue(tokenSet: TokenSet, key: JpathKey, value: any) {
    const valueToken: AnyToken = getTokenValueByKey(tokenSet.tree, key);
    const parentToken: TokenKeyValue | TokenCollection = getTokenParent(tokenSet.tree, valueToken);

    switch(parentToken.kind) {
      case 1:
        parentToken.value = factory.createToken(value);
        tokenSet.refineTree();
        break;

      case 3: {
        const index = valueToken.jpath.slice(-1)[0];
        parentToken.items.splice(index, 1, factory.createToken(value));
        tokenSet.refineTree();
        break;
      }

      default:
        throw new Error(`Cannot update token of kind ${valueToken.kind} at path: ${key.toString()}`);
    }
  },

  /**
   * Adds a key/value pair to the "target" object.
   *
   * {
   *   version: 1,
   *   tasks: {
   *     task1: {
   *       action: "core.local"
   *     }
   *   }
   * }
   *
   * crawler.addMappingItem(tokenSet, 'tasks.task2', { action: 'core.local' });
   * crawler.addMappingItem(tokenSet, ['tasks', 'task2', 'input'], { cmd: 'echo "Hello World"' });
   *
   * {
   *   version: 1,
   *   tasks: {
   *     task1: {
   *       action: "core.local"
   *     },
   *     task2: {
   *       action: "core.local",
   *       input: {
   *         cmd: 'echo "Hello World"'
   *       }
   *     }
   *   }
   * }
   */
  assignMappingItem(tokenSet: TokenSet, targetKey: JpathKey, val: any) {
    const targKey: Array<string | number> = splitKey(targetKey);

    if(!targKey.length) {
      throw new Error(`Cannot add a key to a blank target: ${targetKey.toString()}`);
    }

    let token: TokenMapping;
    let newKey: string | number;

    if(targKey.length === 1) {
      token = tokenSet.tree;
      newKey = targKey[0];
    }
    else {
      const parentObjKey: Array<string | number> = targKey.slice(0, -1);
      token = getTokenValueByKey(tokenSet.tree, parentObjKey, 2);
      newKey = targKey[targKey.length - 1];
    }

    const kvToken = factory.createKeyValueToken(`${newKey}`, val);

    token.mappings.push(kvToken);
    tokenSet.refineTree();
  },

  /**
   * Renames the `targetKey` to the specified `val`
   *
   * {
   *   tasks: {
   *     task1: { ... }
   *   }
   * }
   *
   * crawler.renameMappingKey(tokenSet, 'tasks.task1', 'task2');
   *
   * {
   *   tasks: {
   *     task2: { ... }
   *   }
   * }
   *
   */
  renameMappingKey(tokenSet: TokenSet, targetKey: JpathKey, val: string) {
    const targKey: Array<string | number> = splitKey(targetKey);

    if(!targKey.length) {
      throw new Error(`Cannot rename a key on a blank target: ${targetKey.toString()}`);
    }

    const token: TokenRawValue = getTokenByKey(tokenSet.tree, targKey);

    if(!token) {
      throw new Error(`Could not find token: ${targetKey.toString()}`);
    }

    updateTokenValue(token, val);
    tokenSet.refineTree();
  },

  /**
   * Deletes the given key (and its value) from a mapping.
   *
   * {
   *   version: 1,
   *   tasks: {
   *     task1: {
   *       action: "core.local"
   *     }
   *   }
   * }
   *
   * crawler.deleteMappingItem(tokenSet, 'version');
   * crawler.deleteMappingItem(tokenSet, 'tasks.task1');
   */
  deleteMappingItem(tokenSet: TokenSet, key: JpathKey) {
    const token: TokenRawValue = getTokenByKey(tokenSet.tree, key);

    if (!token) {
      throw new Error(`Could not find token for path: ${key.toString()}`);
    }

    const parentKvToken: TokenKeyValue = getTokenParent(tokenSet.tree, token);

    if(parentKvToken.kind !== 1) {
      throw new Error('The key must point to a valid mapping key. If you are trying to delete an item from a collection, use the "spliceCollection" method.');
    }

    const parentMappingToken = getTokenParent(tokenSet.tree, parentKvToken);

    parentMappingToken.mappings.splice(parentKvToken.jpath.slice(-1)[0], 1);
    tokenSet.refineTree();
  },

  /**
   * Works exactly like Array.prototype.splice for the target collection.
   *
   * {
   *   version: 1,
   *   items:
   *   - item 1
   *   - item 2
   *   - item 3
   * }
   *
   * crawler.spliceCollection(tokenSet, 'items', 1, 1, 'newItem');
   *
   * {
   *   version: 1,
   *   items:
   *   - item 1
   *   - newItem
   *   - item 3
   * }
   */
  spliceCollection(tokenSet: TokenSet, targetKey: JpathKey, start: string, deleteCount: number, ...items: Array<AnyToken>) {
    const token: TokenCollection = getTokenValueByKey(tokenSet.tree, targetKey, 3);
    const tokens = items.map(item => factory.createToken(item));

    token.items.splice(start, deleteCount, ...tokens);
    tokenSet.refineTree();
  },

  /**
   * Given a key, returns all comments which precede that key.
   * This will preserve newlines and strip leading hash/pound # signs.
   *
   * ---
   * version: 1.0
   * tasks:
   *   # [123, 456]
   *   # foo bar
   *   task1: ...
   *
   * crawler.getCommentsForKey(tokenSet, ['tasks', 'task1']);
   *
   * [123, 456]
   * foo bar
   */
  getCommentsForKey(tokenSet: TokenSet, key: JpathKey): string {
    const token: TokenRawValue = getTokenByKey(tokenSet.tree, key);

    if(!token) {
      throw new Error(`Could not find token for path: ${key.toString()}`);
    }

    return this.getTokenComments(token);
  },

  /**
   * [setCommentForKey description]
   * @param {[type]} tokenSet: TokenSet [description]
   * @param {[type]} key:      JpathKey [description]
   * @param {[type]} comments: string   [description]
   */
  setCommentForKey(tokenSet: TokenSet, key: JpathKey, comments: string) {
    const token: TokenRawValue = getTokenByKey(tokenSet.tree, key);

    if(!token) {
      throw new Error(`Could not find token for path: ${key.toString()}`);
    }

    const example = token.prefix.find(t => REG_COMMENT.test(t.rawValue));
    const indent = example.rawValue.split('#')[0];
    const tokens = comments.split(/\n/).map(comment => factory.createToken(`${indent}# ${comment}`));

    const lastToken = token.prefix.pop();

    token.prefix = token.prefix.filter(t => !REG_COMMENT.test(t.rawValue)).concat(tokens).concat(lastToken);
    tokenSet.refineTree();
  },

  /**
   * Recursively finds the first token of type 0 or 4
   */
  findFirstValueToken(token: AnyToken): TokenRawValue {
    if(token === null || typeof token === 'undefined') {
      return null;
    }

    switch(token.kind) {
      case 0:
      case 4:
        return token;

      case 1:
        return this.findFirstValueToken(token.key);

      case 2:
        return this.findFirstValueToken(token.mappings[0]);

      case 3:
        return this.findFirstValueToken(token.items[0]);

      default:
        throw new Error(`Unrecognized token kind: ${token.kind}`);
    }
  },

  getTokenComments(token: AnyToken): string {
    let comments = '';
    const firstToken: TokenRawValue = this.findFirstValueToken(token);

    if(firstToken) {
      comments = firstToken.prefix.filter(
        t => REG_COMMENT.test(t.rawValue)
      ).reduce((str, token, i) => {
        return str += `${i === 0 ? '' : '\n'}${token.rawValue.replace(REG_COMMENT, '').trim()}`;
      }, '');
    }

    return comments;
  },
};

/**
 * TokenSet consumers will often work with the "objectified" version
 * of the YAML file, which looks something like this:
 *
 * {
 *   version: 1,
 *   tasks: {
 *     task1: {
 *       action: "core.local"
 *     }
 *   }
 * }
 *
 * Given a key of "tasks.task1", this method will find the corresponding
 * "task1" token within the given branch. This method is recursive, and generally
 * the starting branch should always be the root node: tokenSet.tree.
 */
function getTokenByKey(branch: AnyToken, key: JpathKey): AnyToken {
  if (!branch) {
    return undefined;
  }

  const keyArr: Array<string | number> = splitKey(key);

  if(!keyArr.length) {
    return branch;
  }

  if(branch.kind === 0) {
    // The following mimicks the behavior of reading normal JS objects
    if(keyArr.length === 1) {
      // Trying to read a property on a scalar value - not possible.
      return undefined;
    }

    throw new Error(`Cannot read property ${keyArr[1]} of undefined.`);
  }

  const segment = keyArr.shift();

  switch(branch.kind) {
    case 2: {
      const kvToken: TokenKeyValue = branch.mappings.find(kvt =>
        kvt.key.value === segment
      );

      if (!kvToken) {
        return undefined;
      }

      return getTokenByKey(keyArr.length ? kvToken.value : kvToken.key, keyArr);
    }

    case 3:
      return getTokenByKey(branch.items[segment], keyArr);

    default:
      throw new Error(`Error looking up token for "${segment}.${keyArr.join('.')} on branch kind: ${branch.kind}`);
  }
}

/**
 * Given a key such as "tasks.foo", returns the value as a token and
 * verifies it's the expected kind.
 */
function getTokenValueByKey(rootTree: TokenMapping, key: JpathKey, kind?: number): AnyToken {
  const token = getTokenByKey(rootTree, key);

  if (!token) {
    throw new Error(`Could not find token for path: ${key.toString()}`);
  }

  const parentToken: AnyToken = getTokenParent(rootTree, token);
  const valueToken: AnyToken = parentToken.kind === 1 ? parentToken.value : token;

  if (typeof kind !== 'undefined' && valueToken.kind !== kind) {
    throw new Error(`Value token is not of kind "${kind}" at path: ${key.toString()}`);
  }

  return valueToken;
}

/**
 * Given a token, returns the parent token from the AST.
 */
function getTokenParent(rootTree: TokenMapping, token): AnyToken {
  const result: AnyToken | Array<AnyToken> = get(rootTree, token.jpath.slice(0, -1));

  if(Array.isArray(result) || !result.hasOwnProperty('kind')) {
    return get(rootTree, token.jpath.slice(0, -2));
  }

  return result;
}

function updateTokenValue(token: TokenRawValue, value: string) {
  let rawValue = value;

  if(token.singleQuoted) {
    rawValue = `'${rawValue}'`;
  }
  else if(token.doubleQuoted) {
    rawValue = `"${rawValue}"`;
  }

  Object.assign(token, { value, rawValue });
}

export default crawler;
