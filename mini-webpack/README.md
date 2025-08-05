# mini-webpack 实现

这是一个简化版的webpack实现，包含webpack的核心功能，包括模块打包、插件系统和loader转换能力。

## 项目目标

实现一个简化版的 webpack（mini-webpack），核心目标是复现 webpack 的模块打包核心逻辑、插件扩展机制和loader 转换能力，理解其工作原理。不关注性能优化、边界场景处理（如循环依赖、异常捕获），仅聚焦核心流程。

## 核心功能

1. **模块解析（Module Resolution）**：根据模块引用路径找到对应的物理文件路径
2. **依赖图谱构建（Dependency Graph）**：递归解析每个模块的依赖，构建依赖关系图谱
3. **模块转换与打包（Module Bundling）**：将依赖图谱中的所有模块转换为浏览器可执行的代码
4. **插件系统（Plugin System）**：通过钩子机制介入打包流程
5. **Loader系统（Loader System）**：转换非JS模块为JS模块

## 项目结构

```
mini-webpack/
├── lib/                      # 核心库
│   ├── compiler.js           # 编译器（核心调度者）
│   ├── dependency-graph.js   # 依赖图谱构建器
│   ├── hooks.js              # 钩子系统
│   ├── loader-runner.js      # Loader运行器
│   └── module-resolver.js    # 模块解析器
├── loaders/                  # 示例loader
│   └── css-loader.js         # CSS处理loader
├── plugins/                  # 示例插件
│   └── my-plugin.js          # 自定义插件
├── src/                      # 示例项目源码
│   ├── index.js              # 入口文件
│   ├── style.css             # 样式文件
│   └── index.html            # HTML模板
├── mini-webpack.js           # 入口文件
├── package.json              # 项目配置
├── webpack.config.js         # webpack配置
└── README.md                 # 项目说明
```

## 使用方法

1. 安装依赖

```bash
npm install
```

2. 运行打包

```bash
npm run build
```

或直接运行：

```bash
node mini-webpack.js
```

## 配置文件示例

```javascript
module.exports = {
  entry: './src/index.js',
  output: {
    path: './dist',
    filename: 'bundle.js'
  },
  module: {
    rules: [
      { test: /\.css$/, use: ['./loaders/css-loader'] }
    ]
  },
  plugins: [new MyPlugin()]
};
```

## 自定义插件示例

```javascript
class MyPlugin {
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    compiler.hooks.beforeRun.tap('MyPlugin', () => {
      console.log('MyPlugin: 打包开始...');
    });

    compiler.hooks.done.tap('MyPlugin', () => {
      console.log('MyPlugin: 打包完成！');
    });
  }
}
```

## 自定义Loader示例

```javascript
function cssLoader(source) {
  const escapedCSS = source
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');

  return `
    const style = document.createElement('style');
    style.textContent = "${escapedCSS}";
    document.head.appendChild(style);
    module.exports = "${escapedCSS}";
  `;
}

module.exports = cssLoader;
```

## 工作流程

1. 初始化：读取配置
2. 插件注册：调用所有插件的apply方法，注册钩子回调
3. 触发beforeRun钩子：通知插件即将开始打包
4. 构建依赖图谱：从入口文件开始，解析每个模块的路径，对非JS模块执行loader转换，提取依赖，递归解析
5. 触发afterCompile钩子：通知插件模块解析完成
6. 打包生成bundle：将所有模块包装并合并为一个JS文件
7. 写入输出文件：按output配置写入磁盘
8. 触发done钩子：通知插件打包完成

## 局限性

本实现是一个简化版的webpack，主要用于学习和理解webpack的核心原理，存在以下局限性：

1. 不支持代码分割（Code Splitting）
2. 不支持热模块替换（HMR）
3. 不支持SourceMap
4. 不处理循环依赖
5. 错误处理机制简单
6. 不支持异步钩子和异步loader

## 扩展方向

如果想进一步完善这个mini-webpack，可以考虑以下方向：

1. 支持代码分割
2. 实现热模块替换
3. 添加SourceMap支持
4. 优化打包性能
5. 支持更多文件类型
6. 实现异步钩子和异步loader
[参考](./OPT.md)
