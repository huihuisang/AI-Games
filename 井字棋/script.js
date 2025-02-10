// 获取DOM元素
const cells = document.querySelectorAll("[data-cell]");
const status = document.getElementById("status");
const restartButton = document.getElementById("restartButton");

// 游戏状态变量
let currentPlayer = "X";
let gameActive = true;
let gameState = ["", "", "", "", "", "", "", "", ""];

// 获胜组合
const winningCombinations = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // 横向
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // 纵向
  [0, 4, 8],
  [2, 4, 6], // 对角线
];

// 游戏信息
const messages = {
  turn: (player) => `玩家 ${player} 回合`,
  win: (player) => `玩家 ${player} 获胜！`,
  draw: "平局！",
};

// 处理点击事件
function handleCellClick(e, index) {
  const cell = e.target;

  // 检查单元格是否已被使用或游戏是否结束
  if (gameState[index] !== "" || !gameActive) {
    return;
  }

  // 更新游戏状态
  gameState[index] = currentPlayer;
  cell.textContent = currentPlayer;
  cell.classList.add(currentPlayer.toLowerCase());

  // 检查是否获胜
  if (checkWin()) {
    gameActive = false;
    status.textContent = messages.win(currentPlayer);
    return;
  }

  // 检查是否平局
  if (checkDraw()) {
    gameActive = false;
    status.textContent = messages.draw;
    return;
  }

  // 切换玩家
  currentPlayer = currentPlayer === "X" ? "O" : "X";
  status.textContent = messages.turn(currentPlayer);
}

// 检查获胜
function checkWin() {
  return winningCombinations.some((combination) => {
    return combination.every((index) => {
      return gameState[index] === currentPlayer;
    });
  });
}

// 检查平局
function checkDraw() {
  return gameState.every((cell) => cell !== "");
}

// 重启游戏
function restartGame() {
  currentPlayer = "X";
  gameActive = true;
  gameState = ["", "", "", "", "", "", "", "", ""];
  status.textContent = messages.turn(currentPlayer);
  cells.forEach((cell) => {
    cell.textContent = "";
    cell.classList.remove("x", "o");
  });
}

// 添加事件监听器
cells.forEach((cell, index) => {
  cell.addEventListener("click", (e) => handleCellClick(e, index));
});

restartButton.addEventListener("click", restartGame);
