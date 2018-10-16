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

const REG_COORDS = /\[\s*(\d+)\s*,\s*(\d+)\s*\]/;

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

    return tasks.__meta.keys.map(name => {
      let coords;
      if(REG_COORDS.test(tasks[name].__meta.comments)) {
        coords = JSON.parse(tasks[name].__meta.comments.replace(REG_COORDS, '{ "x": $1, "y": $2 }'));
      }

      return Object.assign({}, {
        name,
        size: { x: 120, y: 48 },
      }, tasks[name], {
        coords: { x: 0, y: 0, ...coords },
      })
    });
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

  get lastTaskIndex() {
    return crawler.getValueByKey(this.tokenSet, 'tasks').__meta.keys
      .map(item => (item.match(/task(\d+)/) || [])[1])
      .reduce((acc, item) => Math.max(acc, item || 0), 0);
  }

  applyDelta(delta: DeltaInterface, yaml: string) {
    // Preliminary tests show that parsing of long/complex YAML files
    // takes less than ~20ms (almost always less than 5ms) - so doing full
    // parsing often is very cheap. In the future we can maybe look into applying
    // only the deltas to the AST, though this will likely not be trivial.
    this.fromYAML(yaml);
  }

  addTask(task: TaskInterface) {
    const oldData = this.tokenSet.toObject();
    const { name, ...data } = task;
    crawler.assignMappingItem(this.tokenSet, [ 'tasks', name ], data);

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  updateTask(ref: TaskRefInterface, task: TaskInterface) {
    const oldData = this.tokenSet.toObject();
    const { coords } = task;
    if (coords) {
      crawler.replaceTokenValue(this.tokenSet, [ 'tasks', ref, 'coords' ], coords);
    }

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  deleteTask(ref: TaskRefInterface) {
    const oldData = this.tokenSet.toObject();
    const { name } = ref;
    crawler.deleteMappingItem(this.tokenSet, [ 'tasks', name ]);

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  addTransition(transition: TransitionInterface) {
    const { from, to } = transition;
    const oldData = this.tokenSet.toObject();
    const rawTasks = crawler.getValueByKey(this.tokenSet, 'tasks');
    const task: RawTask = rawTasks[from.name];

    if(!task) {
      throw new Error(`No task found with name "${from.name}"`);
    }

    const hasNext = task.hasOwnProperty('next');
    const next = hasNext && task.next || [];

    const nextItem: NextItem = {
      do: to.name,
    };

    if(transition.condition) {
      nextItem.when = transition.condition;
    }

    next.push(nextItem);

    // TODO: this can be replaced by a more generic "set" method
    crawler[hasNext ? 'replaceTokenValue' : 'assignMappingItem'](this.tokenSet, [ 'tasks', from.name, 'next' ], next);

    const newData = this.tokenSet.toObject();
    this.emitChange(oldData, newData);
  }

  updateTransition(ref: TransitionRefInterface, transition: TransitionInterface) {
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
