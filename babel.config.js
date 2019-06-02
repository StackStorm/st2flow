// Copyright 2019 Extreme Networks, Inc.
//
// Unauthorized copying of this file, via any medium is strictly
// prohibited. Proprietary and confidential. See the LICENSE file
// included with this work for details.

module.exports = function (api) {
  api.cache(true);

  const presets = [
    '@babel/preset-env',
    '@babel/preset-react',
  ];
  const plugins = [
    '@babel/plugin-transform-flow-strip-types',
    [ '@babel/plugin-proposal-decorators', { 'legacy': true }],
    '@babel/plugin-proposal-class-properties',
    [ '@babel/plugin-proposal-object-rest-spread', { 'legacy': true }],
    '@babel/transform-runtime',
  ];

  return {
    presets,
    plugins,
  };
};
