// this file should only be used for tests, hence the non-standard name.
module.exports = function (api) {
  api.cache(true);
  const presets = ['@babel/preset-react', '@babel/preset-typescript',
    ['@babel/preset-env', { targets: { node: 'current' } }],
  ]
  const plugins = [['@babel/plugin-proposal-decorators', {version: '2023-11'}]]
  return {
    presets, plugins
  }
}