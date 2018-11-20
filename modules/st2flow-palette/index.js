//@flow

import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import { connect } from '@stackstorm/st2flow-model/connect';

import Action from './action';
import Pack from './pack';

import style from './style.css';

@connect(({ actionsModel }) => ({ actionsModel }))
export default class Palette extends Component<{
  className?: string,
  actionsModel: Object,
}, {
  search: string,
}> {
  static propTypes = {
    className: PropTypes.string,
    actionsModel: PropTypes.object,
  }

  state = {
    search: '',
  }

  handleSearch(e: MouseEvent) {
    if (e.target instanceof window.HTMLInputElement) {
      this.setState({ search: e.target.value });
    }
  }

  style = style

  render() {
    const { actionsModel } = this.props;
    const { actions } = actionsModel;
    const { search } = this.state;

    return (
      <div className={cx(this.props.className, this.style.component)}>
        <div className={this.style.search}>
          <input
            type="text"
            className={this.style.searchField}
            onChange={e => this.handleSearch(e)}
            placeholder="Library"
          />
        </div>
        <div className={this.style.list}>
          {
            actions
              .filter(action => action.ref.indexOf(search) > -1)
              .reduce((acc, action) => {
                let pack = acc.find(pack => pack.name === action.pack);
                if (!pack) {
                  pack = {
                    name: action.pack,
                    actions: [],
                  };
                  acc.push(pack);
                }

                pack.actions.push(action);

                return acc;
              }, [])
              .map(pack => {
                return (
                  <Pack key={pack.name} name={pack.name}>
                    {
                      pack.actions
                        .map(action => <Action key={action.ref} action={action} />)
                    }
                  </Pack>
                );
              })
          }
        </div>
      </div>
    );
  }
}
