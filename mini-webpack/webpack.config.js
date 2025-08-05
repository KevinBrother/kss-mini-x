// webpack配置文件
const path = require("path");
const MyPlugin = require("./plugins/my-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  module: {
    rules: [
      { test: /\.css$/, use: ["./loaders/css-loader"] }, // 自定义css-loader
    ],
  },
  plugins: [new MyPlugin(), new CopyWebpackPlugin({
    patterns: [
      { from: 'src/index.html', to: 'index.html' }
    ]
  })],

  // webpack 测试配置，暂不实现
  mode: "development",
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    compress: true,
    port: 9000,
  },
  // 关闭 代码压缩
  optimization: {
    minimize: false,
  },
};
