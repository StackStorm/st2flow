import Task from './task';

export default class Workflow extends Task {
  variables = new Set()
  tasks = new Set()
}
