import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import AutoForm from '@stackstorm/module-auto-form';
import Editor from '@stackstorm/st2flow-editor';
import Parameter from './parameter';
import Button, { Toggle } from '@stackstorm/module-forms/button.component';

import ArrayField from '@stackstorm/module-auto-form/fields/array';
import NumberField from '@stackstorm/module-auto-form/fields/number';
import IntegerField from '@stackstorm/module-auto-form/fields/integer';
import BooleanField from '@stackstorm/module-auto-form/fields/boolean';
import StringField from '@stackstorm/module-auto-form/fields/string';
import ObjectField from '@stackstorm/module-auto-form/fields/object';
import PasswordField from '@stackstorm/module-auto-form/fields/password';
import EnumField from '@stackstorm/module-auto-form/fields/enum';

import style from './style.css';

class Meta extends Component {
  static propTypes = {
    metaModel: PropTypes.object.isRequired,
  }

  spec = {
    type: 'object',
    properties: {
      pack: {
        position: 1,
        enum: [
          'some',
          'thing',
          'else',
        ],
      },
      name: {
        position: 2,
        type: 'string',
      },
      description: {
        position: 3,
        type: 'string',
      },
      enable: {
        position: 4,
        type: 'boolean',
      },
      entry_point: {
        position: 5,
        type: 'string',
      },
    },
  }

  render() {
    const { metaModel } = this.props;

    return (
      <Panel>
        <AutoForm
          spec={this.spec}
          data={metaModel.meta}
          onChange={v => metaModel.update({ ...metaModel.meta, ...v })}
        />
      </Panel>
    );
  }
}

class Parameters extends Component {
  static propTypes = {
    metaModel: PropTypes.object.isRequired,
  }


  componentDidMount() {
    this.props.metaModel.on('update', this.update);
  }

  componentWillUnmount() {
    this.props.metaModel.removeListener('update', this.update);
  }

  update = () => this.forceUpdate()

  handleDelete(name) {
    this.props.metaModel.unsetParameter(name);
  }

  render() {
    const { metaModel } = this.props;

    return (
      <Panel>
        {
          metaModel.parameters.map(parameter => (
            <Parameter
              key={parameter.name}
              name={parameter.name}
              parameter={parameter}
              onDelete={() => this.handleDelete(parameter.name)}
            />
          ))
        }
        <Button value="Add parameter" />
      </Panel>
    );
  }
}

class Property extends Component {
  static propTypes = {
    name: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    value: PropTypes.bool,
    onChange: PropTypes.func,
  }

  style = style

  render() {
    const { name, description, value, onChange } = this.props;
    return (
      <div className={this.style.property}>
        <div className={this.style.propertyName}>{ name }</div>
        <div className={this.style.propertyDescription}>{ description }</div>
        <div className={this.style.propertyToggle}>
          <Toggle value={value} onChange={onChange} />
        </div>
      </div>
    );
  }
}

class Transition extends Component {
  static propTypes = {
    transition: PropTypes.object.isRequired,
  }

  style = style

  render() {
    const { transition } = this.props;
    
    return (
      <div className={this.style.transition} >
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            When
          </div>
          <div className={this.style.transitionField}>
            <StringField value={transition.condition} />
          </div>
          <div className={this.style.transitionButton}>
            <i className="icon-cross" />
          </div>
        </div>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            Publish
          </div>
          <div className={this.style.transitionField}>
            <Toggle />
          </div>
        </div>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            Do
          </div>
          <div className={this.style.transitionField}>
            <StringField />
          </div>
          <div className={this.style.transitionButton}>
            <i className="icon-plus2" />
          </div>
        </div>
        <div className={this.style.transitionLine} >
          <div className={this.style.transitionLabel}>
            Color
          </div>
          <div className={this.style.transitionField}>
            <StringField />
          </div>
        </div>
      </div>
    );
  }
}

class TaskDetails extends Component {
  static propTypes = {
    task: PropTypes.object.isRequired,
    transitions: PropTypes.array.isRequired,
    actions: PropTypes.array,
    onBack: PropTypes.func.isRequired,
  }

  state = {
    section: undefined,
  }

  handleSectionSwitch(section) {
    this.setState({ section });
  }

  style = style

