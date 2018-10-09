// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface } from './interfaces';

import { crawler } from '@stackstorm/st2flow-yaml';
import BaseModel, { STR_ERROR_SCHEMA }  from './base-model';

// TODO: replace with reference to generated schema in orquesta repo:
// https://github.com/StackStorm/orquesta/blob/master/orquesta/specs/native/v1/models.py
import schema from './schemas/orquesta.json';

class OrquestaModel extends BaseModel implements ModelInterface {
  constructor(yaml: ?string) {
    super(schema, yaml);
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

export default OrquestaModel;
