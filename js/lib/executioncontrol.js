import _ from 'lodash';
import React from 'react';

import api from './api';
import bem from './util/bem';
import Control from './control';
import TooltipItem from './tooltipitem';

const st2Class = bem('controls')
    ;

export default class ExecutionControl extends React.Component {
  static propTypes = {
    action: React.PropTypes.object,
    onClick: React.PropTypes.func.isRequired
  }

  state = {}

  handleRun() {
    this.props.onClick();
  }

  showExecutions() {
    const showExecutions = !this.state.showExecutions;
    this.setState({ showExecutions });
  }

  setValue(value) {
    this.setState({ value });
  }

  componentDidMount() {
    api.on('connect', () => {
      api.client.stream.listen().then((source) => {
        source.removeEventListener('st2.execution__create', this._createListener);
        source.removeEventListener('st2.execution__update', this._updateListener);

        this._createListener = this._createListener.bind(this);
        this._updateListener = this._updateListener.bind(this);

        source.addEventListener('st2.execution__create', this._createListener);
        source.addEventListener('st2.execution__update', this._updateListener);
      });

      if (this.props.action && this.props.action.ref) {
        this.load(this.props.action.ref);
      }
    });
  }

  load(ref) {
    if (!ref) {
      throw new Error('action name should be defined');
    }
    return api.client.executions.list({
      parent: 'null',
      exclude_attributes: 'result,trigger_instance',
      limit: 5,
      action: ref
    }).then((executions) => {
      const total = api.client.executions.total;
      this.setState({ executions, total });
      this.setStatus();
    });
  }

  shouldComponentUpdate(props) {
    if (this.props.action.ref !== props.action.ref) {
      this.load(props.action.ref);
      return false;
    }

    return true;
  }

  componentWillUnmount() {
    api.client.stream.listen().then((source) => {
      source.removeEventListener('st2.execution__create', this._createListener);
      source.removeEventListener('st2.execution__update', this._updateListener);
    });
  }

  _createListener(e) {
    if (!this.state.executions) {
      return;
    }

    const record = JSON.parse(e.data);

    if (record.parent || record.action.ref !== this.props.action.ref) {
      return;
    }

    if (this.props.action.id === record.action.id) {
      this.setStatus(record.status);
    }

    const total = !_.isUndefined(this.state.total) ? this.state.total + 1 : 1;
    const executions = _.take(this.state.executions, 4);
    executions.unshift(record);
    this.setState({ executions, total });
  }

  _updateListener(e) {
    if (!this.state.executions) {
      return;
    }

    const record = JSON.parse(e.data);

    if (record.parent || record.action.ref !== this.props.action.ref) {
      return;
    }

    if (this.props.action.id === record.action.id) {
      this.setStatus(record.status);
    }

    const executions = this.state.executions;
    const execution = _.find(executions, {id: record.id});

    if (execution) {
      _.assign(execution, record);
    }

    this.setState({ executions });
  }

  setStatus(status) {
    this.refs.button.setStatus(status);
  }

  render() {
    const props = {
      className: `${st2Class('button-complex')}`
    };

    const execProps = {
      className: `${st2Class('button-badge')}`,
      onClick: () => this.showExecutions()
    };

    if (_.isUndefined(this.state.total)) {
      execProps.className += ' ' + st2Class('button-badge', 'hide');
    }

    const tooltipProps = {
      className: `${st2Class('tooltip')}`
    };

    if (this.state.showExecutions) {
      tooltipProps.className += ' ' + st2Class('tooltip', 'active');
    }

    return <div {...props} >
      <Control icon='play' onClick={this.handleRun.bind(this)} ref="button"/>
      <div {...execProps} >
        {this.state.total}
      </div>
      <div {...tooltipProps} >
        {
          _(this.state.executions)
            .take(5)
            .map((execution) =>
              <TooltipItem key={execution.id} execution={execution} />
            )
            .value()
        }
        {
          _.isEmpty(this.state.executions) &&
            <div className={st2Class('tooltip-message')}>
              No executions to show
            </div>
        }
      </div>
    </div>;
  }
}
