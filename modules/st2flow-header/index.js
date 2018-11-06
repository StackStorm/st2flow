//@flow

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';
import url from 'url';

import api from '@stackstorm/module-api';

import style from './style.css';

export default class Header extends Component<{
  className?: string,
}> {
  static propTypes = {
    className: PropTypes.string,
  }

  style = style

  render() {
    return (
      <div className={cx(this.props.className, this.style.component)}>
        <div className={this.style.logo}>Extreme</div>
        <div className={this.style.subtitle}>Workflow Designer</div>
        <div className={this.style.separator} />
        {
          api.token && api.server && ([
            <div className={this.style.user} key="user-info" >
              { api.token.user }@{ url.parse(api.server.api).host }
            </div>,
            <i className={cx('icon-user', this.style.icon)}  key="user-icon" />,
          ])
        }
      </div>
    );
  }
}
