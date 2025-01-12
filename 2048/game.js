const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const gameOverElement = document.getElementById("gameOver");
const finalScoreElement = document.getElementById("finalScore");

const GRID_SIZE = 4;
const CELL_SIZE = Math.min(window.innerWidth, window.innerHeight) * 0.2; // 屏幕自适应
const CELL_GAP = Math.floor(CELL_SIZE * 0.1);

canvas.width = GRID_SIZE * (CELL_SIZE + CELL_GAP) + CELL_GAP;
canvas.height = canvas.width;

let board = [];
let score = 0;
let gameOver = false;

// 添加动画相关的状态
let animations = [];
const ANIMATION_DURATION = 150; // 动画持续时间(毫秒)

// 初始化游戏板
function initBoard() {
  board = Array(GRID_SIZE)
    .fill()
    .map(() => Array(GRID_SIZE).fill(0));
  score = 0;
  gameOver = false;
  scoreElement.textContent = `分数: ${score}`;
  addNewTile();
  addNewTile();
  draw();
}

// 添加新的数字块
function addNewTile() {
  const emptyCells = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (board[i][j] === 0) {
        emptyCells.push({ x: i, y: j });
      }
    }
  }

  if (emptyCells.length > 0) {
    const randomCell =
      emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    board[randomCell.x][randomCell.y] = value;

    // 添加新块出现的动画
    animations.push({
      startTime: Date.now(),
      value: value,
      startX: randomCell.y * (CELL_SIZE + CELL_GAP) + CELL_GAP,
      startY: randomCell.x * (CELL_SIZE + CELL_GAP) + CELL_GAP,
      endX: randomCell.y * (CELL_SIZE + CELL_GAP) + CELL_GAP,
      endY: randomCell.x * (CELL_SIZE + CELL_GAP) + CELL_GAP,
      isMerging: false,
    });

    requestAnimationFrame(draw);
  }
}

// 绘制游戏界面
function draw() {
  ctx.fillStyle = "#bbada0";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 先绘制所有静态单元格
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const x = j * (CELL_SIZE + CELL_GAP) + CELL_GAP;
      const y = i * (CELL_SIZE + CELL_GAP) + CELL_GAP;

      // 绘制背景格子
      ctx.fillStyle = getCellBackgroundColor(0);
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

      // 绘制静态数字
      const value = board[i][j];
      if (
        value !== 0 &&
        !animations.some(
          (anim) => Math.floor(anim.endX) === x && Math.floor(anim.endY) === y
        )
      ) {
        drawCell(x, y, value, 1);
      }
    }
  }

  // 最后绘制动画中的单元格
  animations = animations.filter((animation) => {
    const progress = (Date.now() - animation.startTime) / ANIMATION_DURATION;
    if (progress >= 1) return false;

    const x = animation.startX + (animation.endX - animation.startX) * progress;
    const y = animation.startY + (animation.endY - animation.startY) * progress;
    const scale = animation.isMerging
      ? 1 + 0.1 * Math.sin(progress * Math.PI)
      : 1;

    drawCell(x, y, animation.value, scale);
    return true;
  });

  // 如果还有动画在进行中，继续请求动画帧
  if (animations.length > 0) {
    requestAnimationFrame(draw);
  }
}

