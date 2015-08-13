import _ from 'lodash';
import React from 'react';
import st2client from 'st2client';

import bem from './util/bem';
import { pack } from './util/packer';
import forms from './util/forms';

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
        port: React.PropTypes.number,
        login: React.PropTypes.string,
        password: React.PropTypes.string
      })
    }),
    onSourceChange: React.PropTypes.func,
    onToggle: React.PropTypes.func
  }

  state = {
    filter: '',
    showSettings: !this.props.source
  }

  toggleCollapse(open) {
    this.setState({hide: !open});
  }

  handleUserInput(filter) {
    this.setState({ filter });
  }

  reload() {
    const api = st2client(this.props.source);

    (() => {
      if (this.props.source && this.props.source.auth) {
        return api.authenticate(this.props.source.auth.login, this.props.source.auth.password);
      } else {
        return new Promise((resolve) => resolve());
      }
    })()
      .then(() => {
        return api.actions.list();
      })
      .catch((...args) => console.log('error:', ...args))
      .then((actions) => this.setState({ actions }))
      ;
  }

  toggleSettings(state) {
    this.setState({ showSettings: state });
  }

  handleSettingsChange(...args) {
    this.props.onSourceChange(...args);
    this.setState({ showSettings: false });
  }

  componentDidMount() {
    if (this.props.source) {
      this.reload();
    }
  }

  componentDidUpdate(props, state) {
    if (this.props.onToggle && this.state.hide !== state.hide) {
      this.props.onToggle();
    }

    if (this.props.source !== props.source) {
      this.reload();
    }
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
      <SourceForm show={this.state.showSettings}
          defaultValue={this.props.source}
          onChange={this.handleSettingsChange.bind(this)} />
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

class SourceForm extends React.Component {
  static propTypes = {
    defaultValue: Palette.propTypes.source,
    onChange: React.PropTypes.func.isRequired
  }

  constructor(props) {
    super();

    const def = props.defaultValue || {}
        , defAuth = def.auth || {};

    this.state = {
      protocol: def.protocol || 'http',
      host: def.host,
      port: def.port || 9101,
      isAuth: !!def.auth,
      authProtocol: defAuth.protocol || 'http',
      authHost: defAuth.host,
      authPort: defAuth.port || 9100,
      login: defAuth.login,
      password: defAuth.password
    };
  }

  handleSubmit(event) {
    event.preventDefault();

    const result = {
      protocol: this.state.protocol,
      host: this.state.host,
      port: this.state.port
    };

    if (this.state.isAuth) {
      result.auth = {
        protocol: this.state.authProtocol,
        host: this.state.authHost,
        port: this.state.authPort,
        login: this.state.login,
        password: this.state.password
      };
    }

    this.props.onChange(result);
  }

  render() {
    const fields = [{
      name: 'Protocol',
      type: 'select',
      props: {
        value: this.state.protocol,
        onChange: (event) => this.setState({protocol: event.target.value})
      },
      options: ['http', 'https']
    }, {
      name: 'Host',
      type: 'text',
      props: {
        value: this.state.host,
        onChange: (event) => this.setState({host: event.target.value}),
        required: true
      }
    }, {
      name: 'Port',
      type: 'number',
      props: {
        value: this.state.port,
        onChange: (event) => this.setState({port: event.target.value}),
        pattern: '\\d+',
        required: true
      }
    }, {
      name: 'Auth',
      type: 'checkbox',
      props: {
        checked: !!this.state.isAuth,
        onChange: (event) => this.setState({ isAuth: event.target.checked })
      }
    }];

    if (this.state.isAuth) {
      Array.prototype.push.apply(fields, [{
        name: 'Auth Protocol',
        type: 'select',
        props: {
          value: this.state.authProtocol,
          onChange: (event) => this.setState({authProtocol: event.target.value})

        },
        options: ['http', 'https']
      }, {
        name: 'Auth Host',
        type: 'text',
        props: {
          value: this.state.authHost,
          onChange: (event) => this.setState({authHost: event.target.value}),
          required: true
        }
      }, {
        name: 'Auth Port',
        type: 'text',
        props: {
          value: this.state.authPort,
          onChange: (event) => this.setState({authPort: event.target.value}),
          pattern: '\\d+',
          required: true
        }
      }, {
        name: 'Login',
        type: 'text',
        props: {
          value: this.state.login,
          onChange: (event) => this.setState({login: event.target.value}),
          required: true
        }
      }, {
        name: 'Password',
        type: 'password',
        props: {
          value: this.state.password,
          onChange: (event) => this.setState({password: event.target.value}),
          required: true
        }
      }, {
        name: 'password-comment',
        type: 'comment',
        content: 'Be aware that the password is stored in plaintext inside your browsers localStorage.'
      }]);
    }

    const props = {
      className: st2Class('source-form')
    };

    if (this.props.show) {
      props.className += ' ' + st2Class('source-form', 'visible');
    }

    return <div {...props} >
      {
        !this.props.defaultValue
        ? <div>No action source is set. Please enter credentials in the form below.</div>
        : null
      }
      <form onSubmit={this.handleSubmit.bind(this)}>
        {
          _.map(fields, (field) => forms[field.type](field))
        }
        <input type="submit"
          className="st2-panel__field-input"
          value="Save" />
      </form>
    </div>;
  }
}
