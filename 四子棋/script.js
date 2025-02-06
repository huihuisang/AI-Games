class ConnectFour {
  constructor() {
    this.rows = 6;
    this.cols = 7;
    this.board = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(null));
    this.currentPlayer = "red";
    this.gameOver = false;
    this.init();
  }

  init() {
    this.createBoard();
    this.updateStatus();
    document
      .querySelector(".restart-btn")
      .addEventListener("click", () => this.restart());
  }

  createBoard() {
    const gameBoard = document.querySelector(".game-board");
    gameBoard.innerHTML = "";

    for (let col = 0; col < this.cols; col++) {
      const column = document.createElement("div");
      column.className = "column";

      for (let row = this.rows - 1; row >= 0; row--) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = row;
        cell.dataset.col = col;

        cell.addEventListener("click", () => this.makeMove(col));
        column.appendChild(cell);
      }
      gameBoard.appendChild(column);
    }
  }

  makeMove(col) {
    if (this.gameOver) return;

    const row = this.getLowestEmptyRow(col);
    if (row === -1) return;

    this.board[row][col] = this.currentPlayer;
    this.updateCell(row, col);

    if (this.checkWin(row, col)) {
      this.gameOver = true;
      alert(`${this.currentPlayer === "red" ? "红方" : "黄方"}获胜！`);
      return;
    }

    if (this.checkDraw()) {
      this.gameOver = true;
      alert("平局！");
      return;
    }

    this.currentPlayer = this.currentPlayer === "red" ? "yellow" : "red";
    this.updateStatus();
  }

  getLowestEmptyRow(col) {
    for (let row = 0; row < this.rows; row++) {
      if (!this.board[row][col]) return row;
    }
    return -1;
  }

  updateCell(row, col) {
    const cell = document.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    cell.classList.add(this.currentPlayer);
  }

  updateStatus() {
    const status = document.querySelector(".current-player");
    status.textContent = this.currentPlayer === "red" ? "红方" : "黄方";
  }

  checkWin(row, col) {
    const directions = [
      [
        [0, 1],
        [0, -1],
      ], // 水平
      [
        [1, 0],
        [-1, 0],
      ], // 垂直
      [
        [1, 1],
        [-1, -1],
      ], // 对角线
      [
        [1, -1],
        [-1, 1],
      ], // 反对角线
    ];

    return directions.some((dir) => {
      const count =
        1 +
        this.countDirection(row, col, dir[0][0], dir[0][1]) +
        this.countDirection(row, col, dir[1][0], dir[1][1]);
      return count >= 4;
    });
  }

  countDirection(row, col, deltaRow, deltaCol) {
    let count = 0;
    let currentRow = row + deltaRow;
    let currentCol = col + deltaCol;

    while (
      currentRow >= 0 &&
      currentRow < this.rows &&
      currentCol >= 0 &&
      currentCol < this.cols &&
      this.board[currentRow][currentCol] === this.currentPlayer
    ) {
      count++;
      currentRow += deltaRow;
      currentCol += deltaCol;
    }

    return count;
  }

  checkDraw() {
    return this.board.every((row) => row.every((cell) => cell !== null));
  }

  restart() {
    this.board = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(null));
    this.currentPlayer = "red";
    this.gameOver = false;
    this.createBoard();
    this.updateStatus();
  }
}

// 启动游戏
document.addEventListener("DOMContentLoaded", () => {
  new ConnectFour();
});
