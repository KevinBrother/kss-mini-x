/**
 * Loader运行器
 * 负责加载和执行Loader链
 */
const path = require('path');
const fs = require('fs');

class LoaderRunner {
  /**
   * 运行loader链
   * @param {Array<string>} loaders - loader路径数组
   * @param {string} source - 源代码
   * @param {string} context - 上下文路径
   * @returns {string} - 转换后的代码
   */
  static runLoaders(loaders, source, context) {
    if (!loaders || loaders.length === 0) {
      return source;
    }

    // 从右到左执行loader链
    return loaders.slice().reverse().reduce((code, loaderPath) => {
      // 解析loader路径
      const resolvedLoaderPath = LoaderRunner.resolveLoader(loaderPath, context);
      // 加载loader
      const loader = require(resolvedLoaderPath);
      // 执行loader
      return loader(code);
    }, source);
  }

  /**
   * 解析loader路径
   * @param {string} loaderPath - loader路径
   * @param {string} context - 上下文路径
   * @returns {string} - 解析后的绝对路径
   */
  static resolveLoader(loaderPath, context) {
    // 处理相对路径
    if (loaderPath.startsWith('./') || loaderPath.startsWith('../')) {
      return path.resolve(context, loaderPath);
    }

    // 处理绝对路径
    if (path.isAbsolute(loaderPath)) {
      return loaderPath;
    }

    // 处理模块路径（从node_modules查找）
    const nodeModulesPath = path.resolve(context, 'node_modules', loaderPath);
    if (fs.existsSync(nodeModulesPath)) {
      return nodeModulesPath;
    }

    // 尝试添加-loader后缀（webpack约定）
    const withLoaderSuffix = `${loaderPath}-loader`;
    const nodeModulesPathWithSuffix = path.resolve(context, 'node_modules', withLoaderSuffix);
    if (fs.existsSync(nodeModulesPathWithSuffix)) {
      return nodeModulesPathWithSuffix;
    }

    throw new Error(`无法解析loader: ${loaderPath}`);
  }
}

module.exports = LoaderRunner;