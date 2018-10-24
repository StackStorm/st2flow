// @flow

import { diff } from 'deep-diff';
import EventEmitter from 'eventemitter3';
import { TokenSet, crawler } from '@stackstorm/st2flow-yaml';

class MetaModel {
  yaml: string;
  tokenSet: TokenSet;
  emitter: EventEmitter;

  constructor(yaml: ?string) {
    this.emitter = new EventEmitter();

    if (yaml) {
      this.fromYAML(yaml);
    }
  }

  fromYAML(yaml: string): void {
    const oldData = this.tokenSet;
    this.yaml = yaml;

    try {
      this.tokenSet = new TokenSet(yaml);
    }
    catch (ex) {
      this.emitter.emit('error', ex);
      return;
    }

    this.emitChange(oldData, this.tokenSet);
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

  get(path: string) {
    return crawler.getValueByKey(this.tokenSet, path);
  }

  set(path: string, value: any) {
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
