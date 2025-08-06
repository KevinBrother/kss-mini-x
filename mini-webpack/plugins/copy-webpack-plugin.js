/**
 * CopyWebpackPlugin
 * 用于复制文件或目录到输出目录
 */
const fs = require('fs');
const path = require('path');

class CopyWebpackPlugin {
  /**
   * 构造函数
   * @param {Object} options - 插件选项
   * @param {Array} options.patterns - 复制模式列表
   */
  constructor(options = {}) {
    this.patterns = options.patterns || [];
  }

  /**
   * 应用插件
   * @param {Compiler} compiler - 编译器实例
   */
  apply(compiler) {
    // 注册afterCompile钩子
    compiler.hooks.afterCompile.tap('CopyWebpackPlugin', () => {
      this.copyFiles(compiler);
    });
  }

  /**
   * 复制文件
   * @param {Compiler} compiler - 编译器实例
   */
  copyFiles(compiler) {
    const context = compiler.context;
    const outputPath = path.resolve(context, compiler.config.output.path);

    // 确保输出目录存在
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // 处理每个复制模式
    this.patterns.forEach(pattern => {
      const { from, to } = pattern;
      const fromPath = path.resolve(context, from);
      const toPath = path.resolve(outputPath, to || path.basename(from));

      // 检查源文件是否存在
      if (!fs.existsSync(fromPath)) {
        console.warn(`CopyWebpackPlugin: 源文件不存在: ${fromPath}`);
        return;
      }

      // 复制文件
      try {
        const content = fs.readFileSync(fromPath);
        fs.writeFileSync(toPath, content);
        console.log(`CopyWebpackPlugin: 已复制 ${fromPath} -> ${toPath}`);
      } catch (err) {
        console.error(`CopyWebpackPlugin: 复制失败: ${err.message}`);
      }
    });
  }
}

module.exports = CopyWebpackPlugin;