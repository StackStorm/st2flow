// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface } from './interfaces';
import type NestedSet from '@stackstorm/st2flow-yaml/nested-set';
import type { Token } from '@stackstorm/st2flow-yaml/types';

import { readSet as readYaml, write as writeYaml } from '@stackstorm/st2flow-yaml';

const types = {
  'on-complete': 'Success',
};

export default class OrchestraModel implements ModelInterface {
  tokens: NestedSet;


  constructor(yaml: string) {
    this.tokens = readYaml(yaml);
  }

  toYAML() {
    return writeYaml(this.tokens.raw);
  }

  get(key: string) {
    return this.tokens.get(key);
  }


  get version() {
    const version: Token = this.get('version');
    if (version.type !== 'value') {
      throw new Error('invalid orchestra structure');
    }

    return version.value;
  }

  get description() {
    const description: Token = this.get('description');
    if (description.type !== 'value') {
      throw new Error('invalid orchestra structure');
    }

    return description.value;
  }

  get tasks(): Array<TaskInterface> {
    const tasks = this.get('tasks');

    return tasks.keys.map((name: string | number) => {
      if (typeof name !== 'string') {
        throw new Error('invalid orchestra structure');
      }

      const task = tasks.get(name);

      const action: Token = task.get('action');
      if (!action || action.type !== 'value') {
        throw new Error('invalid orchestra structure');
      }

      return {
        name,
        action: action.value,
        coord: { x: 0, y: 0 },
      };
    });
  }

  get transitions() {
    const tasks = this.get('tasks');

    // $FlowFixMe
    return [].concat(...tasks.keys.map((from: string | number) => {
      const task = tasks.get(from);

      const to: Token = task.get('next');
      if (to) {
        return {
          from: { name: from },
          to: { name : to.value },
        };
      }

      return [].concat(...task.keys.filter(key => key !== 'action').map((type: string | number) => {
        const trigger = task.get(type);

        return [].concat(...trigger.keys.map((index: string | number) => {
          const action = trigger.get(index);

          const condition: Token = action.get('if');
          const to: Token = action.get('next');

          return {
            from: { name: from },
            to: { name : to.value },
            type: types[type],
            condition: condition && condition.value,
          };
        }));
      }));
    }));
  }


  addTask(opts: TaskInterface) {

  }

  updateTask(ref: TaskRefInterface, opts: TaskInterface) {

  }

  deleteTask(ref: TaskRefInterface) {

  }


  addTransition(opts: TransitionInterface) {

  }

  updateTransition(ref: TransitionRefInterface, opts: TransitionInterface) {

  }

  deleteTransition(ref: TransitionRefInterface) {

  }
}
