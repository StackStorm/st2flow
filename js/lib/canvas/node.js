import _ from 'lodash';
import React from 'react';

import bem from '../util/bem';
import icons from '../util/icon';
import { pack, unpack } from '../util/packer';

import Name from './name';
import Action from './action';
import Handle from './handle';

const st2Class = bem('viewer')
    ;

export default class Node extends React.Component {
  static propTypes = {
    value: React.PropTypes.object,
    onSelect: React.PropTypes.func,
    onPick: React.PropTypes.func,
    onRename: React.PropTypes.func,
    onDelete: React.PropTypes.func,
    onConnect: React.PropTypes.func,
    selected: React.PropTypes.bool,
    x: React.PropTypes.number,
    y: React.PropTypes.number,
    origin: React.PropTypes.shape({
      x: React.PropTypes.number,
      y: React.PropTypes.number
    })
  }

  state = {}

  constructor() {
    super();

    this._resetFallthrough = () => {
      this.setState({ fallthrough: false });
    };
  }

  componentDidMount() {
    document.addEventListener('dragend', this._resetFallthrough);
  }

  componentWillUnmount() {
    document.removeEventListener('dragend', this._resetFallthrough);
  }

  edit() {
    return this.refs.name.focus();
  }

  handleClick(e) {
    e.stopPropagation();

    if (this.props.onSelect) {
       return this.props.onSelect(e);
    }
  }

  handleDoubleClick(e) {
    e.stopPropagation();
    return this.edit();
  }

  handleDragStart(e) {
    e.stopPropagation();

    this.setState({ dragged: true });

    if (this.props.onPick) {
      return this.props.onPick(e);
    }
  }

  handleDragEnd(e) {
    e.stopPropagation();
    this.setState({ dragged: false });
  }

  handleRename(e, v) {
    if (this.props.onRename) {
      return this.props.onRename(e, v);
    }
  }

  handleEditClick() {
    return this.edit();
  }

  handleDeleteClick(e) {
    if (this.props.onDelete) {
      return this.props.onDelete(e);
    }
  }

  handleDragEnter(e) {
    e.stopPropagation();
    const dt = e.dataTransfer;

    if (_.includes(['link', 'all'], dt.effectAllowed)) {
      this.setState({ active: true });
    } else {
      this.setState({ fallthrough: true });
    }
  }

  handleDragLeave(e) {
    e.stopPropagation();

    this.setState({ active: false });
  }

  handleDragOver(e) {
    const dt = e.dataTransfer;

    if (_.includes(['link', 'all'], dt.effectAllowed)) {
      e.preventDefault();
    }
  }

  handleDrop(e) {
    e.stopPropagation();

    let dt = e.dataTransfer
      , {source, type} = unpack(dt.getData('linkPack'))
      , destination = this.props.value.name
      ;

    if (this.props.onConnect) {
      this.props.onConnect(e, source, destination, type);
    }

    this.setState({ active: false });
  }

  handleHandleDrag(e, type) {
    let dt = e.dataTransfer;

    dt.setData('linkPack', pack({
      source: this.props.value.name,
      type: type
    }));
    dt.effectAllowed = 'link';
  }

  render() {
    const { x, y } = this.props;

    const nodeProps = {
      className: st2Class('node'),
      style: {
        transform: `translate(${x}px, ${y}px)`,
        WebkitTransform: `translate(${x}px, ${y}px)`
      },
      onClick: (e) => this.handleClick(e),
      onDoubleClick: (e) => this.handleDoubleClick(e),
      onDragStart: (e) => this.handleDragStart(e),
      onDragEnd: (e) => this.handleDragEnd(e),
      onDragEnter: (e) => this.handleDragEnter(e),
      onDragLeave: (e) => this.handleDragLeave(e),
      onDragOver: (e) => this.handleDragOver(e),
      onDrop: (e) => this.handleDrop(e),
      // Intercept mouse down event so they won't trigger scroll during node movement.
      // Mouse up event should continue to propagate to properly cancel canvas panning when
      // cursor ends up on top of node.
      onMouseDown: (e) => e.stopPropagation()
    };

    if (this.props.selected) {
      nodeProps.className += ' ' + st2Class('node', 'selected');
    }

    if (this.state.dragged) {
      nodeProps.className += ' ' + st2Class('node', 'dragged');
    }

    if (this.state.active) {
      nodeProps.className += ' ' + st2Class('node', 'active');
    }

    if (this.state.fallthrough) {
      nodeProps.style.pointerEvents = 'none';
    }

    const iconProps = {
      className: st2Class('node-icon')
    };

    const contentProps = {
      className: st2Class('node-content')
    };

    const nameProps = {
      ref: 'name',
      value: this.props.value.name,
      onChange: (e, v) => this.handleRename(e, v)
    };

    const refProps = {
      className: st2Class('node-ref')
    };

    const actionProps = {
      className: st2Class('node-actions')
    };

    const buttonProps = {
      className: st2Class('node-buttons')
    };

    return <div {...nodeProps} >
      <div {...iconProps} >
        <img src={icons.icons[this.props.value.pack] || ''} width="32" height="32" />
      </div>
      <div {...contentProps} >
        <Name {...nameProps} />
        <div {...refProps} >{ this.props.value.ref }</div>
      </div>
      <div {...actionProps} >
        <Action type='edit' onClick={() => this.handleEditClick()} />
        <Action type='delete' onClick={() => this.handleDeleteClick()} />
      </div>
      <div {...buttonProps} >
        <Handle type='success' onDrag={(e) => this.handleHandleDrag(e, 'success')} />
        <Handle type='error' onDrag={(e) => this.handleHandleDrag(e, 'error')} />
        <Handle type='complete' onDrag={(e) => this.handleHandleDrag(e, 'complete')} />
      </div>
    </div>;
  }
}
