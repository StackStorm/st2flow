// Copyright 2019 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

export default function reducer(state = {}, action) {
  state = { ...state };

  switch(action.type) {
    case 'CHANGE_LOCATION':
      const { pathname, search='', hash='' } = action.location;
      state.location = { pathname, search, hash };
      break;
    default:
      break;
  }

  return state;
}
