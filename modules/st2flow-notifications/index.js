// @flow

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import style from './style.css';

export type NotificationInterface = {
  type: 'error' | 'warning' | 'info' | 'success',
  message: string,
};

class Notification extends Component<{
  notification: Object
}, {
  hide: boolean
}> {
  static propTypes = {
    notification: PropTypes.object,
  }

  state = {
    hide: false,
  }

  handleRemove = (e: Event) => {
    e.stopPropagation();

    this.setState({ hide: true });
  }

  style = style

  render() {
    const { notification } = this.props;
    const { hide } = this.state;

    return !hide && (
      <div className={cx(this.style.notification, this.style[notification.type])}>
        <button className={cx(style.notification, style.close)} aria-label="Close" onClick={this.handleRemove}>
          <span aria-hidden="true">&times;</span>
        </button>
        { notification.message }
      </div>
    );
  }
}

class Notifications extends Component<{
  className?: string,
  position: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  notifications: Array<Object>
}> {
  static propTypes = {
    className: PropTypes.string,
    position: PropTypes.oneOf([ 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right' ]),
    notifications: PropTypes.arrayOf(
      PropTypes.shape({
        type: PropTypes.oneOf([ 'error', 'warning', 'info', 'success' ]).isRequired,
        message: PropTypes.string.isRequired,
      })
    ),
  }

  static defaultProps = {
    position: 'top',
  }

  style = style

  render() {
    return (
      <div className={cx(this.props.className, style.component, style[this.props.position])}>
        {this.props.notifications.map((notif, i) => <Notification key={i} notification={notif} />)}
      </div>
    );
  }
}

export default Notifications;
