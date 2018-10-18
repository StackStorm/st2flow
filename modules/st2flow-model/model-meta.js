// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface, DeltaInterface } from './interfaces';

import { diff } from 'deep-diff';
import EventEmitter from 'eventemitter3';
import { TokenSet, crawler } from '@stackstorm/st2flow-yaml';

type Next = {
  do: string | Array<string>,
  when?: string,
};

type RawTask = {
  action: string,
  input?: Object,
  next?: Array<Next>,
};

class MetaModel implements ModelInterface {
  tokenSet: TokenSet;
  emitter: EventEmitter;

  constructor(yaml: ?string) {
    this.emitter = new EventEmitter();

    if (yaml) {
      this.fromYAML(yaml);
    }
  }

  fromYAML(yaml: string): void {
    try {
      const oldData = this.tokenSet;
      this.tokenSet = new TokenSet(yaml);
      this.emitChange(oldData, this.tokenSet);
    }
    catch (ex) {
      this.emitter.emit('error', ex);
    }
  }

  toYAML(): string {
    return this.tokenSet.toYAML();
  }

  on(event: string, callback: Function) {
    this.emitter.on(event, callback);
  }

  removeListener(event: string, callback: Function) {
    this.emitter.removeListener(event, callback);
  }

  emitChange(oldData: Object, newData: Object): void {
    // TODO: add schema checks before emitting change event
    const obj1 = oldData ? oldData : {};
    const obj2 = newData ? newData : {};
    const deltas = diff(obj1, obj2) || [];

    if (deltas.length) {
      this.emitter.emit('change', deltas, this.tokenSet.toYAML());
    }
  }

  get(path) {
    return crawler.getValueByKey(this.tokenSet, path);
  }

  set(path, value) {
    const oldData = this.tokenSet.toObject();
    if (crawler.getValueByKey(this.tokenSet, path) === undefined) {
      crawler.assignMappingItem(this.tokenSet, path, value);
    }
    else {
      crawler.replaceTokenValue(this.tokenSet, path, value);
    }
    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }
}

export default MetaModel;
