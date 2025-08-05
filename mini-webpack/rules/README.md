# 我要实现一个 mini-webpack, 包含 webpack 的核心功能

## 一、项目目标

实现一个简化版的 webpack（mini-webpack），核心目标是复现 webpack 的模块打包核心逻辑、插件扩展机制和loader 转换能力，理解其工作原理。不关注性能优化、边界场景处理（如循环依赖、异常捕获），仅聚焦核心流程。

## 二、核心功能设计（Core Features）

webpack 的核心是 “将多个模块（文件）打包成一个或多个 bundle 文件”，核心功能需包含以下模块：

### 1、模块解析（Module Resolution）

- 功能描述：
根据模块引用路径（如 import './a.js'、require('lodash')），找到对应的物理文件路径。

- 实现要点：
  - 路径处理：
支持相对路径（./、../）、绝对路径、模块路径（如 lodash 会去 node_modules 查找）。
自动补全扩展名：默认尝试 .js、.json（可配置扩展）。
  - 模块查找规则：
对于模块路径（如 import 'xxx'），依次查找 node_modules/xxx、../node_modules/xxx 等上级目录。
处理目录模块：若路径指向目录，查找目录下的 package.json（读取 main 字段）或 index.js。

### 2、依赖图谱构建（Dependency Graph）

- 功能描述：
递归解析每个模块的依赖（如 import/require 语句），构建一个包含所有模块及依赖关系的图谱（DAG）。
- 实现要点：
  - 模块解析：读取文件内容，提取其中的依赖引用（如通过正则匹配 import 'xxx' 或 require('xxx')）。
  - 去重处理：同一模块被多次引用时，仅解析一次，避免重复打包。
  - 图谱结构：用对象存储模块信息，包含 id（唯一标识）、path（文件路径）、dependencies（依赖的模块 id 列表）、code（模块代码）。

### 3、模块转换与打包（Module Bundling）

- 功能描述：
将依赖图谱中的所有模块，转换为浏览器可执行的代码（合并成一个 bundle），并处理模块间的引用关系。
- 实现要点：
  - 模块包装：将每个模块的代码包裹在函数中，避免全局变量污染，通过 module、exports 暴露接口（类似 CommonJS 规范）。
  - 依赖注入：在 bundle 中维护一个模块缓存，执行模块时传入其依赖的模块，确保引用正确。
  - 入口执行：最后执行入口模块，触发整个依赖链的执行。

## 三、插件系统设计（Plugin System）

- 功能描述：
webpack 插件通过 “钩子（hooks）” 介入打包流程，mini-webpack 需实现简化的钩子机制，支持插件注册和触发。
- 实现要点：
  - 核心原理
钩子（Hooks）：在打包的关键阶段（如 “开始打包前”“图谱构建后”）定义钩子，插件可注册回调函数。
插件格式：遵循社区规范，插件是一个包含 apply 方法的类，apply 方法接收编译器实例，用于注册钩子。
  - 实现要点
钩子类型：支持同步钩子（SyncHook），简化实现（暂不考虑异步）。
编译器（Compiler）：作为核心调度者，包含所有钩子，负责启动打包流程并触发钩子。

## 四、Loader 系统设计（Loader System）

- 功能描述：
Loader 用于转换非 JS 模块（如 CSS、TS）为 JS 模块，mini-webpack 需支持 loader 链式调用，兼容社区 loader。
- 实现要点：
  - 核心原理
转换流程：对于非 JS 文件（如 .css），通过 loader 转换为 JS 代码（如将 CSS 转为 module.exports = "css内容"）。
执行顺序：loader 按配置顺序从右到左执行（如 use: ['style-loader', 'css-loader'] 先执行 css-loader，再执行 style-loader）。
  - 实现要点
loader 查找：支持本地 loader 和 node_modules 中的 loader（如 css-loader 会去 node_modules 查找）。
链式调用：将前一个 loader 的输出作为下一个 loader 的输入，最终返回 JS 代码。
与模块解析结合：在解析模块后、提取依赖前，对非 JS 文件执行 loader 转换。

## 五、整体流程（mini-webpack 工作流）

- 初始化：读取配置（entry、output、plugins、module.rules 等）。
- 插件注册：调用所有插件的 apply 方法，注册钩子回调。
- 触发 beforeRun 钩子：通知插件 “即将开始打包”。
- 构建依赖图谱：
从入口文件开始，解析每个模块的路径。
对非 JS 模块执行 loader 转换。
提取依赖，递归解析，生成完整依赖图谱。
- 触发 afterCompile 钩子：通知插件 “模块解析完成”。
- 打包生成 bundle：将所有模块包装并合并为一个 JS 文件。
- 写入输出文件：按 output 配置写入磁盘。
- 触发 done 钩子：通知插件 “打包完成”。

## 六、使用示例

- 配置文件（webpack.config.js）

``` javascript
module.exports = {
  entry: './src/index.js',
  output: {
    path: './dist',
    filename: 'bundle.js'
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['./loaders/css-loader'] } // 自定义 css-loader
    ]
  },
  plugins: [new MyPlugin()] // 使用自定义插件
};
```

- 运行 mini-webpack

``` javascript
// mini-webpack.js（入口）
const Compiler = require('./compiler');
const config = require('./webpack.config');

const compiler = new Compiler(config);
compiler.applyPlugins(config.plugins); // 注册插件
compiler.run(); // 启动打包
```
