import React from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import componentStyle from './styles.css';

export default class Header extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    style: PropTypes.object,
  }

  static defaultProps = {
    style: componentStyle,
  }

  render() {
    const { className, style, ...props } = this.props;

    return (
      <header {...props} className={cx(style && style.component, className)}>
        <a href="#" className={style.logo}>Workflow Designer</a>
        <h1 className={style.title}>
          Current: Title Here
          <i className="icon-gear" />
        </h1>
      </header>
    );
  }
}
