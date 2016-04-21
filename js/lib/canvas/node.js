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

let hiddenNode;

export default class Node extends React.Component {
  static propTypes = {
    value: React.PropTypes.object,
    onSelect: React.PropTypes.func,
    onMove: React.PropTypes.func,
    onRename: React.PropTypes.func,
    onDelete: React.PropTypes.func,
    onConnect: React.PropTypes.func,
    selected: React.PropTypes.bool
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

    const dt = e.dataTransfer;

    const {layerX: targetX, layerY: targetY} = e.nativeEvent;
    const { name, x, y } = this.props.value;

    const offsetX = targetX - x;
    const offsetY = targetY - y;

    const crt = e.target.cloneNode(true);
    crt.style.removeProperty('transform');
    crt.style.removeProperty('-webkit-transform');
    crt.style.setProperty('z-index', -1);

    if (hiddenNode) {
      hiddenNode.parentNode.replaceChild(crt, hiddenNode);
    } else {
      document.body.appendChild(crt);
    }

    hiddenNode = crt;

    dt.setDragImage(crt, offsetX, offsetY);
    dt.setData('nodePack', pack({ name, offsetX, offsetY }));
    dt.effectAllowed = 'move';
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
    const { x, y } = this.props.value;

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
      // Intercept mouse events so they won't trigger scroll during node movement
      onMouseDown: (e) => e.stopPropagation(),
      onMouseUp: (e) => e.stopPropagation()
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
