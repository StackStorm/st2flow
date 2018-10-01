import React, { Component } from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import Action from './action';

import style from './style.css';

export default class Palette extends Component {
  static propTypes = {
    className: PropTypes.string,
    actions: PropTypes.array,
    model: PropTypes.object, // temporary
  }

  state = {
    search: '',
    packs: {},
  }

  addTask = () => {
    this.props.model.addTask({
      name: `doSomething ${Math.random()}`,
      action: 'some.action',
      anobject: { foo: 'bar' },
      next: [{ do: 'llama', when: 'depress' }, { do: [ 'taboot', 'taboot' ], when: 'depress depress' }],
      arr: [[[ { 'asdf': 'boo', 'qwer': 'reqw' }, 'snarf' ], 'wombat']],
      arr2: [[[ 'boo' ], 'booboo' ]],
      coord: { x: Math.round(Math.random() * 800), y: Math.round(Math.random() * 800) },
    });
  }

  handleSearch(e) {
    this.setState({ search: e.target.value });
  }

  handleTogglePack(e, pack) {
    e.stopPropagation();

    const { packs } = this.state;

    packs[pack.name] = !packs[pack.name];

    this.setState({ packs });
  }

  style = style

  render() {
    const { actions } = this.props;
    const { search, packs } = this.state;

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
        <div className="temporary delete-me-eventually">
          <button onClick={this.addTask}>Add Task</button>
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
                if (packs[action.pack]) {
                  pack.actions.push(action);
                }
                return acc;
              }, [])
              .map(pack => {
                return (
                  <div key={pack.name} className={this.style.pack}>
                    <div
                      className={this.style.packName}
                      onClick={e => this.handleTogglePack(e, pack)}
                    >
                      { pack.name }
                    </div>
                    {
                      pack.actions
                        .map(action => <Action key={action.ref} action={action} />)
                    }
                  </div>
                );
              })
          }
        </div>
      </div>
    );
  }
}
