// @flow

import { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionRefInterface } from './interfaces';

export default class OrchestraModel implements ModelInterface {
  tasks = []
  transitions = []


  constructor(yaml: string) {

  }

  toYAML() {
    return '';
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