  render() {
    const { task, transitions, onBack, actions } = this.props;
    const { section = 'task' } = this.state;

    const [ actionRef ] = task.action.split(' ');
    const action = actions.find(({ref}) => ref === actionRef);

    return ([
      <Toolbar key="toolbar" secondary={true} >
        <ToolbarButton
          className="icon-chevron_left"
          onClick={() => onBack()}
        />
        <Task task={task} />
      </Toolbar>,
      <Toolbar key="subtoolbar" secondary={true} >
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('task')}>Task</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('input')}>Input</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('properties')}>Properties</ToolbarButton>
        <ToolbarButton stretch onClick={() => this.handleSectionSwitch('transitions')}>Transitions</ToolbarButton>
      </Toolbar>,
      section === 'task' && (
        <Panel key="task">
          <StringField name="name" value={task.name} onChange={a => console.log(a)}/>
          <StringField name="action" value={task.action} onChange={a => console.log(a)}/>
        </Panel>
      ),
      section === 'input' && (
        <Panel key="input">
          <AutoForm
            spec={{
              type: 'object',
              properties: action.parameters,
            }}
            data={this.state.runValue}
            onChange={(runValue) => this.setState({ runValue })}
          />
        </Panel>
      ),
      section === 'properties' && (
        <Panel key="properties">
          <Property name="Join" description="Allows to synchronize multiple parallel workflow branches and aggregate their data." onChange={a => console.log(a)} />
          <Property name="With Items" description="Run an action or workflow associated with a task multiple times." value={true} onChange={a => console.log(a)} />
        </Panel>
      ),
      section === 'transitions' && (
        <Panel key="transitions">
          {
            transitions.map(transition => <Transition key={`${transition.from.name}-${transition.to.name}-${window.btoa(transition.condition)}`} transition={transition} />)
          }
          <div className={this.style.transitionInfo}>
            To add a transition, hover over a task box and drag the connector to the desired task box you want to transition to.
          </div>
        </Panel>
      ),
    ]);
  }
}

class TaskList extends Component {
  static propTypes = {
    model: PropTypes.object.isRequired,
    onSelect: PropTypes.func.isRequired,
  }

  style = style

  render() {
    const { model, onSelect } = this.props;

    return (
      <Panel className={this.style.taskPanel}>
        {
          model.tasks.map(task => (
            <Task
              key={task.name}
              task={task}
              onClick={() => onSelect(task)}
            />
          ))
        }
      </Panel>
    );
  }
}

class Task extends Component {
  static propTypes = {
    task: PropTypes.object.isRequired,
    onClick: PropTypes.func,
  }

  style = style

  handleClick(e) {
    if (!this.props.onClick) {
      return;
    }

    e.stopPropagation();

    this.props.onClick();
  }

  render() {
    const { task } = this.props;

    return (
      <div
        key={task.name}
        className={this.style.task}
        onClick={e => this.handleClick(e)}
      >
        <div className={this.style.taskName}>{ task.name }</div>
        <div className={this.style.taskAction}>{ task.action }</div>
      </div>
    );
  }
}

class Toolbar extends Component {
  static propTypes = {
    secondary: PropTypes.bool,
    children: PropTypes.node,
  }

  style = style

  render() {
    const { secondary } = this.props;
    return (
      <div className={cx(this.style.toolbar, secondary && this.style.secondary)} >
        { this.props.children }
      </div>
    );
  }
}

class ToolbarButton extends Component {
  static propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
    stretch: PropTypes.bool,
  }

  style = style

  render() {
    const { className, stretch, ...props } = this.props;
    return (
      <div className={cx(this.style.toolbarButton, className, stretch && this.style.stretch)} {...props} >
        { this.props.children }
      </div>
    );
  }
}

class Panel extends Component {
  static propTypes = {
    className: PropTypes.string,
    children: PropTypes.node,
  }

  style = style

  render() {
    const { className } = this.props;
    return (
      <div className={cx(this.style.panel, className)} >
        { this.props.children }
      </div>
    );
  }
}

export default class Details extends Component {
  static propTypes = {
    className: PropTypes.string,
    model: PropTypes.object.isRequired,
    metaModel: PropTypes.object.isRequired,
    actions: PropTypes.array,
    selected: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
  }

  state = {}

  style = style

  handleSectionSelect(section) {
    this.setState({ selected: section.title });
  }

  handleTaskSelect(task) {
    this.props.onSelect(task.name);
  }

  handleBack() {
    this.props.onSelect();
  }

  render() {
    const sections = [{
      title: 'metadata',
      className: 'icon-gear',
    }, {
      title: 'parameters',
      className: 'icon-wrench',
    }, {
      title: 'execution',
      className: 'icon-lan',
    }, {
      title: 'code',
      className: cx(style.code, 'icon-code'),
    }];

    const { model, metaModel, selected: taskSelected, actions } = this.props;
    const { selected = 'metadata' } = this.state;

    const task = taskSelected && model.tasks.find(task => task.name === taskSelected);
    const transitions = taskSelected && model.transitions.filter(transition => transition.from.name === task.name);

    return (
      <div className={cx(this.props.className, this.style.component)}>
        <Toolbar>
          {
            sections.map(section => {
              return (
                <ToolbarButton
                  key={section.title}
                  className={cx(section.className, selected === section.title && this.style.selected)}
                  onClick={() => this.handleSectionSelect(section)}
                />
              );
            })
          }
        </Toolbar>
        {
          selected === 'metadata' && <Meta metaModel={metaModel} />
        }
        {
          selected === 'parameters' && <Parameters metaModel={metaModel} />
        }
        {
          selected === 'execution' && (
            task && 
              <TaskDetails onBack={() => this.handleBack()} task={task} transitions={transitions} actions={actions} /> ||
              <TaskList onSelect={task => this.handleTaskSelect(task)} model={model} />
          )
        }
        {
          selected === 'code' && (
            <Editor {...this.props} />
          )
        }
      </div>
    );
  }
}
