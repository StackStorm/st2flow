import React, { Component } from 'react';

import Action from './action';

import style from './style.css';

const actions = [{
  ref: 'core.local',
  description: 'Some long ass description',
}];

export default class Palette extends Component {
  style = style

  render() {
    return (
      <div className={this.style.component}>
        {
          actions.map(action => <Action key={action.ref} action={action} />)
        }
      </div>
    );
  }
}
