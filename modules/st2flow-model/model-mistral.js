// @flow

import type { ModelInterface, TaskInterface, TaskRefInterface, TransitionInterface, TransitionType } from './interfaces';
import type { TokenMeta, JpathKey } from '@stackstorm/st2flow-yaml';

import { crawler, util, TokenSet } from '@stackstorm/st2flow-yaml';
import BaseModel from './base-model';

// The model schema is generated in the mistral repo. Do not update it manually!
// Speak to Winson about getting generated schema.
import schema from './schemas/mistral.json';

const EMPTY_ARRAY = [];
const STATUSES = [ 'Success', 'Error', 'Complete' ];
const OMIT_KEYS = [ 'version', 'name', 'description', 'tags' ];
const STR_KEY_SEPERATOR = '/';
const REG_COORDS = /\[\s*(\d+)\s*,\s*(\d+)\s*\]/;

type NextItem = string | { [string]: string };

type RawTask = {
  __meta: TokenMeta,
  action: string,
  input: Object,
  'on-success'?: Array<NextItem>,
  'on-error'?: Array<NextItem>,
  'on-complete'?: Array<NextItem>,
  'with-items'?: string,
  join?: string,
  concurrency: number | string,
  'pause-before': number | string,
  'wait-before': number | string,
  'wait-after': number | string,
  timeout: number | string,
  retry: {
    count: number | string,
    delay: number | string,
    'continue-on': string,
    'break-on': string,
  },
  publish: Object,
  'publish-on-error': Object,
};

export default class MistralModel extends BaseModel implements ModelInterface {
  static runner_types = [
    'mistral',
    'mistral-v2',
  ]

  static minimum = 'version: \'2.0\'\nmain:\n  tasks: {}\n';

  constructor(yaml: ?string) {
    super(schema, yaml);
  }

  get description() {
    let val = super.description;

    // If a root level description is not available,
    // find one from one of the workflows.
    if(!val) {
      const workflows = getWorkflows(this.tokenSet);
      Object.keys(workflows).some(wfName => {
        const workflow = workflows[ wfName ];

        if(workflow.description) {
          val = workflow.description;
          return true; // break
        }

        return false;
      });
    }

    return val;
  }

  get tasks() {
    const flatTasks = getWorkflowTasksMap(this.tokenSet);

    const tasks: Array<TaskInterface> = Array.from(flatTasks, ([ key, task ]) => {
      let coords;
      if(task.__meta && REG_COORDS.test(task.__meta.comments)) {
        const match = task.__meta.comments.match(REG_COORDS);
        if (match) {
          const [ , x, y ] = match;
          coords = {
            x: +x,
            y: +y,
          };
        }
      }

      const {
        action = '',
        input = {}, 
        ...restTask
      } = task;
      const [ actionRef, ...inputPartials ] = action.split(' ');

      if (inputPartials.length) {
        task.__meta.inlineInput = true;
      }

      return {
        name: joinTaskName(key, this.tokenSet),
        action: actionRef,
        size: { x: 120, y: 48 },
        coords: { x: 0, y: 0, ...coords },
        input: {
          ...input,
        },
        'with-items': restTask['with-items'],
        join: restTask.join,
        concurrency: restTask.concurrency,
        'pause-before': restTask['pause-before'],
        'wait-before': restTask['wait-before'],
        'wait-after': restTask['wait-after'],
        timeout: restTask.timeout,
        retry: restTask.retry,
        publish: restTask.publish,
        'publish-on-error': restTask['publish-on-error'],
      };
    });

    return tasks;
  }

