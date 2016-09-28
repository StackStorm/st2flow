import _ from 'lodash';

import Range from '../util/range';


export class YaqlCompletion {
  getCompletions(sector, model) {
    const results = [];

    const completer = {
      insertMatch: (editor, { value }) => {
        const pos = editor.getCursorPosition();
        const position = Range.fromPoints(pos, pos);
        const sectors = model.search(position, 'yaqlvariable');

        return editor.env.document.replace(sectors[0], value);
      }
    };

    for (const variable of sector.workflow.variables) {
      const suggestion = {
        caption: variable,
        value: variable,
        score: 2,
        meta: 'variable',
        completer
      };

      results.push(suggestion);
    }

    for (const task of sector.workflow.tasks) {
      const suggestion = {
        caption: task.properties.name,
        value: task.properties.name,
        score: 2,
        meta: 'task',
        completer
      };

      results.push(suggestion);
    }

    return results;
  }
}

export class TaskCompletion {
  keywords = [];

  update(keywords) {
    this.keywords = keywords;
  }

  getCompletions(sector) {
    const properties = {
      ref: 'action'
    };

    const present = _(sector.task.properties)
      .keys()
      .map((property) => {
        return properties[property] || property;
      }).value();

    return _(this.keywords).filter((keyword) => {
      return !_.includes(present, keyword.name);
    }).map((keyword) => {
      const suggestion = {
        caption: keyword.name,
        value: keyword.name,
        score: 1,
        meta: 'syntax'
      };

      if (keyword.type === 'string') {
        suggestion.value += ': ';
      }

      if (keyword.type === 'object') {
        const relativeIndent = sector.task.indent.replace(sector.task.starter, '');
        suggestion.value += ':\n' + sector.task.indent + relativeIndent;
      }

      if (keyword.type === 'array') {
        const relativeIndent = sector.task.indent.replace(sector.task.starter, '');
        suggestion.value += ':\n' + sector.task.indent + relativeIndent + '- ';
      }

      return suggestion;
    }).value();
  }
}

export class InputCompletion {
  actions = {}

  update(actions) {
    const keys = _.map(actions, 'ref');
    const values = _.map(actions, (action) => {
      return _.map(action.parameters, (prop, name) => {
        return _.assign({}, prop, {name});
      });
    });

    this.actions = _.zipObject(keys, values);
  }

  getCompletions(sector) {
    const action = sector.task.getProperty('ref');

    return _.map(this.actions[action], (parameter) => {
      return {
        caption: parameter.name,
        value: parameter.name + ': ',
        score: 1,
        meta: 'parameters'
      };
    });
  }
}

export default class Completer {
  constructor(model, completions) {
    this.model = model;
    this.completions = completions;
  }

  getCompletions(editor, session, pos, prefix, callback) {
    const position = Range.fromPoints(pos, pos);
    const sectors = this.model.search(position);

    if (!sectors.length) {
      return;
    }

    let results = [];

    for (const sector of sectors) {
      const type = sector.type;
      const completion = this.completions[type];
      for (const suggestion of completion && completion.getCompletions(sector, this.model) || []) {
        results = results.concat(suggestion);
      }
    }

    return callback(null, results);
  }
}