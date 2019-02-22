import { createScopedStore } from '@stackstorm/module-store';

import { models, OrquestaModel } from '@stackstorm/st2flow-model';
import Graph from '@stackstorm/st2flow-graph';
import { layout } from '@stackstorm/st2flow-model/layout';
import MetaModel from '@stackstorm/st2flow-model/model-meta';

let workflowModel = new OrquestaModel();
const metaModel = new MetaModel();
const graph = new Graph();

function workflowModelGetter(model) {
  const { tasks, transitions, errors } = model;

  const lastIndex = tasks
    .map(task => (task.name.match(/task(\d+)/) || [])[1])
    .reduce((acc, item) => Math.max(acc, item || 0), 0);

  return {
    workflowSource: model.toYAML(),
    ranges: getRanges(model),
    tasks,
    nextTask: `task${lastIndex + 1}`,
    transitions,
    notifications: errors.map(e => ({ type: 'error', message: e.message })),
  };
}

function metaModelGetter(model) {
  return {
    metaSource: model.toYAML(),
    meta: model.tokenSet.toObject(),
  };
}

function getRanges(model) {
  const ranges = {};

  model.tasks.forEach(task => {
    ranges[task.name] = workflowModel.getRangeForTask(task);
  });

  return ranges;
}

const flowReducer = (state = {}, input) => {
  const {
    workflowSource = workflowModel.constructor.minimum,
    metaSource = '',
    pack = 'default',
    meta = {
      runner_type: 'orquesta',
    },
    tasks = [],
    transitions = [],
    ranges = {},
    notifications = [],
    nextTask = 'task1',

    panels = [],

    actions = [],

    navigation = {},
  } = state;

  state = {
    ...state,
    workflowSource,
    metaSource,
    pack,
    meta,
    tasks,
    transitions,
    ranges,
    notifications,
    nextTask,

    panels,

    actions,

    navigation,
  };

  switch (input.type) {
    // Workflow Model
    case 'MODEL_ISSUE_COMMAND': {
      const { command, args } = input;

      console.log(command);

      if (!workflowModel[command]) {
        return state;
      }

      if (graph[command]) {
        graph[command](...args);
      }
      else{
        console.log(`No graph function for ${command}`);
      }

      if (!workflowModel.tokenSet) {
        workflowModel.fromYAML(workflowModel.constructor.minimum);
      }

      workflowModel[command](...args);

      return {
        ...state,
        ...workflowModelGetter(workflowModel),
      };
    }

    case 'MODEL_LAYOUT': {
      layout(workflowModel);

      return {
        ...state,
        ...workflowModelGetter(workflowModel),
      };
    }

    // Metadata Model
    case 'META_ISSUE_COMMAND': {
      const { command, args } = input;

      if (!metaModel[command]) {
        return state;
      }

      if (!metaModel.tokenSet) {
        metaModel.fromYAML(metaModel.constructor.minimum);
      }

      metaModel[command](...args);

      const runner_type = metaModel.get('runner_type');
      if (runner_type && runner_type !== meta.runner_type) {
        const Model = models[runner_type];

        workflowModel = new Model(workflowSource);

        if (!workflowModel.tokenSet) {
          workflowModel.fromYAML(workflowModel.constructor.minimum);
        }

        state = {
          ...state,
          ...workflowModelGetter(workflowModel),
        };
      }

      return {
        ...state,
        ...metaModelGetter(metaModel),
      };
    }

    case 'PUSH_ERROR': {
      const { error } = input;

      return {
        ...state,
        notifications: [ ...notifications, { type: 'error', message: error }],
      };
    }

    case 'PUSH_SUCCESS': {
      const { message } = input;

      return {
        ...state,
        notifications: [ ...notifications, { type: 'success', message }],
      };
    }

    // CollapseModel
    case 'PANEL_TOGGLE_COLLAPSE': {
      const { name } = input;

      return {
        ...state,
        panels: {
          ...panels,
          [name]: !panels[name],
        },
      };
    }

    //ActionsModel
    case 'FETCH_ACTIONS': {
      const { status, payload } = input;

      if (status === 'success') {
        return {
          ...state,
          actions: payload,
        };
      }

      return state;
    }

    //NavigationModel
    case 'CHANGE_NAVIGATION': {
      const { navigation } = input;

      return {
        ...state,
        navigation: {
          ...state.navigation,
          ...navigation,
        },
      };
    }

    case 'LOAD_WORKFLOW': {
      const { currentWorkflow, status, payload } = input;

      const [ pack ] = currentWorkflow.split('.');

      const newState = {
        ...state,
        pack,
        currentWorkflow,
      };

      if (status === 'success') {
        const { workflowSource, metaSource } = payload;

        metaModel.applyDelta(null, metaSource);

        const runner_type = metaModel.get('runner_type');
        const Model = models[runner_type];

        if (workflowModel instanceof Model) {
          workflowModel.applyDelta(null, workflowSource);
        }
        else {
          workflowModel = new Model(workflowSource);
        }

        if (workflowModel.tasks.every(({ coords }) => !coords.x && !coords.y)) {
          layout(workflowModel);
        }

        return {
          ...newState,
          metaSource,
          workflowSource,
          ...metaModelGetter(metaModel),
          ...workflowModelGetter(workflowModel),
        };
      }

      return newState;
    }

    default:
      return state;
  }
};

