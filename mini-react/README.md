
# mini-react

## 重要概念

### Reconciler（协调器）

#### 目标

- 避免全量重绘、批量更新
- fiber（16+）架构中，可中断渲染

#### 工作原理

- 负责再状态变更时高效计算出哪些 DOM 需要更新（diff 算法的实现与使用）
- v18中 优先级调度（Concurrent Mode）

#### 其他

- Mutation（突变、变化）
  - Mutation 是 React 将虚拟 DOM 差异转换为真实 DOM 变更的具体指令
  - 包括：增删改、移动节点

## 参考文档

[React 技术揭秘](https://react.iamkasong.com/preparation/idea.html#cpu-%E7%9A%84%E7%93%B6%E9%A2%88)
[Introducing Concurrent Mode](https://17.reactjs.org/docs/concurrent-mode-intro.html#putting-research-into-production)
