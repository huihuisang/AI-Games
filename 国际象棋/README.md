# 国际象棋

这是一个使用 HTML、CSS 和 JavaScript 开发的网页版国际象棋游戏。游戏完全遵循国际象棋规则，支持双人对战。

## 功能特点

1. 完整的国际象棋规则实现：

   - 所有棋子的标准走法
   - 特殊走法：
     - 王车易位（短易位和长易位）
     - 吃过路兵
     - 兵升变（可升变为后、车、象、马）
   - 将军和将死检测

2. 游戏辅助功能：

   - 高亮显示当前选中棋子的可移动位置
   - 显示当前回合方
   - 显示将军和将死状态
   - 显示被吃掉的棋子
   - 悔棋功能
   - 重新开始功能

3. 移动端支持：
   - 响应式设计，适配各种屏幕尺寸
   - 触摸屏操作支持

## 如何开始游戏

1. 直接点击首页上的国际象棋卡片进入游戏
2. 或者直接访问 `国际象棋/index.html`

## 游戏规则

1. 基本规则：

   - 白方先行
   - 每次只能移动一个己方棋子
   - 不能移动到被己方棋子占据的格子
   - 可以吃掉对方的棋子

2. 特殊规则：

   - 王车易位：王和车都未移动过时，它们之间无棋子，且路径上的格子未被攻击时可以易位
   - 吃过路兵：当对方的兵第一次移动两格时，我方的兵可以在下一回合吃掉这个过路兵
   - 兵升变：当兵到达对方底线时，可以升变为后、车、象或马

3. 胜负判定：
   - 当一方被将军且无法解除时（将死），游戏结束，对方获胜
   - 可以使用悔棋功能撤销最后一步移动
   - 可以随时点击"重新开始"按钮开始新游戏

## 操作说明

1. 移动棋子：

   - 点击要移动的棋子
   - 高亮的格子表示可以移动到的位置
   - 点击高亮的格子完成移动

2. 特殊操作：

   - 兵升变：当兵到达底线时，会弹出选择框，点击想要升变的棋子即可
   - 王车易位：点击王，然后点击可以易位的位置（向左两格或向右两格）
   - 吃过路兵：和普通吃子操作相同，点击兵然后点击可以吃的过路兵位置

3. 功能按钮：
   - 悔棋：点击"悔棋"按钮可以撤销上一步移动
   - 重新开始：点击"重新开始"按钮可以开始新游戏

## 技术实现

- 使用原生 JavaScript 实现，无需任何外部依赖
- 采用面向对象的编程方式，便于维护和扩展
- 使用 CSS Grid 布局实现棋盘
- 使用 Unicode 字符显示棋子，无需图片资源

## 未来改进方向

1. 添加更多国际象棋规则：

   - 王车易位
   - 兵的升变
   - 过路兵
   - 将军和将死检测

2. 添加更多功能：

   - 计时器
   - 保存游戏进度
   - 复盘功能
   - AI 对手
   - 在线对战

3. 界面优化：
   - 添加音效
   - 动画效果
   - 主题切换
   - 棋子拖拽移动
