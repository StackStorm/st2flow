import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import AutoForm from '@stackstorm/module-auto-form';
import Editor from '@stackstorm/st2flow-editor';
import Parameter from './parameter';
import Button from '@stackstorm/module-forms/button.component';

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

class TaskDetails extends Component {
  static propTypes = {
    task: PropTypes.object.isRequired,
    onBack: PropTypes.func.isRequired,
  }

  state = {}

  render() {
    const { task, onBack } = this.props;

    const action = {
      parameters: {
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
    };

    return ([
      <Toolbar key="toolbar" secondary={true} >
        <ToolbarButton
          className="icon-chevron_left"
          onClick={() => onBack()}
        />
        <Task task={task} />
      </Toolbar>,
      <Panel key="panel">
        <AutoForm
          spec={{
            type: 'object',
            properties: action.parameters,
          }}
          data={this.state.runValue}
          onChange={(runValue) => this.setState({ runValue })}
        />
      </Panel>,
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
  }

  style = style

  render() {
    const { className, ...props } = this.props;
    return (
      <div className={cx(this.style.toolbarButton, className)} {...props} >
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

    const { model, metaModel, selected: taskSelected } = this.props;
    const { selected = 'metadata' } = this.state;

    const task = taskSelected && model.tasks.find(task => task.name === taskSelected);

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
              <TaskDetails onBack={() => this.handleBack()} task={task} /> ||
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