  get transitions() {
    if(!this.tokenSet) {
      return [];
    }

    const transitions = [];
    const tasks = getWorkflowTasksMap(this.tokenSet);
    const keys = Array.from(tasks.keys());

    tasks.forEach((task: RawTask, key: Array<string>) => {
      STATUSES.forEach(status => {
        (task[`on-${status.toLowerCase()}`] || EMPTY_ARRAY).forEach(next => {
          // NOTE: The first item in the "key" array will always be
          // the workflow name at this point in time.
          const toName = getToName(next);

          if(keys.find(k => k[0] === key[0] && k[1] === toName)) {
            transitions.push({
              type: status,
              condition: typeof next === 'string' ? null : next[toName],
              from: {
                name: joinTaskName(key, this.tokenSet),
              },
              to: [{
                // The first item in the fromKey will be the workflow name
                name: joinTaskName([ key[0], toName ], this.tokenSet),
              }],
            });
          }
        });
      });
    });

    return transitions;
  }

  addTask(task: TaskInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { name, coords, ...data } = task;

    if(coords) {
      util.defineExpando(data, '__meta', {
        comments: `[${coords.x}, ${coords.y}]`,
      });
    }

    const [ workflowName, taskName ] = splitTaskName(name, this.tokenSet);
    const key = [ workflowName, 'tasks', taskName ];

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    crawler.set(this.tokenSet, key, data);
    this.endMutation(oldTree);
  }

  addTransition(transition: TransitionInterface) {
    const { oldData, oldTree } = this.startMutation();
    const [ fromWorkflowName, fromTaskName ] = splitTaskName(transition.from.name, this.tokenSet);
    const [ toWorkflowName, toTaskName ] = splitTaskName(transition.to[0].name, this.tokenSet);

    if(fromWorkflowName !== toWorkflowName) {
      this.emitError(new Error('Cannot create transitions between two different workflows'));
      return;
    }

    const type = `on-${(transition.type || 'complete').toLowerCase()}`;
    const key = [ fromWorkflowName, 'tasks', fromTaskName, type ];
    const next = transition.condition ? { [toTaskName]: transition.condition } : toTaskName;

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    const existing = crawler.getValueByKey(this.tokenSet, key);
    if(existing) {
      // creates a new array item
      crawler.set(this.tokenSet, key.concat('#'), next);
    }
    else {
      crawler.set(this.tokenSet, key, [ next ]);
    }

    this.endMutation(oldTree);
  }

  updateTask(ref: TaskRefInterface, newData: TaskInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { name, coords, ...data } = newData;
    const [ workflowName, oldTaskName ] = splitTaskName(ref.name, this.tokenSet);
    const key = [ workflowName, 'tasks', oldTaskName ];

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    if (name && ref.name !== name) {
      crawler.renameMappingKey(this.tokenSet, key, name);
      key.splice(-1, 1, name);
    }

    if (coords) {
      const comments = crawler.getCommentsForKey(this.tokenSet, key) || '[0, 0]';
      crawler.setCommentForKey(this.tokenSet, key, comments.replace(REG_COORDS, `[${coords.x.toFixed()}, ${coords.y.toFixed()}]`));
    }

    Object.keys(data).forEach(k => {
      crawler.set(this.tokenSet, key.concat(k), data[k]);
    });

    this.endMutation(oldTree);
  }

  setTaskProperty(ref: TaskRefInterface, path: JpathKey , value: any) {
    const { oldData, oldTree } = this.startMutation();
    const [ workflowName, taskName ] = splitTaskName(ref.name, this.tokenSet);
    const key = [ workflowName, 'tasks', taskName ].concat(path);

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    crawler.set(this.tokenSet, key, value);

    this.endMutation(oldTree);
  }

  deleteTaskProperty(ref: TaskRefInterface, path: JpathKey) {
    const { oldData, oldTree } = this.startMutation();
    const [ workflowName, taskName ] = splitTaskName(ref.name, this.tokenSet);
    const key = [ workflowName, 'tasks', taskName ].concat(path);

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    crawler.deleteMappingItem(this.tokenSet, key);

    this.endMutation(oldTree);
  }

