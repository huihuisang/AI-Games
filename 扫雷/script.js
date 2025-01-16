class Minesweeper {
  constructor(rows = 9, cols = 9, mines = 10) {
    this.rows = rows;
    this.cols = cols;
    this.mines = mines;
    this.board = [];
    this.revealed = new Set();
    this.flagged = new Set();
    this.gameOver = false;
    this.timeStart = null;
    this.timer = null;

    this.init();
    this.setupEventListeners();
  }

  init() {
    // 初始化空板
    this.board = Array(this.rows)
      .fill()
      .map(() => Array(this.cols).fill(0));
    this.revealed.clear();
    this.flagged.clear();
    this.gameOver = false;

    // 随机放置地雷
    let minesPlaced = 0;
    while (minesPlaced < this.mines) {
      const row = Math.floor(Math.random() * this.rows);
      const col = Math.floor(Math.random() * this.cols);
      if (this.board[row][col] !== -1) {
        this.board[row][col] = -1;
        minesPlaced++;
      }
    }

    // 计算每个格子周围的地雷数
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.board[row][col] === -1) continue;
        this.board[row][col] = this.countAdjacentMines(row, col);
      }
    }

    this.renderBoard();
    this.updateMineCount();
    this.startTimer();
  }

  countAdjacentMines(row, col) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newRow = row + i;
        const newCol = col + j;
        if (
          newRow >= 0 &&
          newRow < this.rows &&
          newCol >= 0 &&
          newCol < this.cols &&
          this.board[newRow][newCol] === -1
        ) {
          count++;
        }
      }
    }
    return count;
  }

  renderBoard() {
    const gameBoard = document.getElementById("gameBoard");
    gameBoard.innerHTML = "";

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.row = row;
        cell.dataset.col = col;

        if (this.revealed.has(`${row},${col}`)) {
          cell.classList.add("revealed");
          if (this.board[row][col] === -1) {
            cell.classList.add("mine");
            cell.textContent = "💣";
          } else if (this.board[row][col] > 0) {
            cell.textContent = this.board[row][col];
          }
        } else if (this.flagged.has(`${row},${col}`)) {
          cell.classList.add("flagged");
          cell.textContent = "🚩";
        }

        gameBoard.appendChild(cell);
      }
    }
  }

  reveal(row, col) {
    if (this.gameOver || this.flagged.has(`${row},${col}`)) return;

    if (!this.revealed.has(`${row},${col}`)) {
      this.revealed.add(`${row},${col}`);

      if (this.board[row][col] === -1) {
        this.gameOver = true;
        this.revealAll();
        this.stopTimer();
        return;
      }

      if (this.board[row][col] === 0) {
        // 如果是空格，递归显示周围的格子
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const newRow = row + i;
            const newCol = col + j;
            if (
              newRow >= 0 &&
              newRow < this.rows &&
              newCol >= 0 &&
              newCol < this.cols
            ) {
              this.reveal(newRow, newCol);
            }
          }
        }
      }

      this.renderBoard();
      this.checkWin();
    }
  }

  toggleFlag(row, col) {
    if (this.gameOver || this.revealed.has(`${row},${col}`)) return;

    const key = `${row},${col}`;
    if (this.flagged.has(key)) {
      this.flagged.delete(key);
    } else {
      this.flagged.add(key);
    }

    this.renderBoard();
    this.updateMineCount();
  }

  revealAll() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        this.revealed.add(`${row},${col}`);
      }
    }
    this.renderBoard();
  }

  checkWin() {
    const totalCells = this.rows * this.cols;
    const revealedCount = this.revealed.size;
    if (revealedCount === totalCells - this.mines) {
      this.gameOver = true;
      this.showMessage("恭喜你赢了！");
      this.stopTimer();
    }
  }

  updateMineCount() {
    const remainingMines = this.mines - this.flagged.size;
    document.getElementById(
      "mineCount"
    ).textContent = `剩余地雷: ${remainingMines}`;
  }

  startTimer() {
    this.stopTimer();
    this.timeStart = Date.now();
    this.timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - this.timeStart) / 1000);
      document.getElementById("timer").textContent = `时间: ${seconds}`;
    }, 1000);
  }

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  setupEventListeners() {
    const gameBoard = document.getElementById("gameBoard");
    let longPressTimer;
    let isLongPress = false;
    let touchStartTime;
    let selectedCell = null;

    // 添加键盘事件监听
    document.addEventListener("keydown", (e) => {
      if (e.key === "5" && selectedCell) {
        const row = parseInt(selectedCell.dataset.row);
        const col = parseInt(selectedCell.dataset.col);
        this.toggleFlag(row, col);
      }
    });

    // 添加格子选中状态
    gameBoard.addEventListener("mouseover", (e) => {
      if (e.target.classList.contains("cell")) {
        if (selectedCell) {
          selectedCell.classList.remove("selected");
        }
        selectedCell = e.target;
        selectedCell.classList.add("selected");
      }
    });

    gameBoard.addEventListener("mouseout", (e) => {
      if (e.target.classList.contains("cell")) {
        e.target.classList.remove("selected");
        if (e.target === selectedCell) {
          selectedCell = null;
        }
      }
    });

    // 触摸开始时启动计时器
    gameBoard.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault(); // 阻止默认行为
        if (!e.target.classList.contains("cell")) return;

        isLongPress = false;
        touchStartTime = Date.now();

        longPressTimer = setTimeout(() => {
          isLongPress = true;
          const row = parseInt(e.target.dataset.row);
          const col = parseInt(e.target.dataset.col);
          this.toggleFlag(row, col);
        }, 500);
      },
      { passive: false }
    );

    // 触摸结束时清除计时器
    gameBoard.addEventListener(
      "touchend",
      (e) => {
        e.preventDefault(); // 阻止默认行为
        clearTimeout(longPressTimer);

        if (!e.target.classList.contains("cell")) return;

        const touchDuration = Date.now() - touchStartTime;

        // 只有在触摸时间小于500ms且不是长按的情况下才揭示格子
        if (touchDuration < 500 && !isLongPress) {
          const row = parseInt(e.target.dataset.row);
          const col = parseInt(e.target.dataset.col);
          this.reveal(row, col);
        }
      },
      { passive: false }
    );

    // 触摸移动时清除计时器
    gameBoard.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault(); // 阻止默认行为
        clearTimeout(longPressTimer);
        isLongPress = false;
      },
      { passive: false }
    );

    // 取消默认的上下文菜单
    gameBoard.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    // 普通点击事件（仅在非触摸设备上使用）
    if (!("ontouchstart" in window)) {
      gameBoard.addEventListener("click", (e) => {
        if (!e.target.classList.contains("cell")) return;
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        this.reveal(row, col);
      });

      gameBoard.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (!e.target.classList.contains("cell")) return;
        const row = parseInt(e.target.dataset.row);
        const col = parseInt(e.target.dataset.col);
        this.toggleFlag(row, col);
      });
    }

    document.getElementById("newGame").addEventListener("click", () => {
      this.init();
    });

    document.getElementById("closeMessage").addEventListener("click", () => {
      document.getElementById("gameMessage").classList.remove("show");
    });
  }

  showMessage(text) {
    const messageEl = document.getElementById("gameMessage");
    const messageText = document.getElementById("messageText");
    messageText.textContent = text;
    messageEl.classList.add("show");
  }
}

// 启动游戏
new Minesweeper();