// 抽取单元格绘制逻辑为独立函数
function drawCell(x, y, value, scale = 1) {
  const radius = 6; // 圆角半径
  ctx.fillStyle = getCellBackgroundColor(value);

  // 应用缩放效果
  const centerX = x + CELL_SIZE / 2;
  const centerY = y + CELL_SIZE / 2;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);

  // 绘制圆角矩形
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + CELL_SIZE - radius, y);
  ctx.quadraticCurveTo(x + CELL_SIZE, y, x + CELL_SIZE, y + radius);
  ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE - radius);
  ctx.quadraticCurveTo(
    x + CELL_SIZE,
    y + CELL_SIZE,
    x + CELL_SIZE - radius,
    y + CELL_SIZE
  );
  ctx.lineTo(x + radius, y + CELL_SIZE);
  ctx.quadraticCurveTo(x, y + CELL_SIZE, x, y + CELL_SIZE - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();

  if (value !== 0) {
    ctx.fillStyle = value <= 4 ? "#776e65" : "#f9f6f2";
    ctx.font = `bold ${value >= 1024 ? 45 : 55}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value.toString(), x + CELL_SIZE / 2, y + CELL_SIZE / 2);
  }

  ctx.restore();
}

// 获取不同数字对应的背景颜色
function getCellBackgroundColor(value) {
  const colors = {
    0: "#cdc1b4",
    2: "#eee4da",
    4: "#ede0c8",
    8: "#f2b179",
    16: "#f59563",
    32: "#f67c5f",
    64: "#f65e3b",
    128: "#edcf72",
    256: "#edcc61",
    512: "#edc850",
    1024: "#edc53f",
    2048: "#edc22e",
  };
  return colors[value] || "#3c3a32";
}

// 处理移动逻辑
function move(direction) {
  if (gameOver) return;

  const originalBoard = JSON.parse(JSON.stringify(board));
  let moved = false;

  switch (direction) {
    case 0: // 上
      for (let j = 0; j < GRID_SIZE; j++) {
        let column = [];
        // 收集非零元素
        for (let i = 0; i < GRID_SIZE; i++) {
          if (board[i][j] !== 0) {
            column.push({
              value: board[i][j],
              fromY: i,
              fromX: j,
            });
          }
        }

        const mergedValues = mergeCells(column);

        // 更新板子并创建动画
        for (let i = 0; i < GRID_SIZE; i++) {
          const newValue = mergedValues[i] || 0;
          if (board[i][j] !== newValue) {
            moved = true;
            if (newValue !== 0 && column[i]) {
              animations.push({
                startTime: Date.now(),
                value: column[i].value,
                startX: j * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                startY: column[i].fromY * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                endX: j * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                endY: i * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                isMerging: board[i][j] !== 0 && newValue !== board[i][j],
              });
            }
          }
          board[i][j] = newValue;
        }
      }
      break;

    case 1: // 右
      for (let i = 0; i < GRID_SIZE; i++) {
        let row = [];
        for (let j = 0; j < GRID_SIZE; j++) {
          if (board[i][j] !== 0) {
            row.push({
              value: board[i][j],
              fromY: i,
              fromX: j,
            });
          }
        }
        row.reverse();
        const mergedValues = mergeCells(row);
        mergedValues.reverse();

        for (let j = 0; j < GRID_SIZE; j++) {
          const newValue = mergedValues[j] || 0;
          if (board[i][j] !== newValue) {
            moved = true;
            if (newValue !== 0 && row[GRID_SIZE - 1 - j]) {
              animations.push({
                startTime: Date.now(),
                value: row[GRID_SIZE - 1 - j].value,
                startX:
                  row[GRID_SIZE - 1 - j].fromX * (CELL_SIZE + CELL_GAP) +
                  CELL_GAP,
                startY: i * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                endX: j * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                endY: i * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                isMerging: board[i][j] !== 0 && newValue !== board[i][j],
              });
            }
          }
          board[i][j] = newValue;
        }
      }
      break;

    // 下和左的逻辑类似，只需调整坐标计算
    case 2: // 下
      for (let j = 0; j < GRID_SIZE; j++) {
        let column = [];
        for (let i = 0; i < GRID_SIZE; i++) {
          if (board[i][j] !== 0) {
            column.push({
              value: board[i][j],
              fromY: i,
              fromX: j,
            });
          }
        }
        column.reverse();
        const mergedValues = mergeCells(column);
        mergedValues.reverse();

        for (let i = 0; i < GRID_SIZE; i++) {
          const newValue = mergedValues[i] || 0;
          if (board[i][j] !== newValue) {
            moved = true;
            if (newValue !== 0 && column[GRID_SIZE - 1 - i]) {
              animations.push({
                startTime: Date.now(),
                value: column[GRID_SIZE - 1 - i].value,
                startX: j * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                startY:
                  column[GRID_SIZE - 1 - i].fromY * (CELL_SIZE + CELL_GAP) +
                  CELL_GAP,
                endX: j * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                endY: i * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                isMerging: board[i][j] !== 0 && newValue !== board[i][j],
              });
            }
          }
          board[i][j] = newValue;
        }
      }
      break;

    case 3: // 左
      for (let i = 0; i < GRID_SIZE; i++) {
        let row = [];
        for (let j = 0; j < GRID_SIZE; j++) {
          if (board[i][j] !== 0) {
            row.push({
              value: board[i][j],
              fromY: i,
              fromX: j,
            });
          }
        }
        const mergedValues = mergeCells(row);

        for (let j = 0; j < GRID_SIZE; j++) {
          const newValue = mergedValues[j] || 0;
          if (board[i][j] !== newValue) {
            moved = true;
            if (newValue !== 0 && row[j]) {
              animations.push({
                startTime: Date.now(),
                value: row[j].value,
                startX: row[j].fromX * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                startY: i * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                endX: j * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                endY: i * (CELL_SIZE + CELL_GAP) + CELL_GAP,
                isMerging: board[i][j] !== 0 && newValue !== board[i][j],
              });
            }
          }
          board[i][j] = newValue;
        }
      }
      break;
  }

  if (moved) {
    addNewTile();
    scoreElement.textContent = `分数: ${score}`;
  }

  draw();
  checkGameOver();
}

// 合并单行或单列的cells
function mergeCells(cells) {
  // 只处理value属性
  let values = cells.map((cell) => cell.value);

  // 合并相同的数字
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] === values[i + 1]) {
      values[i] *= 2;
      score += values[i];
      values[i + 1] = 0;
    }
  }

  // 移除空格并补充到原始长度
  values = values.filter((value) => value !== 0);
  while (values.length < GRID_SIZE) {
    values.push(0);
  }

  return values;
}

// 检查游戏是否结束
function checkGameOver() {
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (board[i][j] === 0) return;
      if (i < GRID_SIZE - 1 && board[i][j] === board[i + 1][j]) return;
      if (j < GRID_SIZE - 1 && board[i][j] === board[i][j + 1]) return;
    }
  }
  gameOver = true;
  gameOverElement.style.display = "block";
  finalScoreElement.textContent = score;
}

// 重新开始游戏
function restartGame() {
  gameOverElement.style.display = "none";
  initBoard();
}

// 键盘事件监听
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowUp":
      move(0);
      break;
    case "ArrowRight":
      move(1);
      break;
    case "ArrowDown":
      move(2);
      break;
    case "ArrowLeft":
      move(3);
      break;
  }
});

// 初始化游戏
initBoard();