  updateTransition(oldTransition: TransitionInterface, newData: TransitionInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { type: oldType, condition: oldCondition, from: oldFrom, to: oldTo } = oldTransition;
    const [ oldFromWorkflowName, oldFromTaskName ] = splitTaskName(oldFrom.name, this.tokenSet);
    const [ oldToWorkflowName, oldToTaskName ] = splitTaskName(oldTo[0].name, this.tokenSet);
    const oldKey = [ oldFromWorkflowName, 'tasks', oldFromTaskName, transitionTypeKey(oldType) ];

    if(oldData.workflows) {
      oldKey.unshift('workflows');
    }

    const oldTransitions = util.get(oldData, oldKey);

    if(!oldTransitions || !oldTransitions.length) {
      this.emitError(new Error(`Could not find transitions at path ${oldKey.join('.')}`));
      return;
    }

    const oldIndex = oldTransitions.findIndex(tr => {
      return (typeof tr === 'string' && tr === oldToTaskName) || tr[oldToTaskName] === oldCondition;
    });

    if(oldIndex === -1) {
      this.emitError(new Error(`Could not find transition to update at path ${oldKey.join('.')}`));
      return;
    }

    const { type: newType, condition: newCondition, from: newFrom, to: newTo } = newData;
    const [ newFromWorkflowName, newFromTaskName ] = newFrom ? splitTaskName(newFrom.name, this.tokenSet) : [ oldFromWorkflowName, oldFromTaskName ];
    const [ newToWorkflowName, newToTaskName ] = newTo && newTo.length ? splitTaskName(newTo[0].name, this.tokenSet) : [ oldToWorkflowName, oldToTaskName ];

    if(newFromWorkflowName !== newToWorkflowName) {
      this.emitError(new Error('Cannot create transitions between two different workflows'));
      return;
    }

    const newKey = [ newFromWorkflowName, 'tasks', newFromTaskName/*, transitionTypeKey(newType || oldType)*/ ];

    if(oldData.workflows) {
      newKey.unshift('workflows');
    }

    if(newData.hasOwnProperty('type')) {
      if(newType !== oldType) {
        crawler.spliceCollection(this.tokenSet, oldKey, oldIndex, 1);
      }

      newKey.push(transitionTypeKey(newType));
    }
    else {
      newKey.push(transitionTypeKey(oldType));
    }

    let newIndex;
    if(oldFromWorkflowName !== newFromWorkflowName || oldFromTaskName !== newFromTaskName) {
      // The transition moved to a new "from" task, delete the old one
      crawler.spliceCollection(this.tokenSet, oldKey, oldIndex, 1);
      newIndex = '#'; // creates a new item in the new "from" task
    }
    else {
      newIndex = oldIndex;
    }

    let next;
    if(newData.hasOwnProperty('condition')) {
      next = newCondition ? { [newToTaskName]: newCondition } : newToTaskName;
    }
    else {
      next = oldCondition ? { [newToTaskName]: oldCondition } : newToTaskName;
    }

    const existing = util.get(oldData, newKey);
    if(existing) {
      // Update existing list
      crawler.set(this.tokenSet, newKey.concat(newIndex), next);
    }
    else {
      crawler.set(this.tokenSet, newKey, [ next ]);
    }

    this.endMutation(oldTree);
  }

  setTransitionProperty({ from, to, type, condition }: TransitionInterface, path: JpathKey, value: any) {
    const { oldTree } = this.startMutation();
    const [ fromWorkflowName, fromTaskName ] = splitTaskName(from.name, this.tokenSet);
    const [ /*toWorkflowName*/, toTaskName ] = splitTaskName(to[0].name, this.tokenSet);
    const typeKey = transitionTypeKey(type);
    const key = [ fromWorkflowName, 'tasks' ];

    const rawTasks = crawler.getValueByKey(this.tokenSet, key);
    const task: RawTask = rawTasks[fromTaskName];

    if(!task || !task[typeKey]) {
      throw new Error(`No transition type "${typeKey}" found coming from task "${fromTaskName}"`);
    }

    key.push(fromTaskName, typeKey);

    const transitionIndex = task[typeKey].findIndex(tr =>
      (typeof tr === 'string' && tr === toTaskName) || tr.hasOwnProperty(toTaskName) && tr[toTaskName] === condition
    );

    if (transitionIndex === -1) {
      if (condition) {
        throw new Error(`No transition to "${toTaskName}" with condition "${condition}" found in task "${fromTaskName}"`);
      }
      else {
        throw new Error(`No transition to "${toTaskName}" found in task "${fromTaskName}"`);
      }
    }

    crawler.set(this.tokenSet, key.concat(transitionIndex, path), value);

    this.endMutation(oldTree);
  }

