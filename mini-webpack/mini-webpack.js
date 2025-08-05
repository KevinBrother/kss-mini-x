#!/usr/bin/env node

/**
 * mini-webpack入口文件
 * 读取配置并启动打包流程
 */
const path = require('path');
const Compiler = require('./lib/compiler');

// 获取配置文件路径
const configPath = path.resolve(process.cwd(), 'webpack.kss.config.js');

// 加载配置
let config;
try {
  config = require(configPath);
} catch (err) {
  console.error('无法加载webpack配置文件:', err.message);
  process.exit(1);
}

// 创建编译器实例
const compiler = new Compiler(config);

// 应用插件
compiler.applyPlugins(config.plugins);

// 启动打包
console.log('开始打包...');
compiler.run();
console.log('打包完成!');