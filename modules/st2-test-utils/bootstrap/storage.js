// Copyright 2019 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

global.localStorage = {
  ...global.localStorage,

  getItem: () => null,
  setItem: () => null,
  removeItem: () => null,
};

global.sessionStorage = {
  ...global.sessionStorage,

  getItem: () => null,
  setItem: () => null,
  removeItem: () => null,
};
