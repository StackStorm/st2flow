import React from 'react';
import URI from 'URIjs';

import bem from '../util/bem';

const st2Class = bem('header')
    ;

export default class Login extends React.Component {
  static propTypes = {
    source: React.PropTypes.object
  }

  render() {
    if (!this.props.source) {
      return false;
    }

    const { api, token } = this.props.source
        , url = new URI(api);

    const userLine = `${ token && token.user || 'stanley' }@${ url.host() }`;

    return <div className={ st2Class('login') }>
      { userLine }
    </div>;
  }
}
