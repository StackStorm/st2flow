import _ from 'lodash';
import React from 'react';

import bem from './util/bem';
import { pack } from './util/packer';

import packIcon from './util/icon-mock';

const st2Class = bem('palette');

const ACTIONS = [{
  pack: 'core',
  ref: 'core.http',
  description: 'Action that performs an http request.'
}, {
  pack: 'core',
  ref: 'core.local',
  description: 'Action that executes an arbitrary Linux command on the localhost.'
}, {
  pack: 'core',
  ref: 'core.local_sudo',
  description: 'Action that executes an arbitrary Linux command on the localhost.'
}, {
  pack: 'core',
  ref: 'core.remote',
  description: 'Action to execute arbitrary linux command remotely.'
}, {
  pack: 'core',
  ref: 'core.remote_sudo',
  description: 'Action to execute arbitrary linux command remotely.'
}, {
  pack: 'core',
  ref: 'core.sendmail',
  description: 'This sends an email'
}, {
  pack: 'linux',
  ref: 'linux.check_loadavg',
  description: 'Check CPU Load Average on a Host'
}, {
  pack: 'linux',
  ref: 'linux.check_processes',
  description: 'Check Interesting Processes'
}, {
  pack: 'linux',
  ref: 'linux.cp',
  description: 'Copy file(s)'
}, {
  pack: 'linux',
  ref: 'linux.diag_loadavg',
  description: 'Diagnostic workflow for high load alert'
}, {
  pack: 'linux',
  ref: 'linux.dig',
  description: 'Dig action'
}, {
  pack: 'linux',
  ref: 'linux.file_touch',
  description: 'Touches a file'
}, {
  pack: 'linux',
  ref: 'linux.get_open_ports',
  description: 'Retrieve open ports for a given host'
}, {
  pack: 'linux',
  ref: 'linux.lsof',
  description: 'Run lsof'
}, {
  pack: 'linux',
  ref: 'linux.lsof_pids',
  description: 'Run lsof for a group of PIDs'
}, {
  pack: 'linux',
  ref: 'linux.mv',
  description: 'Move file(s)'
}, {
  pack: 'linux',
  ref: 'linux.netstat',
  description: 'Run netstat'
}, {
  pack: 'linux',
  ref: 'linux.netstat_grep',
  description: 'Grep netstat results'
}, {
  pack: 'linux',
  ref: 'linux.pkill',
  description: 'Kill processes using pkill'
}, {
  pack: 'linux',
  ref: 'linux.rm',
  description: 'Remove file(s)'
}, {
  pack: 'linux',
  ref: 'linux.rsync',
  description: 'Copy file(s) from one place to another w/ rsync'
}, {
  pack: 'linux',
  ref: 'linux.scp',
  description: 'Secure copy file(s)'
}, {
  pack: 'linux',
  ref: 'linux.service',
  description: 'Stops, Starts, or Restarts a service'
}, {
  pack: 'linux',
  ref: 'linux.traceroute',
  description: 'Traceroute a Host'
}, {
  pack: 'linux',
  ref: 'linux.vmstat',
  description: 'Run vmstat'
}, {
  pack: 'linux',
  ref: 'linux.wait_for_ssh',
  description: 'Wait for SSH'
}];

class Pack extends React.Component {
  static propTypes = {
    name: React.PropTypes.string.isRequired
  }

  render() {
    return <div className={st2Class('pack')}>
      <div className={st2Class('pack-header')}>
        <span className={st2Class('pack-icon')}>
          <img src={packIcon({ ref: this.props.name })} width="32" height="32" />
        </span>
        <span className={st2Class('pack-name')}>{this.props.name}</span>
      </div>
      <div className={st2Class('pack-content')}>{this.props.children}</div>
    </div>;
  }
}

class Action extends React.Component {
  static propTypes = {
    action: React.PropTypes.shape({
      ref: React.PropTypes.string.isRequired,
      description: React.PropTypes.string.isRequired
    })
  }

  drag(event) {
    let dt = event.dataTransfer;

    dt.setData('actionPack', pack({ action: this.props.action }));
    dt.effectAllowed = 'copy';
  }

  render() {
    return <div className={st2Class('action')} draggable={true} onDragStart={this.drag.bind(this)}>
      <div className={st2Class('action-name')}>{this.props.action.ref}</div>
      <div className={st2Class('action-description')}>{this.props.action.description}</div>
    </div>;
  }
}

class SearchField extends React.Component {
  static propTypes = {
    filter: React.PropTypes.string,
    onChange: React.PropTypes.func.isRequired
  }

  handleChange() {
    this.props.onChange(
      this.refs.filter.getDOMNode().value
    );
  }

  render() {
    return <form className={st2Class('search')}>
      <input type="search"
        className={st2Class('search-field')}
        placeholder="Search..."
        ref="filter"
        value={this.props.filter}
        onChange={this.handleChange.bind(this)} />
    </form>;
  }
}

export default class Palette extends React.Component {
  state = {
    filter: ''
  }

  toggleCollapse(open) {
    this.setState({hide: !open});
  }

  handleUserInput(filter) {
    this.setState({ filter });
  }

  render() {
    const packs = _(ACTIONS)
            .filter((action) => ~action.ref.indexOf(this.state.filter)) // eslint-disable-line no-bitwise
            .groupBy('pack')
            .value()
        , props = {
            className: st2Class(null)
          }
        ;

    if (this.state.hide) {
      props.className += ' ' + st2Class(null, 'hide');
    }

    return <div {...props} >
      <SearchField filter={this.state.filter} onChange={this.handleUserInput.bind(this)}/>
      {
        _.map(packs, (actions, name) =>
          <Pack key={name} name={name}>
            {
              _.map(actions, (action) =>
                <Action key={action.ref} action={action} ></Action>
              )
            }
          </Pack>
        )
      }
    </div>;
  }
}
