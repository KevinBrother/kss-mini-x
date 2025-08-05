/**
 * 编译器
 * 作为核心调度者，负责启动打包流程并触发钩子
 */
const fs = require('fs');
const path = require('path');
const { SyncHook } = require('./hooks');
const ModuleResolver = require('./module-resolver');
const DependencyGraph = require('./dependency-graph');

class Compiler {
  /**
   * 构造函数
   * @param {Object} config - webpack配置
   */
  constructor(config) {
    this.config = config;
    this.context = process.cwd();
    
    // 初始化钩子
    this.hooks = {
      beforeRun: new SyncHook(),
      afterCompile: new SyncHook(),
      done: new SyncHook()
    };
    
    // 初始化模块解析器
    this.resolver = new ModuleResolver({
      extensions: ['.js', '.json', '.css']
    });
  }

  /**
   * 应用插件
   * @param {Array} plugins - 插件列表
   */
  applyPlugins(plugins = []) {
    if (!Array.isArray(plugins)) {
      plugins = [plugins];
    }
    
    for (const plugin of plugins) {
      if (plugin && typeof plugin.apply === 'function') {
        plugin.apply(this);
      }
    }
  }

  /**
   * 启动打包流程
   */
  run() {
    // 触发beforeRun钩子
    this.hooks.beforeRun.call();
    
    // 构建依赖图谱
    const dependencyGraph = new DependencyGraph({
      resolver: this.resolver,
      loaders: this.config.module
    });
    
    const entryPath = path.resolve(this.context, this.config.entry);
    const modules = dependencyGraph.buildGraph(entryPath);
    
    // 触发afterCompile钩子
    this.hooks.afterCompile.call(modules);
    
    // 生成bundle
    const bundle = this.generateBundle(modules);
    
    // 写入输出文件
    this.emitFile(bundle);
    
    // 触发done钩子
    this.hooks.done.call();
    
    return {
      modules,
      bundle
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

  /**
   * 写入输出文件
   * @param {string} content - 文件内容
   */
  emitFile(content) {
    const outputPath = path.resolve(this.context, this.config.output.path);
    const outputFile = path.join(outputPath, this.config.output.filename);
    
    // 确保输出目录存在
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(outputFile, content);
    console.log(`Bundle已生成: ${outputFile}`);
  }
}

module.exports = Compiler;