/**
 * 简化版钩子系统
 * 实现同步钩子(SyncHook)，支持插件注册和触发
 */

class SyncHook {
  constructor() {
    this.taps = [];
  }

  /**
   * 注册钩子回调
   * @param {string} name - 插件名称
   * @param {Function} fn - 回调函数
   */
  tap(name, fn) {
    this.taps.push({
      name,
      fn
    });
  }

  /**
   * 触发钩子，执行所有注册的回调
   * @param {any} data - 传递给回调的数据
   */
  call(data) {
    for (const tap of this.taps) {
      tap.fn(data);
    }
  }
}

module.exports = {
  SyncHook
};