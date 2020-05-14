// Copyright 2020 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

import fp from 'lodash/fp';
import React from 'react';
import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';

import api from '@stackstorm/module-api';
import Login from '@stackstorm/module-login';
import store from '@stackstorm/module-store';

import history from './history';
import { updateLocation } from './methods';

@connect(
  ({ location }) => ({ location }),
  () => ({ updateLocation })
)
export default class Router extends React.Component {
  static propTypes = {
    routes: PropTypes.array,
    location: PropTypes.object,
    updateLocation: PropTypes.func,
  }

  componentDidMount() {
    this.unsubscribe = store.subscribe(() => this.handleStateLocationChange());
    this.unlisten = history.listen((location, action) => this.handleHistoryLocationChange(location, action));

    this.props.updateLocation(history.location, history.action);
  }

  componentWillUnmount() {
    this.unsubscribe();
    this.unlisten();
  }

  handleStateLocationChange() {
    const stateLocation = store.getState().location;
    const historyLocation = fp.pick([ 'pathname', 'search', 'hash' ], history.location);

    if (!fp.isEqual(stateLocation, historyLocation)) {
      history.push(stateLocation);
    }
  }

  handleHistoryLocationChange(location, action) {
    const stateLocation = store.getState().location;
    const historyLocation = fp.pick([ 'pathname', 'search', 'hash' ], location);

    if (!fp.isEqual(stateLocation, historyLocation) || action === 'REPLACE') {
      this.props.updateLocation(historyLocation, action);
    }
  }

  render() {
    const { location, routes } = this.props;

    if (!location) {
      return null;
    }

    if (!api.isConnected()) {
      return <Login onConnect={() => history.replace()} />;
    }
 
    for (const { url, Component } of routes) {
      const regex = url instanceof RegExp ? regex : new RegExp(`^${url}`);
      const match = location.pathname.match(regex);
      if (match) {
        const [ , ...args ] = match;
        return (
          <Component
            routes={routes}
            args={args}
          />
        );
      }
    }

    return null;
  }
}
