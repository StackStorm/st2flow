import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import style from './style.css';

class Notifications extends Component {
  static propTypes = {
    className: PropTypes.string,
    onRemove: PropTypes.func,
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

  handleRemove = (ev) => {
    if(this.props.onRemove) {
      const index = ev.currentTarget.dataset.index;
      this.props.onRemove(this.props.notifications[index]);
    }
  }

  render() {
    return (
      <div className={cx(this.props.className, style.component, style[this.props.position])}>
        {this.props.notifications.map((notif, i) => (
          <div className={cx(style.notification, style[notif.type])} key={i}>
            <button data-index={i} className={cx(style.notification, style.close)} aria-label="Close" onClick={this.handleRemove}>
              <span aria-hidden="true">&times;</span>
            </button>
            {notif.message}
          </div>
        ))}
      </div>
    );
  }
}

export default Notifications;
