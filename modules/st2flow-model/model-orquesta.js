// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface } from './interfaces';
import { TokenSet } from '@stackstorm/st2flow-yaml';
import type { DeltaInterface, AjvError, GenericError } from './interfaces';

import Ajv from 'ajv';
import { diff } from 'deep-diff';
import EventEmitter from 'eventemitter3';

import { crawler } from '@stackstorm/st2flow-yaml';
import { STR_ERROR_SCHEMA }  from './base-model';

const ajv = new Ajv();
const STR_ERROR_YAML = 'yaml-error';

// TODO: replace with reference to generated schema in orquesta repo:
// https://github.com/StackStorm/orquesta/blob/master/orquesta/specs/native/v1/models.py
import schema from './schemas/orquesta.json';

class OrquestaModel implements ModelInterface {
  modelName: string;
  tokenSet: TokenSet;
  emitter: EventEmitter;

  constructor(yaml: ?string) {
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

  get tasks(): Array<TaskInterface> {
    const tasks = crawler.getValueByKey(this.tokenSet, 'tasks');

    if(!tasks) {
      // TODO: make part of schema validation
      this.emitter.emit(STR_ERROR_SCHEMA, new Error('No tasks found.'));
      return [];
    }

    return tasks.__keys.map(name =>
      Object.assign({}, {
        name,
        size: { x: 120, y: 48 },
      }, tasks[name], {
        coords: { x: 0, y: 0, ...tasks[name].coords },
      })
    );
  }

  get transitions(): Array<TransitionInterface> {
    return this.tasks.reduce((arr, task) => {
      if(task.hasOwnProperty('next')) {
        task.next.forEach((nxt, i) => {
          let to;

          // nxt.do can be a string, comma delimited string, or array
          if(typeof nxt.do === 'string') {
            to = nxt.do.split(',').map(name => name.trim());
          }
          else if(Array.isArray(nxt.do)) {
            to = nxt.do;
          }
          else {
            to = [];
            this.emitter.emit(STR_ERROR_SCHEMA, new Error(`Task "${task.name}" transition #${i + 1} must define the "do" property.`));
          }

          to.forEach(name => {
            const transition: TransitionInterface = {
              from: { name: task.name },
              to: { name },
            };

            if(nxt.when) {
              transition.condition = nxt.when;
            }

            // TODO: figure out how to compute transition.type?
            arr.push(transition);
          });
        });
      }

      return arr;
    }, []);
  }

  addTask(task: TaskInterface) {
    const oldData = this.tokenSet.toObject();
    const { name, ...data } = task;
    crawler.assignMappingItem(this.tokenSet, [ 'tasks', name ], data);

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  updateTask(ref: TaskRefInterface, opts: TaskInterface) {
    throw new Error('Not yet implemented');
  }

  deleteTask(ref: TaskRefInterface) {
    throw new Error('Not yet implemented');
  }

  addTransition(opts: TransitionInterface) {
    throw new Error('Not yet implemented');
  }

  updateTransition(ref: TransitionRefInterface, opts: TransitionInterface) {
    throw new Error('Not yet implemented');
  }

  deleteTransition(ref: TransitionRefInterface) {
    throw new Error('Not yet implemented');
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
        message += ` should be one of `;
        message += errors.map(err => err.params.type).join(', ');
      } else {
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

export default OrquestaModel;
