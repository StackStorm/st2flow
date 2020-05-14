// Copyright 2020 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

global.document = {
  ...global.document,

  createElement: () => null,
};

global.btoa = (input) => Buffer.from(input).toString('base64');
global.atob = (input) => Buffer.from(input, 'base64').toString();
