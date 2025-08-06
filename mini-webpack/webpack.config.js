// webpack配置文件
const path = require("path");
const baseConfig = require("./webpack.kss.config");
const { merge } = require("webpack-merge");

module.exports = merge(baseConfig, {
  output: {
    filename: "bundle.js",
  },
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
});
