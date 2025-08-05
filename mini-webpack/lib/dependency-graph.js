/**
 * 依赖图谱构建器
 * 递归解析模块依赖，构建依赖图谱
 */
const fs = require('fs');
const path = require('path');

class DependencyGraph {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {ModuleResolver} options.resolver - 模块解析器实例
   * @param {Object} options.loaders - loader配置
   */
  constructor(options) {
    this.resolver = options.resolver;
    this.loaders = options.loaders || {};
    this.modules = {}; // 存储所有模块信息
    this.moduleId = 0; // 模块ID计数器
  }

  /**
   * 构建依赖图谱
   * @param {string} entryPath - 入口文件路径
   * @returns {Object} - 依赖图谱
   */
  buildGraph(entryPath) {
    const absoluteEntryPath = path.resolve(entryPath);
    this.processModule(absoluteEntryPath, '.');
    return this.modules;
  }

  /**
   * 处理单个模块
   * @param {string} modulePath - 模块路径
   * @param {string} contextPath - 上下文路径
   * @returns {number} - 模块ID
   */
  processModule(modulePath, contextPath) {
    // 解析模块的绝对路径
    const resolvedPath = this.resolver.resolve(modulePath, contextPath);
    
    // 检查模块是否已处理过（去重）
    for (const id in this.modules) {
      if (this.modules[id].path === resolvedPath) {
        return id; // 返回已存在的模块ID
      }
    }
    
    // 为新模块分配ID
    const moduleId = (this.moduleId++).toString();
    
    // 读取模块内容
    let code = fs.readFileSync(resolvedPath, 'utf-8');
    
    // 应用loader转换（如果需要）
    code = this.applyLoaders(resolvedPath, code);
    
    // 创建模块对象
    this.modules[moduleId] = {
      id: moduleId,
      path: resolvedPath,
      code,
      dependencies: {}
    };
    
    // 提取并处理依赖
    const dependencies = this.extractDependencies(code);
    const dirname = path.dirname(resolvedPath);
    
    // 递归处理依赖模块
    dependencies.forEach(dep => {
      const childId = this.processModule(dep, dirname);
      this.modules[moduleId].dependencies[dep] = childId;
    });
    
    return moduleId;
  }

  /**
   * 提取模块中的依赖
   * @param {string} code - 模块代码
   * @returns {Array<string>} - 依赖列表
   */
  extractDependencies(code) {
    const dependencies = [];
    
    // 匹配 import 语句
    // 例如: import foo from './foo';
    // 或: import { foo } from './foo';
    const importRegex = /import\s+(?:[\w*{}\s,]+\s+from\s+)?['"]([^\'"]+)['"];?/g;
    let importMatch;
    while (importMatch = importRegex.exec(code)) {
      dependencies.push(importMatch[1]);
    }
    
    // 匹配 require 语句
    // 例如: const foo = require('./foo');
    const requireRegex = /require\(['"]([^\'"]+)['"]\)/g;
    let requireMatch;
    while (requireMatch = requireRegex.exec(code)) {
      dependencies.push(requireMatch[1]);
    }
    
    return dependencies;
  }

  /**
   * 应用loader转换
   * @param {string} filePath - 文件路径
   * @param {string} code - 原始代码
   * @returns {string} - 转换后的代码
   */
  applyLoaders(filePath, code) {
    const fileExt = path.extname(filePath);
    
    // 查找匹配的loader规则
    const matchedRule = this.findMatchedLoaderRule(filePath);
    if (!matchedRule) {
      return code; // 没有匹配的loader，返回原始代码
    }
    
    // 应用loader链（从右到左）
    const loaders = matchedRule.use.slice().reverse();
    let result = code;
    
    for (const loaderPath of loaders) {
      // 解析loader路径
      const resolvedLoaderPath = this.resolver.resolve(loaderPath, '.');
      // 加载loader
      const loader = require(resolvedLoaderPath);
      // 应用loader转换
      result = loader(result);
    }
    
    return result;
  }

  /**
   * 查找匹配的loader规则
   * @param {string} filePath - 文件路径
   * @returns {Object|null} - 匹配的规则或null
   */
  findMatchedLoaderRule(filePath) {
    if (!this.loaders.rules) {
      return null;
    }
    
    // 查找第一个匹配的规则
    return this.loaders.rules.find(rule => {
      if (rule.test instanceof RegExp) {
        return rule.test.test(filePath);
      }
      return false;
    });
  }
}

module.exports = DependencyGraph;