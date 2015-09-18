import _ from 'lodash';
import React from 'react';

import bem from './util/bem';
import { pack } from './util/packer';
import SourceForm from './panels/sourceform';


import icons from './util/icon';

const st2Class = bem('palette')
    , st2Icon = bem('icon')
    ;

class Pack extends React.Component {
  static propTypes = {
    name: React.PropTypes.string.isRequired,
    icon: React.PropTypes.string
  }

  state = {
    collapsed: false
  }

  handleClick() {
    this.setState({ collapsed: !this.state.collapsed });
  }

  render() {
    const props = {
      className: st2Class('pack')
    };

    if (this.state.collapsed) {
      props.className += ' ' + st2Class('pack', 'collapsed');
    }

    const toggleProps = {
      className: st2Class('pack-toggle')
    };

    if (this.state.collapsed) {
      toggleProps.className += ' ' + st2Icon('left-open');
    } else {
      toggleProps.className += ' ' + st2Icon('down-open');
    }

    return <div {...props} >
      <div className={st2Class('pack-header')}
          onClick={this.handleClick.bind(this)} >
        <span className={st2Class('pack-icon')}>
          <img src={this.props.icon} width="32" height="32" />
        </span>
        <span className={st2Class('pack-name')}>{this.props.name}</span>
        <i {...toggleProps} ></i>
      </div>
      <div className={st2Class('pack-content')}>{this.props.children}</div>
    </div>;
  }
}

class Action extends React.Component {
  static propTypes = {
    action: React.PropTypes.shape({
      ref: React.PropTypes.string.isRequired,
      description: React.PropTypes.string
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
    const resetProps = {
      className: st2Class('search-reset'),
      onClick: () => {
        this.props.onChange('');
        this.refs.filter.getDOMNode().focus();
      }
    };

    if (this.props.filter) {
      resetProps.className += ' ' + st2Icon('reset');
    } else {
      resetProps.className += ' ' + st2Icon('search');
    }

    return <form className={st2Class('search')}>
      <input type="search"
        className={st2Class('search-field')}
        placeholder="Search..."
        ref="filter"
        value={this.props.filter}
        onChange={this.handleChange.bind(this)} />
      <span {...resetProps} ></span>
    </form>;
  }
}

export default class Palette extends React.Component {
  static propTypes = {
    source: SourceForm.propTypes.defaultValue,
    onSourceChange: React.PropTypes.func,
    onToggle: React.PropTypes.func,
    actions: React.PropTypes.array,
    error: React.PropTypes.object
  }

  state = {
    filter: '',
    showSettings: !this.props.source,
    icons: {}
  }

  toggleCollapse(open) {
    this.setState({hide: !open});
  }

  handleUserInput(filter) {
    this.setState({ filter });
  }

  toggleSettings(state) {
    this.setState({ showSettings: state });
  }

  handleSettingsChange(...args) {
    this.props.onSourceChange(...args);
    this.setState({ showSettings: false });
  }

  componentDidMount() {
    icons.on('loaded', (icons) => this.setState({ icons }));
  }

  componentDidUpdate(props, state) {
    if (this.props.onToggle && this.state.hide !== state.hide) {
      this.props.onToggle();
    }
  }

  componentWillReceiveProps(props) {
    if (this.props.source !== props.source) {
      this.setState({ showSettings: !props.source });
    }
  }

  render() {
    const packs = _(this.props.actions)
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
      <SourceForm show={this.state.showSettings}
          sources={this.props.sources}
          defaultValue={this.props.source}
          onChange={this.handleSettingsChange.bind(this)} />
      {
        !this.props.actions && !this.props.error &&
          <div className={st2Class('loader')}>Loading...</div>
      }
      {
        this.props.error && <div className={st2Class('error')}>
          <p>Error loading actions from {this.props.source.host}:</p>
          <code>{this.props.error.message.faultstring || this.props.error.message}</code>
          <p>Check your config by clicking <i className={st2Icon('cog')}></i> button on the right.</p>
          <p>Here is the number of actions that are most likely to be on your installation of st2.</p>
        </div>
      }
      {
        _.map(packs, (actions, name) =>
          <Pack key={name} name={name} icon={this.state.icons && this.state.icons[name]}>
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
