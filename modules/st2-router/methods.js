// Copyright 2019 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

import store from '@stackstorm/module-store';

export function updateLocation(target, action) {
  const { location } = store.getState();

  return store.dispatch({
    type: 'CHANGE_LOCATION',
    action,
    location: { ...location, ...target },
  });
}

const methods = {
  push: (location) => updateLocation(location, 'PUSH'),
  replace: (location) => updateLocation(location, 'REPLACE'),
};

export default methods;
