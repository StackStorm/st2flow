import _ from 'lodash';
import React from 'react';

import bem from '../util/bem';
import { SpecField } from '../util/forms';

const st2Class = bem('popup')
    ;

export default class Run extends React.Component {
  static propTypes = {
    action: React.PropTypes.object,
    onSubmit: React.PropTypes.func
  }

  state = {
    action: {},
    parameters: {},
    show: false
  }

  handleSubmit(event) {
    event.preventDefault();

    console.log(this.state.parameters);

    // this.props.onSubmit(this.state.action, this.state.parameters)
    //   .then(() => {
    //     this.setState({ show: false });
    //   })
    //   .catch((err) => {
    //     this.setState({ show: false });
    //     throw err;
    //   });
  }

  handleCancel(event) {
    event.preventDefault();

    this.setState({
      show: !this.state.show
    });
  }

  show() {
    this.setState({
      show: true
    });
  }

  changeValue(name, value) {
    const o = this.state.parameters;
    if (_.isUndefined(value)) {
      delete o[name];
    } else {
      o[name] = value;
    }
    this.setState(o);
  }

  componentWillReceiveProps(props) {
    const action = _.cloneDeep(props.action);

    if (!_.isEqual(this.state.action.parameters, action.parameters)) {
      this.setState({ parameters: {} });
    }

    this.setState({ action });
  }

  render() {
    const props = {
      className: `${st2Class(null)}`,
      onClick: this.handleCancel.bind(this)
    };

    if (this.state.show) {
      props.className += ' ' + st2Class(null, 'active');
    }

    const contentProps = {
      className: st2Class('content'),
      onClick: (event) => event.stopPropagation()
    };

    return (
      <div {...props} >
        <div {...contentProps} >
          <form className={ st2Class('column') + ' ' + st2Class('form') }
              onSubmit={this.handleSubmit.bind(this)}>
            <div className="st2-panel__header">
              Run workflow
            </div>
            {
              _.map(this.state.action.parameters, (parameter, name) =>
                <SpecField key={name}
                  name={name}
                  parameter={parameter}
                  value={this.state.parameters[name]}
                  onChange={this.changeValue.bind(this, name)}
                />
              )
            }
            <input type="submit"
                className="st2-panel__field-input"
                value="Run" />
          </form>
        </div>
      </div>
    );
  }
}
