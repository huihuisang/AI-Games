// 游戏常量
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = [
  "#000000",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
];

// 方块形状
const SHAPES = [
  [], // 空数组，用于索引从1开始
  [[1, 1, 1, 1]], // I
  [
    [1, 1, 1],
    [0, 1, 0],
  ], // T
  [
    [1, 1, 1],
    [1, 0, 0],
  ], // L
  [
    [1, 1, 1],
    [0, 0, 1],
  ], // J
  [
    [1, 1],
    [1, 1],
  ], // O
  [
    [1, 1, 0],
    [0, 1, 1],
  ], // Z
  [
    [0, 1, 1],
    [1, 1, 0],
  ], // S
];

// 游戏状态
let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");
let nextCanvas = document.getElementById("nextPiece");
let nextCtx = nextCanvas.getContext("2d");
let scoreElement = document.getElementById("score");
let levelElement = document.getElementById("level");
let startBtn = document.getElementById("startBtn");
let pauseBtn = document.getElementById("pauseBtn");

let score = 0;
let level = 1;
let board = Array(ROWS)
  .fill()
  .map(() => Array(COLS).fill(0));
let currentPiece = null;
let nextPiece = null;
let gameLoop = null;
let isPaused = false;
let isGameOver = false;

// 方块类
class Piece {
  constructor(shape = null, color = null) {
    this.shape =
      shape || SHAPES[Math.floor(Math.random() * (SHAPES.length - 1)) + 1];
    this.color =
      color || COLORS[Math.floor(Math.random() * (COLORS.length - 1)) + 1];
    this.x = Math.floor((COLS - this.shape[0].length) / 2);
    this.y = 0;
  }

  rotate() {
    let newShape = Array(this.shape[0].length)
      .fill()
      .map(() => Array(this.shape.length).fill(0));

    for (let y = 0; y < this.shape.length; y++) {
      for (let x = 0; x < this.shape[y].length; x++) {
        newShape[x][this.shape.length - 1 - y] = this.shape[y][x];
      }
    }

    if (!this.collision(0, 0, newShape)) {
      this.shape = newShape;
    }
  }

  collision(offsetX, offsetY, shape = this.shape) {
    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x]) {
          let newX = this.x + x + offsetX;
          let newY = this.y + y + offsetY;

          if (newX < 0 || newX >= COLS || newY >= ROWS) {
            return true;
          }

          if (newY >= 0 && board[newY][newX]) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

// 游戏控制函数
function init() {
  board = Array(ROWS)
    .fill()
    .map(() => Array(COLS).fill(0));
  score = 0;
  level = 1;
  isGameOver = false;
  scoreElement.textContent = score;
  levelElement.textContent = level;
  createNewPiece();
}

function createNewPiece() {
  currentPiece = nextPiece || new Piece();
  nextPiece = new Piece();
  drawNextPiece();

  if (currentPiece.collision(0, 0)) {
    gameOver();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制已固定的方块
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) {
        drawBlock(ctx, x, y, COLORS[board[y][x]]);
      }
    }
  }

  // 绘制当前方块
  if (currentPiece) {
    currentPiece.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value) {
          drawBlock(
            ctx,
            currentPiece.x + x,
            currentPiece.y + y,
            currentPiece.color
          );
        }
      });
    });
  }
}

function drawBlock(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
}

function drawNextPiece() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const offsetX =
    (nextCanvas.width - nextPiece.shape[0].length * BLOCK_SIZE) / 2;
  const offsetY = (nextCanvas.height - nextPiece.shape.length * BLOCK_SIZE) / 2;

  nextPiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        nextCtx.fillStyle = nextPiece.color;
        nextCtx.fillRect(
          offsetX + x * BLOCK_SIZE,
          offsetY + y * BLOCK_SIZE,
          BLOCK_SIZE - 1,
          BLOCK_SIZE - 1
        );
      }
    });
  });
}

function moveDown() {
  if (!currentPiece.collision(0, 1)) {
    currentPiece.y++;
  } else {
    freeze();
    clearLines();
    createNewPiece();
  }
  draw();
}

function moveLeft() {
  if (!currentPiece.collision(-1, 0)) {
    currentPiece.x--;
    draw();
  }
}

function moveRight() {
  if (!currentPiece.collision(1, 0)) {
    currentPiece.x++;
    draw();
  }
}

function rotate() {
  currentPiece.rotate();
  draw();
}

function freeze() {
  currentPiece.shape.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value) {
        board[currentPiece.y + y][currentPiece.x + x] = COLORS.indexOf(
          currentPiece.color
        );
      }
    });
  });
}

function clearLines() {
  let linesCleared = 0;

  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every((cell) => cell !== 0)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(0));
      linesCleared++;
      y++;
    }
  }

  if (linesCleared > 0) {
    score += linesCleared * 100 * level;
    scoreElement.textContent = score;

    if (score >= level * 1000) {
      level++;
      levelElement.textContent = level;
    }
  }
}

function gameOver() {
  isGameOver = true;
  clearInterval(gameLoop);
  alert("游戏结束！得分：" + score);
}

function togglePause() {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? "继续" : "暂停";
  if (isPaused) {
    clearInterval(gameLoop);
  } else {
    startGame();
  }
}

function startGame() {
  if (!gameLoop && !isGameOver) {
    gameLoop = setInterval(() => {
      moveDown();
    }, 1000 / level);
  }
}

// 事件监听
document.addEventListener("keydown", (event) => {
  if (!isPaused && !isGameOver) {
    switch (event.key) {
      case "ArrowLeft":
        moveLeft();
        break;
      case "ArrowRight":
        moveRight();
        break;
      case "ArrowDown":
        moveDown();
        break;
      case "ArrowUp":
        rotate();
        break;
    }
  }
});

startBtn.addEventListener("click", () => {
  init();
  startGame();
});

pauseBtn.addEventListener("click", togglePause);

// 初始化游戏
init();
