const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = function (options) {
  const { plugins, ...config } = options;
  return {
    ...config,
    externals: [],
    optimization: {
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            keep_classnames: true,
          },
        }),
      ],
    },
    /* TLT: Odd. webpack tries to include some unused modules. To fix this, I followed the instructions here:
    https://github.com/nestjs/nest/issues/7198
    */
    plugins: [
      ...plugins,
      new webpack.IgnorePlugin({
        checkResource(resource) {
          if (resource === '@nestjs/websockets/socket-module') {
            return true;
          } else if (resource === '@nestjs/microservices') {
            return true;
          } else if (
            resource === '@nestjs/microservices/microservices-module'
          ) {
            return true;
          } else {
            return false;
          }
        },
      }),
    ],
    output: {
      ...config.output,
      libraryTarget: 'commonjs2',
    },
  };
};
