/**
 * Compilation 类
 * 负责模块编译、依赖收集和资源生成
 */
const path = require('path');
const DependencyGraph = require('./dependency-graph');

class Compilation {
  /**
   * 构造函数
   * @param {Object} options - 编译选项
   * @param {Object} options.config - webpack配置
   * @param {Object} options.resolver - 模块解析器
   * @param {Object} options.hooks - 编译器钩子
   */
  constructor(options) {
    this.config = options.config;
    this.resolver = options.resolver;
    this.hooks = options.hooks;
    this.context = options.context || process.cwd();
    this.modules = {}; // 存储编译后的模块
    this.assets = {}; // 存储生成的资源
  }

  /**
   * 开始编译过程
   * @returns {Object} - 编译结果
   */
  compile() {
    // 构建依赖图谱
    const dependencyGraph = new DependencyGraph({
      resolver: this.resolver,
      loaders: this.config.module
    });
    
    const entryPath = path.resolve(this.context, this.config.entry);
    this.modules = dependencyGraph.buildGraph(entryPath);
    
    // 生成资源
    this.createAssets();
    
    return {
      modules: this.modules,
      assets: this.assets
    };
  }

  /**
   * 创建资源
   */
  createAssets() {
    // 生成bundle资源
    const bundleContent = this.generateBundle(this.modules);
    const outputFilename = this.config.output.filename;
    
    this.assets[outputFilename] = {
      source: () => bundleContent,
      size: () => bundleContent.length
    };
  }

  /**
   * 生成bundle
   * @param {Object} modules - 依赖图谱
   * @returns {string} - bundle代码
   */
  generateBundle(modules) {
    let modulesCode = '';
    
    // 生成模块代码
    for (const id in modules) {
      const { code, dependencies } = modules[id];
      
      // 将依赖路径转换为模块ID
      const depsCode = JSON.stringify(dependencies);
      
      // 包装模块代码
      modulesCode += `${id}: [function(require, module, exports) {\n${code}\n}, ${depsCode}],\n`;
    }
    
    // 生成完整的bundle代码
    return `
(function(modules) {
  // 模块缓存
  var installedModules = {};
  
  // 实现require函数
  function require(moduleId) {
    // 检查模块是否在缓存中
    if (installedModules[moduleId]) {
      return installedModules[moduleId].exports;
    }
    
    // 创建新模块并放入缓存
    var module = installedModules[moduleId] = {
      id: moduleId,
      loaded: false,
      exports: {}
    };
    
    // 执行模块函数
    var moduleFunction = modules[moduleId][0];
    var dependencies = modules[moduleId][1];
    
    // 创建require函数的本地版本
    function localRequire(relativePath) {
      return require(dependencies[relativePath]);
    }
    
    // 调用模块函数
    moduleFunction(localRequire, module, module.exports);
    
    // 标记模块为已加载
    module.loaded = true;
    
    // 返回模块的导出
    return module.exports;
  }
  
  // 加载入口模块并返回导出
  return require('0');
})({\n${modulesCode}});
`;
  }
}

module.exports = Compilation;