/**
 * 模块解析器
 * 根据模块引用路径找到对应的物理文件路径
 */
const fs = require('fs');
const path = require('path');

class ModuleResolver {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {Array<string>} options.extensions - 自动尝试的扩展名列表
   */
  constructor(options = {}) {
    this.extensions = options.extensions || ['.js', '.json'];
  }

  /**
   * 解析模块路径
   * @param {string} modulePath - 模块引用路径
   * @param {string} contextPath - 上下文路径（引用模块的目录）
   * @returns {string} - 解析后的绝对路径
   */
  resolve(modulePath, contextPath) {
    // 处理相对路径 (./ 或 ../)
    if (modulePath.startsWith('./') || modulePath.startsWith('../')) {
      return this.resolveRelative(modulePath, contextPath);
    }
    
    // 处理绝对路径
    if (path.isAbsolute(modulePath)) {
      return this.resolveAbsolute(modulePath);
    }
    
    // 处理模块路径 (如 'lodash')
    return this.resolveModule(modulePath, contextPath);
  }

  /**
   * 解析相对路径
   * @param {string} modulePath - 相对路径
   * @param {string} contextPath - 上下文路径
   * @returns {string} - 解析后的绝对路径
   */
  resolveRelative(modulePath, contextPath) {
    const absolutePath = path.resolve(contextPath, modulePath);
    return this.resolveFile(absolutePath) || this.resolveDirectory(absolutePath);
  }

  /**
   * 解析绝对路径
   * @param {string} modulePath - 绝对路径
   * @returns {string} - 解析后的绝对路径
   */
  resolveAbsolute(modulePath) {
    return this.resolveFile(modulePath) || this.resolveDirectory(modulePath);
  }

  /**
   * 解析模块路径（如 'lodash'）
   * @param {string} modulePath - 模块名称
   * @param {string} contextPath - 上下文路径
   * @returns {string} - 解析后的绝对路径
   */
  resolveModule(modulePath, contextPath) {
    // 从当前目录开始，向上查找 node_modules
    let currentDir = contextPath;
    while (currentDir) {
      const nodeModulesPath = path.resolve(currentDir, 'node_modules', modulePath);
      const resolvedPath = this.resolveFile(nodeModulesPath) || this.resolveDirectory(nodeModulesPath);
      
      if (resolvedPath) {
        return resolvedPath;
      }
      
      // 向上一级目录查找
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break; // 已到达根目录
      }
      currentDir = parentDir;
    }
    
    throw new Error(`无法解析模块: ${modulePath}`);
  }

  /**
   * 解析文件路径（自动尝试添加扩展名）
   * @param {string} filePath - 文件路径
   * @returns {string|null} - 解析后的文件路径，如果不存在则返回null
   */
  resolveFile(filePath) {
    // 检查文件是否直接存在
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
    
    // 尝试添加扩展名
    for (const ext of this.extensions) {
      const pathWithExt = `${filePath}${ext}`;
      if (fs.existsSync(pathWithExt) && fs.statSync(pathWithExt).isFile()) {
        return pathWithExt;
      }
    }
    
    return null;
  }

  /**
   * 解析目录路径（查找package.json或index文件）
   * @param {string} dirPath - 目录路径
   * @returns {string|null} - 解析后的文件路径，如果不存在则返回null
   */
  resolveDirectory(dirPath) {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return null;
    }
    
    // 1. 查找package.json中的main字段
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.main) {
          const mainPath = path.join(dirPath, packageJson.main);
          const resolvedMain = this.resolveFile(mainPath);
          if (resolvedMain) {
            return resolvedMain;
          }
        }
      } catch (e) {
        // 解析package.json失败，继续尝试其他方法
      }
    }
    
    // 2. 查找index文件
    for (const ext of this.extensions) {
      const indexPath = path.join(dirPath, `index${ext}`);
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return indexPath;
      }
    }
    
    return null;
  }
}

module.exports = ModuleResolver;