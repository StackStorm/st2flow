// Copyright 2020 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

global.document = {
  ...global.document,

  _title: 'My App Title',
  get title() {
    return this._title;
  },
  set title(title) {
    this._title = title;
  },
};
