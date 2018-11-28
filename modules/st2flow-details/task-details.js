//@flow

import type { TransitionRefInterface } from '@stackstorm/st2flow-model/interfaces';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import AutoForm from '@stackstorm/module-auto-form';
import Button from '@stackstorm/module-forms/button.component';
import { Panel, Toolbar, ToolbarButton } from './layout';
import Property from './property';

import StringField from '@stackstorm/module-auto-form/fields/string';

import Task from './task';
import MistralTransition from './mistral-transition';
import OrquestaTransition from './orquesta-transition';

import style from './style.css';

class EmptyTransition extends Component<{},{}> {
  render() {
    return false;
  }
}

type TaskDetailsProps = {
  meta: Object,

  tasks: Array<Object>,
  transitions: Array<Object>,
  issueModelCommand: Function,

  navigation: Object,
  navigate: Function,

  actions: Array<Object>,

  selected: string,
  onBack: Function,
};

@connect(
  ({ flow: { actions, navigation, tasks, transitions, meta }}) => ({ actions, navigation, tasks, transitions, meta }),
  (dispatch) => ({
    issueModelCommand: (command, ...args) => {
      dispatch({
        type: 'MODEL_ISSUE_COMMAND',
        command,
        args,
      });
    },
    navigate: (navigation) => dispatch({
      type: 'CHANGE_NAVIGATION',
      navigation,
    }),
  })
)
export default class TaskDetails extends Component<TaskDetailsProps, {
  rename: bool,
  name: string,
}> {
  static propTypes = {
    meta: PropTypes.object,

    tasks: PropTypes.array,
    transitions: PropTypes.array,
    issueModelCommand: PropTypes.func,

    navigation: PropTypes.object,
    navigate: PropTypes.func,

    actions: PropTypes.array,

    selected: PropTypes.string,
    onBack: PropTypes.func.isRequired,
  }

  constructor(props: TaskDetailsProps) {
    super(props);
    this.state = {
      rename: false,
      name: props.selected,
    };
  }

  handleNameChange(name: string) {
    this.setState({ name });
  }

  handleToggleRename() {
    const { rename } = this.state;
    const { selected } = this.props;
    this.setState({ rename: !rename, name: selected });
  }

  handleTaskRename(ref: string, name: string) {
    const { selected, issueModelCommand } = this.props;

    issueModelCommand('updateTask', { name: ref }, { name });

    if (selected === ref) {
      this.props.navigate({ toTasks: undefined, task: name });
    }
    this.setState({ rename: false });
  }

  handleTaskFieldChange(field: string, value: Object) {
    const { selected, issueModelCommand } = this.props;
    issueModelCommand('updateTask', { name: selected }, { [field]: value });
  }

  handleTaskProperty(name: string | Array<string>, value: any) {
    const { selected, issueModelCommand } = this.props;

    if (value) {
      issueModelCommand('setTaskProperty', { name: selected }, name, value);
    }
    else {
      issueModelCommand('deleteTaskProperty', { name: selected }, name);
    }
  }

  handleSectionSwitch(section: string) {
    this.props.navigate({ section });
  }

  style = style
  joinFieldRef = React.createRef();

  render() {
    const { selected, onBack, actions, navigation, tasks, transitions, meta } = this.props;
    const { section = 'input', toTasks } = navigation;
    const { name, rename } = this.state;

    const task = selected && tasks.find(task => task.name === selected);
    const taskNames = selected && tasks.map(task => task.name);

    if (!task) {
      return false;
    }

    const trans = !!selected && transitions
      .filter(transition => transition.from.name === task.name)
      .reduce((acc, transition) => {
        const t = acc.find(t => t.condition === transition.condition);
        if (!t) {
          return acc.concat({ ...transition });
        }
        t.to = t.to.concat(transition.to);
        return acc;
      }, []);

    const action = actions.find(({ref}) => ref === task.action);

    const Transition = (() => {
      switch (meta.runner_type) {
        case 'mistral':
        case 'mistral-v2':
          return MistralTransition;
        case 'orquesta':
          return OrquestaTransition;
        default:
          return EmptyTransition;
      }
    })();

    return ([
      <Toolbar key="toolbar" secondary={true} >
        <ToolbarButton
          className="icon-chevron_left"
          onClick={() => onBack()}
        />
        {
          rename
            ? (
              <div className={this.style.input} >
                <StringField value={name} onChange={name => this.handleNameChange(name)} />
              </div>
            )
            : <Task task={task} />
        }
        {
          rename
            && (
              <div className={cx(this.style.button, this.style.rename)} >
                <Button onClick={() => this.handleTaskRename(task.name, name)} value="Rename" disabled={task.name === name ? 'disabled' : ''} />
              </div>
            )
        }
        <div className={cx(this.style.button, this.style.edit)} >
          <Button onClick={() => this.handleToggleRename()} value={rename ? 'Cancel' : 'Edit'} />
        </div>
      </Toolbar>,
      <Toolbar key="subtoolbar" secondary={true} >
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('input')} selected={section === 'input'}>Input</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('properties')} selected={section === 'properties'}>Properties</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('transitions')} selected={section === 'transitions'}>Transitions</ToolbarButton>
      </Toolbar>,
      section === 'input' && (
        <Panel key="input">
          <AutoForm
            spec={{
              type: 'object',
              properties: action && action.parameters || {},
            }}
            data={task.input}
            onChange={(runValue) => this.handleTaskFieldChange('input', { ...task.input, ...runValue })}
          />
        </Panel>
      ),
      section === 'properties' && (
        <Panel key="properties">
          <Property name="Join" description="Allows to synchronize multiple parallel workflow branches and aggregate their data."  value={!!task.join} onChange={value => this.handleTaskProperty('join', value ? 'all' : false)}>
            {
              task.join && (
                <div className={cx(this.style.propertyChild, this.style.radioGroup)}>
                  <div className={cx(this.style.radio, task.join === 'all' && this.style.checked)} onClick={() => this.handleTaskProperty('join', 'all')}>
                    Join all tasks
                  </div>
                  <label htmlFor="joinField" className={cx(this.style.radio, task.join !== 'all' && this.style.checked)} onClick={(e) => this.handleTaskProperty('join', parseInt((this.joinFieldRef.current || {}).value, 10))} >
                    Join <input type="text" id="joinField" size="3" className={this.style.radioField} ref={this.joinFieldRef} value={isNaN(task.join) ? 10 : task.join} onChange={e => this.handleTaskProperty('join', parseInt(e.target.value, 10))} /> tasks
                  </label>
                </div>
              )
            }
          </Property>
          <Property name="With Items" description="Run an action or workflow associated with a task multiple times." value={!!task.with} onChange={value => this.handleTaskProperty('with', value ? { items: 'x in <% ctx(y) %>' } : false)}>
            {
              task.with && (
                <div className={this.style.propertyChild}>
                  <StringField name="items" value={task.with.items} onChange={value => this.handleTaskProperty([ 'with', 'items' ], value)} />
                  <StringField name="concurrency" value={task.with.concurrency} onChange={value => this.handleTaskProperty([ 'with', 'concurrency' ], value)} />
                </div>
              )
            }
          </Property>
        </Panel>
      ),
      section === 'transitions' && (
        <Panel key="transitions">
          {
            (trans || []).map((transition, index) => {
              // TODO: this logic could result in false positives - we need to compare conidtions too
              const selected = toTasks && toTasks.length === transition.to.length && transition.to.every((t, i) => toTasks[i] === t.name);
              return <Transition key={index} selected={selected} transition={transition} taskNames={taskNames} />;
            })
          }
          <div className={this.style.transitionInfo}>
            To add a transition, hover over a task box and drag the connector to the desired task box you want to transition to.
          </div>
        </Panel>
      ),
    ]);
  }
}
