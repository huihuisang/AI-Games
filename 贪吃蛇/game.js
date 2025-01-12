const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const gameOverElement = document.getElementById("gameOver");
const finalScoreElement = document.getElementById("finalScore");
const speedControl = document.getElementById("speedControl");
const speedValue = document.getElementById("speedValue");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [{ x: 10, y: 10 }];
let food = { x: 15, y: 15 };
let dx = 0;
let dy = 0;
let score = 0;
let gameSpeed = 200 - speedControl.value * 10;
let gameLoop;

document.addEventListener("keydown", handleKeyPress);

speedControl.addEventListener("input", function () {
  speedValue.textContent = speedControl.value;
  gameSpeed = 200 - speedControl.value * 10;
  if (gameLoop) {
    clearInterval(gameLoop);
    gameLoop = setInterval(gameUpdate, gameSpeed);
  }
});

function startGame() {
  gameLoop = setInterval(gameUpdate, gameSpeed);
}

function gameUpdate() {
  // 移动蛇
  const head = { x: snake[0].x + dx, y: snake[0].y + dy };

  // 检查是否撞墙
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    gameOver();
    return;
  }

  // 检查是否撞到自己
  if (dx !== 0 || dy !== 0) {
    for (let i = 1; i < snake.length; i++) {
      if (head.x === snake[i].x && head.y === snake[i].y) {
        gameOver();
        return;
      }
    }
  }

  snake.unshift(head);

  // 检查是否吃到食物
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = `得分: ${score}`;
    generateFood();
  } else {
    snake.pop();
  }

  // 绘制游戏画面
  draw();
}

function draw() {
  // 清空画布
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制蛇身
  snake.forEach((segment, index) => {
    if (index === 0) {
      // 蛇头使用猪头emoji
      ctx.font = `${gridSize}px Arial`;
      ctx.fillText("🐷", segment.x * gridSize, (segment.y + 1) * gridSize);
    } else {
      // 蛇身体
      ctx.fillStyle = "#4CAF50";
      ctx.fillRect(
        segment.x * gridSize,
        segment.y * gridSize,
        gridSize - 2,
        gridSize - 2
      );
    }
  });

  // 绘制食物
  ctx.fillStyle = "red";
  ctx.fillRect(
    food.x * gridSize,
    food.y * gridSize,
    gridSize - 2,
    gridSize - 2
  );
}

function handleKeyPress(event) {
  switch (event.key) {
    case "ArrowUp":
      if (dy !== 1) {
        dx = 0;
        dy = -1;
      }
      break;
    case "ArrowDown":
      if (dy !== -1) {
        dx = 0;
        dy = 1;
      }
      break;
    case "ArrowLeft":
      if (dx !== 1) {
        dx = -1;
        dy = 0;
      }
      break;
    case "ArrowRight":
      if (dx !== -1) {
        dx = 1;
        dy = 0;
      }
      break;
  }
}

function generateFood() {
  // 留出更多边缘空间，从3开始到倒数第4个格子
  food.x = Math.floor(Math.random() * (tileCount - 6)) + 3;
  food.y = Math.floor(Math.random() * (tileCount - 6)) + 3;

  // 确保食物不会出现在蛇身上
  snake.forEach((segment) => {
    if (segment.x === food.x && segment.y === food.y) {
      generateFood();
    }
  });
}

function gameOver() {
  clearInterval(gameLoop);
  gameOverElement.style.display = "block";
  finalScoreElement.textContent = score;
}

function restartGame() {
  snake = [{ x: 10, y: 10 }];
  dx = 0;
  dy = 0;
  score = 0;
  scoreElement.textContent = `得分: ${score}`;
  gameOverElement.style.display = "none";
  generateFood();
  clearInterval(gameLoop);
  gameSpeed = 200 - speedControl.value * 10;
  startGame();
}

// 开始游戏
generateFood();
startGame();
