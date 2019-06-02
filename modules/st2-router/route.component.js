// Copyright 2019 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

import React from 'react';
import { PropTypes } from 'prop-types';
import { connect } from 'react-redux';

import matchPath from 'react-router/matchPath';

@connect(
  ({ location }) => ({ location })
)
export default class Route extends React.Component {
  static propTypes = {
    location: PropTypes.object,
    path: PropTypes.string.isRequired,
    render: PropTypes.func.isRequired,
  }

  render() {
    const { location, path, render } = this.props;
    const match =  matchPath(location.pathname, { path });
    const props = { match, location };

    return match ? render(props) : null;
  }
}
