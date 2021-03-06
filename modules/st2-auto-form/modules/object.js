// Copyright 2020 Extreme Networks, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import { PropTypes } from 'prop-types';
import cx from 'classnames';

import TextFieldModule from './text-field';

export default class ObjectModule extends React.Component {
  static propTypes = {
    className: PropTypes.string,
    name: PropTypes.string,
    disabled: PropTypes.bool,
    spec: PropTypes.object,
    data: PropTypes.string,
    onChange: PropTypes.func,
  }

  onChange(value) {
    try {
      value = JSON.parse(value);
    }
    catch (e) {
      // error?
      value = null;
    }

    if (value) {
      this.props.onChange(value);
    }
  }

  render() {
    const { className = '', name, disabled, spec, data = {} } = this.props;

    return (
      <TextFieldModule
        className={cx('st2-form-object', className)}
        name={name}
        disabled={disabled}
        spec={spec}
        data={JSON.stringify(data, null, 2)}
        onChange={(value) => this.onChange(value)}
      />
    );
  }
}