const prevRecords = [];
const nextRecords = [];

const undoReducer = (prevState = {}, state = {}, input) => {
  switch (input.type) {
    case 'META_ISSUE_COMMAND':
    case 'MODEL_LAYOUT':
    case 'MODEL_ISSUE_COMMAND': {
      const historyRecord = {};

      if (prevState.workflowSource !== state.workflowSource) {
        historyRecord.workflowSource = prevState.workflowSource;
      }

      if (prevState.metaSource !== state.metaSource) {
        historyRecord.metaSource = prevState.metaSource;
      }

      if (Object.keys(historyRecord).length !== 0) {
        prevRecords.push(historyRecord);
      }

      return state;
    }

    case 'FLOW_UNDO': {
      const historyRecord = prevRecords.pop();

      if (!historyRecord) {
        return state;
      }

      const { workflowSource, metaSource } = historyRecord;
      const futureRecord = {};

      if (workflowSource !== undefined) {
        futureRecord.workflowSource = state.workflowSource;

        workflowModel.applyDelta(null, workflowSource);
        const parsedWorkflow = workflowModelGetter(workflowModel);

        state = {
          ...state,
          ...parsedWorkflow,
          notifications: [ ...(state.notifications || []), ...(parsedWorkflow.notifications || []) ],
        };
      }

      if (metaSource !== undefined) {
        futureRecord.metaSource = state.metaSource;

        metaModel.applyDelta(null, metaSource);

        state = {
          ...state,
          ...metaModelGetter(metaModel),
        };
      }

      nextRecords.push(futureRecord);

      return state;
    }

    case 'FLOW_REDO': {
      const historyRecord = nextRecords.pop();

      if (!historyRecord) {
        return state;
      }

      const { workflowSource, metaSource } = historyRecord;
      const pastRecord = {};

      if (workflowSource !== undefined) {
        pastRecord.workflowSource = state.workflowSource;

        workflowModel.applyDelta(null, workflowSource);
        const parsedWorkflow = workflowModelGetter(workflowModel);

        state = {
          ...state,
          ...parsedWorkflow,
          notifications: [ ...(state.notifications || []), ...(parsedWorkflow.notifications || []) ],
        };
      }

      if (metaSource !== undefined) {
        pastRecord.metaSource = state.metaSource;

        metaModel.applyDelta(null, metaSource);

        state = {
          ...state,
          ...metaModelGetter(metaModel),
        };
      }

      prevRecords.push(pastRecord);

      return state;
    }

    case 'SET_PACK': {
      const { pack } = input;
      return {
        ...state,
        pack,
      };
    }

    default:
      return state;
  }
};

const reducer = (state = {}, action) => {
  const nextState = flowReducer(state, action);
  state = undoReducer(state, nextState, action);

  return state;
};

const store = createScopedStore('flow', reducer);

export default store;
