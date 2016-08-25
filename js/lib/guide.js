import React from 'react';

import bem from './util/bem';

import settings from '../lib/settings';
import Handle from './canvas/handle';

const st2Class = bem('guide')
    ;

class Screen extends React.Component {
  static propTypes = {
    direction: React.PropTypes.oneOf(['left', 'top', 'right']),
    title: React.PropTypes.string,
    children: React.PropTypes.node
  }

  render() {
    return <div>
      <div className={ st2Class('title') }>{ this.props.title }</div>
      <div className={ st2Class('text') }>{ this.props.children }</div>
    </div>;
  }
}

export default class Guide extends React.Component {
  state = {
    screen: 0,
    show: settings.get('tour')
  };

  constructor() {
    super();

    this.screens = [
      <Screen direction="left" title="Welcome to Brocade Workflow Designer">
        <p>
          To get started, pick an action from one of the packs on the left panel and drag it to the middle one.
        </p>
        <p>
          You can reposition the node at any time by simply dragging it around the canvas.
        </p>
      </Screen>,
      <Screen direction="right" title="Live editor">
        <p>
          On the right panel you will see the code representing the workflow you have on the canvas. You can edit the code and the canvas will update live.
        </p>
        <p>
          If you select the node on canvas, the editor will show you the fragment of code related to that node.
        </p>
      </Screen>,
      <Screen title="Transitions">
        <p>
          You can add another node, then link them together by dragging one of the colored circles onto another node and observe the changes that happen to the code. Clicking on the circle in the middle of the arrow will disconnect the nodes.
        </p>
        <p>
          Different colors represent different transitions: <Handle type="success" />&nbsp;only happens when action has finished successfully, <Handle type="error" />&nbsp;happens when action failed and <Handle type="complete" />&nbsp;will be followed in both cases.
        </p>
      </Screen>,
      <Screen direction="top" title="Actions">
        <p>
          You can <i className="icon-redirect" />&nbsp;undo and <i className="icon-redirect2" />&nbsp;redo the change to your workflow, <i className="icon-arrange" />&nbsp;rearrange the nodes automatically, <i className="icon-save" />&nbsp;save and <i className="icon-play" />&nbsp;run the workflow.
        </p>
        <p>
          You can also <i className="icon-edit" />&nbsp;rename and <i className="icon-delete" />&nbsp;delete the node using buttons on the node itself.
        </p>
      </Screen>
    ];
  }

  next() {
    let { screen } = this.state;

    screen++;

    if (screen > this.screens.length - 1) {
      screen = this.screens.length - 1;
    }

    return this.setState({ screen });
  }

  prev() {
    let { screen } = this.state;

    screen--;

    if (screen < 0) {
      screen = 0;
    }

    return this.setState({ screen });
  }

  end() {
    const show = false;

    settings
      .set('tour', show)
      .save();

    return this.setState({ show });
  }

  show() {
    const show = true;

    settings
      .set('tour', show)
      .save();

    return this.setState({ show });
  }

  render() {
    const props = {
      className: st2Class(null)
    };

    if (!this.state.show) {
      props.className.and(null, 'hidden');
      return <div {...props} />;
    }

    const prevProps = {
      className: st2Class('button'),
      onClick: () => this.prev()
    };
    const nextProps = {
      className: st2Class('button'),
      onClick: () => this.next()
    };
    const endProps = {
      className: st2Class('button').and('button', 'danger'),
      onClick: () => this.end()
    };

    if (this.state.screen < 1) {
      prevProps.className.and('button', 'disabled');
    }

    if (this.state.screen > this.screens.length - 2) {
      nextProps.className.and('button', 'disabled');
    }

    const screen = this.screens[this.state.screen];

    if (screen.props.direction) {
      props.className.and(null, screen.props.direction);
    }

    return <div {...props} >
      { screen }
      <div className={ st2Class('buttons') }>
        <div {...prevProps}>
          Previous
        </div>
        <div className={ st2Class('button') } {...nextProps}>
          Next
        </div>
        <div className={ st2Class('button-separator') } />
        <div className={ st2Class('button') } {...endProps}>End tour</div>
      </div>
    </div>;
  }
}
