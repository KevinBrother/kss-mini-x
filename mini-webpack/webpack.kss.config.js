// webpack配置文件
const path = require('path');
const MyPlugin = require('./plugins/my-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'kss_bundle.js'
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['./loaders/css-loader'] } // 自定义css-loader
    ]
  },
  plugins: [new MyPlugin()],

  // webpack 测试配置，暂不实现
  // 关闭 代码压缩
  optimization: {
    minimize: false
  }
};