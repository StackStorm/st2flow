import moment from 'moment';
import React from 'react';
import Time from 'react-time';

import bem from './util/bem';

const st2Class = bem('controls')
    ;

export default class TooltipItem extends React.Component {
  static propTypes = {
    execution: React.PropTypes.shape({
      id: React.PropTypes.string,
      status: React.PropTypes.string, // enum actually
      start_timestamp: React.PropTypes.string, // ISO8601
      action: React.PropTypes.shape({
        ref: React.PropTypes.string
      })
    })
  }

  render() {
    const props = {
      className: st2Class('tooltip-item') + ' ' + st2Class('execution')
    };

    const statusProps = {
      className: st2Class('execution-status')
    };

    if (this.props.execution.status) {
      statusProps.className += ' ' +
        st2Class('execution-status', this.props.execution.status);
    }

    const time = this.props.execution.start_timestamp;

    return <div {...props} >
      <div {...statusProps} />
      <div className={st2Class('execution-ref')} >
        {this.props.execution.action.ref}
      </div>
      <div className={st2Class('execution-timestamp')} >
        <Time value={moment(time).utcOffset(time)}
          format="ddd, DD MMM YYYY HH:mm:ss UTC" />
      </div>
    </div>;
  }
}