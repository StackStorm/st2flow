import _ from 'lodash';
import React from 'react';
import st2client from 'st2client';

import bem from './util/bem';
import { pack } from './util/packer';

import packIcon from './util/icon-mock';

const st2Class = bem('palette');

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
  static propTypes = {
    source: React.PropTypes.shape({
      protocol: React.PropTypes.oneOf(['http', 'https']),
      host: React.PropTypes.string,
      port: React.PropTypes.number,
      auth: React.PropTypes.shape({
        protocol: React.PropTypes.oneOf(['http', 'https']),
        host: React.PropTypes.string,
        port: React.PropTypes.number
      })
    })
  }

  state = {
    filter: ''
  }

  toggleCollapse(open) {
    this.setState({hide: !open});
  }

  handleUserInput(filter) {
    this.setState({ filter });
  }

  componentDidMount() {
    const api = st2client(this.props.source);

    api.authenticate('testu', 'testp')
      .catch((...args) => console.log('error:', ...args))
      .then(() => {
        return api.actions.list();
      })
      .then((actions) => this.setState({ actions }))
      ;

  }

  render() {
    const packs = _(this.state.actions)
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
