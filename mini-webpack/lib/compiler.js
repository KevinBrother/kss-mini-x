/**
 * 编译器
 * 作为核心调度者，负责启动打包流程并触发钩子
 */
const fs = require('fs');
const path = require('path');
const { SyncHook } = require('./hooks');
const ModuleResolver = require('./module-resolver');
const Compilation = require('./compilation');

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
      done: new SyncHook(),
      thisCompilation: new SyncHook()
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
    
    // 创建compilation实例
    const compilation = new Compilation({
      config: this.config,
      resolver: this.resolver,
      hooks: this.hooks,
      context: this.context
    });


    
    // 执行编译
    const { modules, assets } = compilation.compile();
    
    // 触发afterCompile钩子
    this.hooks.afterCompile.call(modules);
    
    // 写入输出文件
    this.emitAssets(assets);
    
    // 触发done钩子
    this.hooks.done.call();
    
    return {
      modules,
      assets
    };
  }

  /**
   * 写入资源到输出目录
   * @param {Object} assets - 资源对象
   */
  emitAssets(assets) {
    const outputPath = path.resolve(this.context, this.config.output.path);
    
    // 确保输出目录存在
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // 写入所有资源文件
    for (const filename in assets) {
      const asset = assets[filename];
      const filePath = path.join(outputPath, filename);
      const content = asset.source();
      
      fs.writeFileSync(filePath, content);
      console.log(`资源已生成: ${filePath} (${asset.size()} 字节)`);
    }
  }


}

module.exports = Compiler;