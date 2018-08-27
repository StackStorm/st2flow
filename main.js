import './style.css';
import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import ReactDOM from 'react-dom';

import {
  Router,
  Route,
  Switch,
} from 'react-router-dom';
import createHashHistory from 'history/createHashHistory';

import Header from '@stackstorm/st2flow-header';
import { Panel } from '@stackstorm/module-panel';
import ActionsPanel from './modules/st2flow-actions/actions.component';

// import api from '@stackstorm/module-api';

const history = window.routerHistory = createHashHistory({});

class Editor extends Component {
  static propTypes = {
    match: PropTypes.shape({
      url: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
      params: PropTypes.shape({
        ref: PropTypes.string,
      }).isRequired,
    }).isRequired,
  };

  render() {
    const { location, match, match: { path, params: { ref } } } = this.props;

    return (
      <div class="wrapper"  >
        <Header />
        <Panel detailed>
          <ActionsPanel location={location} match={match} />
        </Panel>
      </div>
    );
  }
}

export class Container extends Component {
  auth(bundle64) {
    const source = JSON.parse(window.atob(bundle64));

    if (source.api === undefined) {
      source.api = `https://${window.location.hostname}:443/api`;
      source.auth = `https://${window.location.hostname}:443/auth`;
    }

    // console.log(source);
  }

  render() {
    return (
      <Router history={history}>
        <Switch>
          <Route exact path="/" component={Editor} />
          <Route path="/action/:ref" component={Editor} />

          <Route
            path="/import/:bundle/:ref?"
            render={({ history, match: { params: { bundle, ref }} }) => {
              this.auth(bundle);

              setTimeout(() => {
                // TODO: use replace?
                history.push(ref ? `/action/${ref}` : '/');
              }, 100);

              return null;
            }}
          />
        </Switch>
      </Router>
    );
  }
}

ReactDOM.render(<Container />, document.querySelector('#container'));
