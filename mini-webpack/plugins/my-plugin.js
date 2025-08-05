/**
 * 自定义插件示例
 * 插件需要实现apply方法，接收compiler实例
 */
class MyPlugin {
  constructor(options = {}) {
    this.options = options;
  }

  apply(compiler) {
    // 注册beforeRun钩子回调
    compiler.hooks.beforeRun.tap('MyPlugin', () => {
      console.log('MyPlugin: 打包开始...');
    });

    // 注册afterCompile钩子回调
    compiler.hooks.afterCompile.tap('MyPlugin', (modules) => {
      console.log(`MyPlugin: 模块解析完成，共解析了 ${Object.keys(modules).length} 个模块`);
    });

    // 注册done钩子回调
    compiler.hooks.done.tap('MyPlugin', () => {
      console.log('MyPlugin: 打包完成！');
    });
  }
}

module.exports = MyPlugin;