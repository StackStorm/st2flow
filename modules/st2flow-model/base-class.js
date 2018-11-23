// @flow

import type { DeltaInterface, AjvError, GenericError } from './interfaces';

import Ajv from 'ajv';
import { diff } from 'deep-diff';
import EventEmitter from './event-emitter';

import { TokenSet, crawler, util } from '@stackstorm/st2flow-yaml';

const ajv = new Ajv();
const STR_ERROR_YAML = 'yaml-error';
const STR_ERROR_SCHEMA = 'schema-error';

/**
 * The base class takes YAML and a JSON schema and provides
 * utilities for parsing the YAML, validating data against the
 * given schema, and emitting change/error events. This class is
 * intended to be extended by any model which has editable data whose
 * schema must be validated.
 */
class BaseClass {
  yaml: string;
  modelName: string;
  tokenSet: TokenSet;
  errors: Array<Object>;
  emitter: EventEmitter;

  constructor(schema: Object, yaml: ?string): void {
    this.modelName = this.constructor.name; // OrquestaModel, MistralModel
    this.emitter = new EventEmitter();

    const existing = ajv.getSchema(this.modelName);
    if(!existing || !existing.schema) {
      ajv.addSchema(schema, this.modelName);
    }

    if (yaml) {
      this.fromYAML(yaml);
    }
  }

  fromYAML(yaml: string): void {
    const { oldTree } = this.startMutation();

    try {
      this.tokenSet = new TokenSet(yaml);
      this.yaml = this.tokenSet.yaml;
    }
    catch (ex) {
      // The parser is overly verbose on certain errors, so
      // just grab the relevant parts. Also normalize it to an array.
      const exception = ex.length > 2 ? ex.slice(0, 2) : [].concat(ex);
      this.yaml = yaml;
      this.emitError(exception, STR_ERROR_YAML);

      return;
    }

    this.emitChange(oldTree, this.tokenSet);
  }

  toYAML(): string {
    return this.tokenSet.toYAML();
  }

  on(event: string, callback: Function): void {
    this.emitter.on(event, callback);
  }

  removeListener(event: string, callback: Function): void {
    this.emitter.removeListener(event, callback);
  }

  get(path: string | Array<string | number>) {
    return crawler.getValueByKey(this.tokenSet, path);
  }

  set(path: string | Array<string | number>, value: any) {
    const oldTree = this.tokenSet ? util.deepClone(this.tokenSet.tree) : {};

    crawler.set(this.tokenSet, path, value);

    this.emitChange(oldTree, this.tokenSet);
  }

  applyDelta(delta: DeltaInterface, yaml: string): void {
    // Preliminary tests show that parsing of long/complex YAML files
    // takes less than ~20ms (almost always less than 5ms) - so doing full
    // parsing often is very cheap. In the future we can maybe look into applying
    // only the deltas to the AST, though this will likely not be trivial.
    this.fromYAML(yaml);
  }

  startMutation(): Object {
    return this.tokenSet ? {
      oldTree: util.deepClone(this.tokenSet.tree),
      oldData: this.tokenSet.toObject(),
    } : {
      oldTree: {},
      oldData: {},
    };
  }

  endMutation(oldTree: Object): void {
    this.emitChange(oldTree, this.tokenSet);
  }

  emitChange(oldTree: Object, tokenSet: TokenSet): void {
    this.errors = [];

    const newTree = tokenSet.toObject();
    if(!ajv.validate(this.modelName, newTree)) {
      this.emitError(formatAjvErrors(ajv.errors), STR_ERROR_SCHEMA);
      return;
    }

    const deltas = diff(oldTree, newTree) || [];

    if (deltas.length) {
      this.emitter.emit('change', deltas, tokenSet.toYAML());
    }
  }

  emitError(error: GenericError | Array<GenericError>, type: string = 'error') {
    this.errors = this.errors.concat(error);

    this.emitter.emit(type, error);
  }

  // Temporarily, we're going to use editor's undo manager for that, but we should implement such functionality on model level
  undo() {
    this.emitter.emit('undo');
  }

  redo() {
    this.emitter.emit('redo');
  }
}

function formatAjvErrors(errors: Array<AjvError>): Array<GenericError> {
  let message: string = errors[0].dataPath;

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
        message: `${message} ${errors[0].message}`,
      }));
  }
}

export default BaseClass;
