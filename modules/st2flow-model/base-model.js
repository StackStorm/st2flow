// @flow

import type { DeltaInterface, AjvError, GenericError } from './interfaces';

import Ajv from 'ajv';
import { diff } from 'deep-diff';
import EventEmitter from 'eventemitter3';

import { TokenSet, crawler } from '@stackstorm/st2flow-yaml';

const ajv = new Ajv();
const STR_ERROR_YAML = 'yaml-error';
const STR_ERROR_SCHEMA = 'schema-error';

class BaseModel {
  modelName: string;
  tokenSet: TokenSet;
  emitter: EventEmitter;

  constructor(schema: Object, yaml: ?string) {
    this.modelName = this.constructor.name; // OrquestaModel, MistralModel
    this.emitter = new EventEmitter();
    ajv.addSchema(schema, this.modelName);

    if (yaml) {
      this.fromYAML(yaml);
    }
  }

  on(event: string, callback: Function) {
    this.emitter.on(event, callback);
  }

  removeListener(event: string, callback: Function) {
    this.emitter.removeListener(event, callback);
  }

  fromYAML(yaml: string): void {
    try {
      const oldData = this.tokenSet;
      this.tokenSet = new TokenSet(yaml);
      this.emitter.emit(STR_ERROR_YAML, [/* clear any yaml errors */]);

      if(oldData) {
        this.emitChange(oldData.toObject(), this.tokenSet.toObject());
      }
    }
    catch (ex) {
      // The parser is overly verbose on certain errors, so
      // just grab the relevant parts. Also normalize it to an array.
      const exception = ex.length > 2 ? ex.slice(0, 2) : [].concat(ex);
      this.emitter.emit(STR_ERROR_YAML, exception);
    }
  }

  toYAML(): string {
    return this.tokenSet.toYAML();
  }

  applyDelta(delta: DeltaInterface, yaml: string) {
    // Preliminary tests show that parsing of long/complex YAML files
    // takes less than ~20ms (almost always less than 5ms) - so doing full
    // parsing often is very cheap. In the future we can maybe look into applying
    // only the deltas to the AST, though this will likely not be trivial.
    this.fromYAML(yaml);
  }

  emitChange(oldData: Object = {}, newData: Object = {}): void {
    if(!ajv.validate(this.modelName, newData)) {
      console.log(ajv.errors);
      this.emitter.emit(STR_ERROR_SCHEMA, formatAjvErrors(ajv.errors));
      return;
    }

    const deltas = diff(oldData, newData) || [];
    this.emitter.emit(STR_ERROR_SCHEMA, [/* clear any schema errors */]);

    if (deltas.length) {
      this.emitter.emit('change', deltas, this.tokenSet.toYAML());
    }
  }

  get name() {
    return crawler.getValueByKey(this.tokenSet, 'name');
  }

  get version() {
    return crawler.getValueByKey(this.tokenSet, 'version');
  }

  get description() {
    return crawler.getValueByKey(this.tokenSet, 'description');
  }

  get tags() {
    return crawler.getValueByKey(this.tokenSet, 'tags');
  }
}

function formatAjvErrors(errors: Array<AjvError>): Array<GenericError> {
  let message = errors[0].dataPath;

  switch(errors[errors.length - 1].keyword) {
    case 'type':
    case 'maxProperties':
      message += ` ${errors[0].message}`;
      return [{ message }];

    case 'enum':
      message += ` ${errors[0].message}: ${errors[0].params.allowedValues.join(', ')}`;
      return [{ message }];

    case 'additionalProperties':
      message += ` ${errors[0].message} ("${errors[0].params.additionalProperty}")`;
      return [{ message }];

    case 'oneOf': {
      errors = errors.slice(0, -1);
      if(errors.every(err => err.keyword === 'type')) {
        message += ' should be one of ';
        message += errors.map(err => err.params.type).join(', ');
      }
      else {
        message += ' ';
        message += (errors.find(err => err.keyword !== 'type') || {}).message;
      }

      return [{ message }];
    }

    default:
      return errors.map(err => ({
        message: `${errors[0].dataPath} ${errors[0].message}`,
      }));
  }
}

export default BaseModel;
export { STR_ERROR_YAML, STR_ERROR_SCHEMA };