  deleteTask(ref: TaskRefInterface) {
    const { oldData, oldTree } = this.startMutation();
    const [ workflowName, taskName ] = splitTaskName(ref.name, this.tokenSet);
    const key = [ workflowName, 'tasks', taskName ];

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    crawler.deleteMappingItem(this.tokenSet, key);
    this.endMutation(oldTree);
  }

  deleteTransition(transition: TransitionInterface) {
    const { oldData, oldTree } = this.startMutation();
    const { to, from, type, condition } = transition;
    const [ fromWorkflowName, fromTaskName ] = splitTaskName(from.name, this.tokenSet);

    const key = [ fromWorkflowName, 'tasks', fromTaskName, transitionTypeKey(type) ];

    if(oldData.workflows) {
      key.unshift('workflows');
    }

    const transitions = crawler.getValueByKey(this.tokenSet, key);
    const index = transitions.findIndex((tr, i) => {
      return (typeof tr === 'string' && tr === to[0].name) || tr[to[0].name] === condition;
    });

    if(index !== -1) {
      crawler.spliceCollection(this.tokenSet, key, index, 1);
    }

    this.endMutation(oldTree);
  }

  getRangeForTask(task: TaskRefInterface) {
    const [ workflowName, taskName ] = splitTaskName(task.name, this.tokenSet);
    return crawler.getRangeForKey(this.tokenSet, [ workflowName, 'tasks', taskName ]);
  }
}

/**
 * Returns a Map of RawTasks where the key is an array:
 *
 * [workflowName, taskName] -> RawTask
 *
 */
function getWorkflowTasksMap(tokenSet: TokenSet): Map<Array<string>, RawTask>  {
  const flatTasks = new Map();

  if(tokenSet) {
    const workflows = getWorkflows(tokenSet);

    Object.keys(workflows).forEach(workflowName => {
      const workflow = workflows[ workflowName ];
      workflow.tasks && Object.keys(workflow.tasks).forEach(taksName =>
        flatTasks.set([ workflowName, taksName ], {
          ...workflow.tasks[taksName],
          workflow: workflowName,
          __meta: workflow.tasks[taksName].__meta,
        })
      );
    }, []);
  }

  return flatTasks;
}

function getWorkflows(tokenSet: TokenSet): Object {
  const data = tokenSet.toObject();
  return data.workflows || util.omit(data, ...OMIT_KEYS);
}

function getToName(next: NextItem): string {
  return typeof next === 'string' ? next : Object.keys(next)[0];
}

function transitionTypeKey(type: TransitionType = 'Complete') {
  return `on-${type.toLowerCase()}`;
}

function joinTaskName(key: Array<string>, tokenSet: TokenSet): string {
  const workflows = getWorkflows(tokenSet);
  const wfNames = Object.keys(workflows);

  // If there are multiple workflows, prepend the task name with
  // the workflow name. Otherwise, use just the task name.
  return wfNames.length === 1 ? key[1] : key.join(STR_KEY_SEPERATOR);
}

function splitTaskName(name: string, tokenSet: TokenSet): Array<string> {
  const workflows = getWorkflows(tokenSet);

  // If we find a workflow name at the beginning of the name, then
  // split it there. Sorting by longest workflow first is important
  // b/c both workflow names and task names can contain slashes.
  const wfNames = Object.keys(workflows);
  const workflowName = wfNames
    .sort((a, b) => b.length - a.length)
    .find(wfName => name.indexOf(`${wfName}${STR_KEY_SEPERATOR}`) === 0);

  if(!workflowName) {
    // Most of the time there will only be one workflow.
    return [ wfNames.pop(), name ];
  }

  return [ workflowName, name.slice(workflowName.length + 1) ];
}
