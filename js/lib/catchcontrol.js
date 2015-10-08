import React from 'react';

import bem from './util/bem';
import Control from './control';

const st2Class = bem('controls')
    ;

export default class CatchControl extends React.Component {
  static propTypes = {
    icon: React.PropTypes.string,
    onClick: React.PropTypes.func.isRequired
  }

  state = {}

  handleClick(...args) {
    this.setState({ error: null });
    return this.props.onClick(...args)
      .catch((error) => {
        this.setState({ error });
        throw error;
      })
      ;
  }

  render() {
    const props = {
      className: `${st2Class('button-complex')}`
    };

    const tooltipProps = {
      className: st2Class('tooltip')
    };

    if (this.state.error) {
      tooltipProps.className += ' ' + st2Class('tooltip', 'flash');
    }

    return <div {...props} >
      <Control icon={ this.props.icon } onClick={this.handleClick.bind(this)} ref="button"/>
      <div {...tooltipProps} >
        <div className={st2Class('tooltip-content')}>
          {
            <div className={st2Class('tooltip-message')}>
              { this.state.error && this.state.error.message }
            </div>
          }
        </div>
      </div>
    </div>;
  }
}
