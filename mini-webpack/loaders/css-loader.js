/**
 * 自定义CSS Loader
 * 将CSS内容转换为JS模块
 * @param {string} source - CSS文件内容
 * @returns {string} - 转换后的JS代码
 */
function cssLoader(source) {
  // 转义CSS中的特殊字符
  const escapedCSS = source
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"');

  // 生成注入CSS的JS代码
  return `
    // 创建style标签
    const style = document.createElement('style');
    // 设置CSS内容
    style.textContent = "${escapedCSS}";
    // 将style标签添加到head中
    document.head.appendChild(style);
    // 导出CSS内容
    module.exports = "${escapedCSS}";
  `;
}

module.exports = cssLoader;