//@flow

import type { TaskInterface, TransitionRefInterface } from '@stackstorm/st2flow-model/interfaces';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import AutoForm from '@stackstorm/module-auto-form';
import Editor from '@stackstorm/st2flow-editor';
import Button from '@stackstorm/module-forms/button.component';
import { Panel, Toolbar, ToolbarButton } from './layout';
import Property from './property';

import StringField from '@stackstorm/module-auto-form/fields/string';

import Meta from './meta-panel';
import Transition from './transition';

import style from './style.css';

@connect(
  ({ flow: { actions, navigation, tasks, transitions }}) => ({ actions, navigation, tasks, transitions }),
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
class TaskDetails extends Component<{
  tasks: Array<Object>,
  transitions: Array<Object>,
  issueModelCommand: Function,

  navigation: Object,
  navigate: Function,

  actions: Array<Object>,

  selected: string,
  onBack: Function,
}, {
  rename: bool,
  name: string,
}> {
  static propTypes = {
    tasks: PropTypes.array,
    transitions: PropTypes.array,
    issueModelCommand: PropTypes.func,

    navigation: PropTypes.object,
    navigate: PropTypes.func,

    actions: PropTypes.array,

    selected: PropTypes.string,
    onBack: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      rename: false,
      name: props.selected,
    };
  }

  handleNameChange(name) {
    this.setState({ name });
  }

  handleToggleRename() {
    const { rename } = this.state;
    const { selected } = this.props;
    this.setState({ rename: !rename, name: selected });
  }

  handleTaskRename(ref, name) {
    const { selected, issueModelCommand } = this.props;

    issueModelCommand('updateTask', { name: ref }, { name });

    if (selected === ref) {
      this.props.navigate({ toTask: undefined, task: name });
    }
    this.setState({ rename: false });
  }

  handleTaskFieldChange(field, value) {
    const { selected, issueModelCommand } = this.props;
    issueModelCommand('updateTask', { name: selected }, { [field]: value });
  }

  handleTaskProperty(name, value) {
    const { selected, issueModelCommand } = this.props;

    if (value) {
      issueModelCommand('setTaskProperty', { name: selected }, name, value);
    }
    else {
      issueModelCommand('deleteTaskProperty', { name: selected }, name);
    }
  }

  handleTransitionProperty(transition: TransitionRefInterface, name, value) {
    const { issueModelCommand } = this.props;

    if (value) {
      issueModelCommand('setTransitionProperty', transition, name, value);
    }
    else {
      issueModelCommand('model.deleteTransitionProperty', transition, name);
    }
  }

  handleSectionSwitch(section) {
    this.props.navigate({ section });
  }

  style = style
  joinFieldRef = React.createRef();

  render() {
    const { selected, onBack, actions, navigation, tasks, transitions } = this.props;
    const { section = 'input' } = navigation;
    const { name, rename } = this.state;

    const task = selected && tasks.find(task => task.name === selected);

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
                  <label htmlFor="joinField" className={cx(this.style.radio, task.join !== 'all' && this.style.checked)} onClick={(e) => this.handleTaskProperty('join', parseInt((this.joinFieldRef.current || {}).value))} >
                    Join <input type="text" id="joinField" size="3" className={this.style.radioField} ref={this.joinFieldRef} value={isNaN(task.join) ? 10 : task.join} onChange={e => this.handleTaskProperty('join', parseInt(e.target.value))} /> tasks
                  </label>
                </div>
              )
            }
          </Property>
          <Property name="With Items" description="Run an action or workflow associated with a task multiple times." value={!!task.with} onChange={value => this.handleTaskProperty('with', value ? { items: '{{ x in [1, 2, 3] }}' } : false)}>
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
            (trans || []).map((transition, index) => <Transition key={index} transition={transition} onChange={(name, value) => this.handleTransitionProperty(transition, name, value)} />)
          }
          <div className={this.style.transitionInfo}>
            To add a transition, hover over a task box and drag the connector to the desired task box you want to transition to.
          </div>
        </Panel>
      ),
    ]);
  }
}

@connect(
  ({ flow: { tasks }}) => ({ tasks }),
  (dispatch) => ({
    navigate: (navigation) => dispatch({
      type: 'CHANGE_NAVIGATION',
      navigation,
    }),
  })
)
class TaskList extends Component<{
  tasks: Array<Object>,

  navigate: Function,
}> {
  static propTypes = {
    tasks: PropTypes.array,

    navigate: PropTypes.func,
  }

  style = style

  render() {
    const { tasks, navigate } = this.props;

    return (
      <Panel className={this.style.taskPanel}>
        {
          tasks.map(task => (
            <Task
              key={task.name}
              task={task}
              onClick={() => navigate({ task: task.name })}
            />
          ))
        }
      </Panel>
    );
  }
}

class Task extends Component<{
  task: TaskInterface,
  onClick?: Function,
}> {
  static propTypes = {
    task: PropTypes.object.isRequired,
    onClick: PropTypes.func,
  }

  style = style

  handleClick = (e) => {
    const { onClick } = this.props;

    if (!onClick) {
      return;
    }

    e.stopPropagation();

    onClick(e);
  }

  render() {
    const { task } = this.props;

    return (
      <div
        key={task.name}
        className={this.style.task}
        onClick={this.handleClick}
      >
        <div className={this.style.taskName}>{ task.name }</div>
        <div className={this.style.taskAction}>{ task.action }</div>
      </div>
    );
  }
}

@connect(
  ({ flow: { actions, navigation }}) => ({ actions, navigation }),
  (dispatch) => ({
    navigate: (navigation) => dispatch({
      type: 'CHANGE_NAVIGATION',
      navigation,
    }),
  })
)
export default class Details extends Component<{
  className?: string,

  navigation: Object,
  navigate: Function,

  actions: Array<Object>,
}> {
  static propTypes = {
    className: PropTypes.string,

    navigation: PropTypes.object,
    navigate: PropTypes.func,

    actions: PropTypes.array,
  }

  sections = [{
    title: 'metadata',
    className: 'icon-gear',
  }, {
    title: 'execution',
    className: 'icon-lan',
  }]

  style = style

  handleTaskSelect = (task: TaskInterface) => {
    this.props.navigate({ toTask: undefined, task: task.name });
  }

  handleBack = () => {
    this.props.navigate({ toTask: undefined, task: undefined });
  }

  render() {
    const { actions, navigation, navigate } = this.props;

    const { type = 'metadata', asCode } = navigation;

    return (
      <div className={cx(this.props.className, this.style.component, asCode && 'code')}>
        <Toolbar>
          {
            this.sections.map(section => {
              return (
                <ToolbarButton
                  key={section.title}
                  className={section.className}
                  selected={type === section.title}
                  onClick={() => navigate({ type: section.title, section: undefined })}
                />
              );
            })
          }
          <ToolbarButton className={cx(style.code, 'icon-code')} selected={asCode} onClick={() => navigate({ asCode: !asCode })} />
        </Toolbar>
        {
          type === 'metadata' && (
            asCode
              && <Editor type="meta" />
              // $FlowFixMe Model is populated via decorator
              || <Meta />
          )
        }
        {
          type === 'execution' && (
            asCode
              && <Editor type="workflow" selectedTaskName={navigation.task} onTaskSelect={this.handleTaskSelect} />
              || navigation.task
                // $FlowFixMe ^^
                && <TaskDetails onBack={this.handleBack} selected={navigation.task} actions={actions} />
                // $FlowFixMe ^^
                || <TaskList />
          )
        }
      </div>
    );
  }
}
