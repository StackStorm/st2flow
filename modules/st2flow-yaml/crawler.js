// @flow

import TokenSet from './token-set';
import Objectifier from './objectifier';
import { get } from './util';

class Crawler {
  tokenSet: TokenSet;

  constructor(tokenSet: TokenSet): void {
    this.tokenSet = tokenSet;
    this.objectifier = new Objectifier(this.tokenSet);
  }

  getValueByKey(key: string | number): any {
    // TODO: Caching
    const obj = this.objectifier.getMapping(this.tokenSet.tree);
    return get(obj, key);
  }
}

export default Crawler;
