// Copyright 2020 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

import React from 'react';
import { PropTypes } from 'prop-types';

import methods from './methods';

export default class Redirect extends React.Component {
  static propTypes = {
    push: PropTypes.bool,
    to: PropTypes.oneOfType([ PropTypes.string, PropTypes.object ]).isRequired,
  };

  componentDidMount() {
    this.perform();
  }

  componentDidUpdate(prevProps) {
    this.perform();
  }

  perform() {
    const { push, to } = this.props;

    if (push) {
      methods.push({ pathname: to });
    }
    else {
      methods.replace({ pathname: to });
    }
  }

  render() {
    return null;
  }
}
