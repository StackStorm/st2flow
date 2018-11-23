import { createScopedStore } from '@stackstorm/module-store';

import { OrquestaModel } from '@stackstorm/st2flow-model';
import MetaModel from '@stackstorm/st2flow-model/model-meta';

const workflowModel = new OrquestaModel();
const metaModel = new MetaModel();

const flowReducer = (state = {}, input) => {
  const {
    workflowSource = '',
    metaSource = '',
    tasks = [],
    transitions = [],
    ranges = {},
    errors = [],
    lastTaskIndex = 0,

    panels = [],

    actions = [],

    navigation = {},
  } = state;

  state = {
    ...state,
    workflowSource,
    metaSource,
    tasks,
    transitions,
    ranges,
    errors,
    lastTaskIndex,

    panels,

    actions,

    navigation,
  };

  switch (input.type) {
    case 'CHANGE_LOCATION': {
      // To intercept address bar changes
      return state;
    }

    // Workflow Model
    case 'MODEL_ISSUE_COMMAND': {
      const { command, args } = input;

      if (!workflowModel[command]) {
        return state;
      }

      workflowModel[command](...args);

      const { tasks, transitions, errors } = workflowModel;

      const ranges = {};
      
      tasks.forEach(task => {
        ranges[task.name] = workflowModel.getRangeForTask(task);
      });

      return {
        ...state,
        workflowSource: workflowModel.toYAML(),
        tasks,
        transitions,
        ranges,
        errors,
      };
    }

    // Metadata Model
    case 'META_ISSUE_COMMAND': {
      const { command, args } = input;

      if (!metaModel[command]) {
        return state;
      }

      metaModel[command](...args);

      return {
        ...state,
        metaSource: metaModel.toYAML(),
        meta: metaModel.tokenSet.toObject(),
      };
    }

    case 'META_MODEL_CHANGE': {
      const workflowSource = input.yaml;

      return {
        ...state,
        workflowSource,
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

    default:
      return state;
  }
};

const reducer = (state = {}, action) => {
  state = flowReducer(state, action);

  return state;
};

const store = createScopedStore('flow', reducer);

export default store;
