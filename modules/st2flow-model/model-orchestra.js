// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface } from './interfaces';
import type NestedSet from '@stackstorm/st2flow-yaml/nested-set';
import type { Token } from '@stackstorm/st2flow-yaml/types';

import { readSet as readYaml, write as writeYaml } from '@stackstorm/st2flow-yaml';

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

  get tasks(): Array<TaskInterface> {
    const tasks = this.get('tasks');

    return tasks.keys.map((key: string) => {
      const task = tasks.get(key);

      const action: Token = task.get('action');
      if (!action || action.type !== 'value') {
        throw new Error('invalid orchestra structure');
      }

      return {
        name: key,
        action: action.value,
        coord: { x: 0, y: 0 },
      };
    });
  }

  get transitions(): Array<TransitionInterface> {
    return [];
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
