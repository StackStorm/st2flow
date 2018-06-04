// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface } from './interfaces';
import type NestedSet from '@stackstorm/st2flow-yaml/nested-set';

import { readSet as readYaml, write as writeYaml } from '@stackstorm/st2flow-yaml';

export default class OrchestraModel implements ModelInterface {
  tasks = []
  transitions = []
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
