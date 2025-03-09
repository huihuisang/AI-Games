// 棋子的 Unicode 字符
const PIECES = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
};

// 初始棋盘布局
const INITIAL_BOARD = [
  ["br", "bn", "bb", "bq", "bk", "bb", "bn", "br"],
  ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
  Array(8).fill(""),
  Array(8).fill(""),
  Array(8).fill(""),
  Array(8).fill(""),
  ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
  ["wr", "wn", "wb", "wq", "wk", "wb", "wn", "wr"],
];

class ChessGame {
  constructor() {
    this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
    this.currentPlayer = "white";
    this.selectedPiece = null;
    this.possibleMoves = [];
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
    this.isInCheck = false;
    this.isGameOver = false;
    this.highlightedSquares = new Set();

    // 添加特殊走法的状态
    this.enPassantTarget = null; // 可以被吃的过路兵位置
    this.castlingRights = {
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true },
    };

    this.pendingPromotion = null;

    this.initializeBoard();
    this.setupEventListeners();
    this.updateCheckStatus();
  }

  initializeBoard() {
    const chessboard = document.getElementById("chessboard");
    chessboard.innerHTML = "";

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = document.createElement("div");
        square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
        square.dataset.row = row;
        square.dataset.col = col;

        const piece = this.board[row][col];
        if (piece) {
          this.placePiece(square, piece);
        }

        chessboard.appendChild(square);
      }
    }
  }

  placePiece(square, piece) {
    const color = piece[0] === "w" ? "white" : "black";
    const type = this.getPieceType(piece[1]);
    square.innerHTML = PIECES[color][type];
    square.dataset.piece = piece;
  }

  getPieceType(letter) {
    const types = {
      k: "king",
      q: "queen",
      r: "rook",
      b: "bishop",
      n: "knight",
      p: "pawn",
    };
    return types[letter];
  }

  setupEventListeners() {
    const chessboard = document.getElementById("chessboard");
    chessboard.addEventListener("click", (e) => {
      const square = e.target.closest(".square");
      if (!square) return;

      const row = parseInt(square.dataset.row);
      const col = parseInt(square.dataset.col);

      this.handleSquareClick(row, col);
    });

    document.getElementById("restart-btn").addEventListener("click", () => {
      this.resetGame();
    });

    document.getElementById("undo-btn").addEventListener("click", () => {
      this.undoMove();
    });

    // 添加兵升变选择的事件监听
    const promotionChoices = document.querySelectorAll(".promotion-piece");
    promotionChoices.forEach((choice) => {
      choice.addEventListener("click", () => {
        if (this.pendingPromotion) {
          const piece = choice.dataset.piece;
          this.completePawnPromotion(piece);
        }
      });
    });
  }

  handleSquareClick(row, col) {
    if (this.isGameOver) {
      return;
    }

    const piece = this.board[row][col];
    const isCurrentPlayerPiece =
      piece && piece[0] === (this.currentPlayer === "white" ? "w" : "b");

    if (this.selectedPiece) {
      if (this.isValidMove(row, col)) {
        this.movePiece(row, col);
        this.clearSelection();
      } else if (isCurrentPlayerPiece) {
        this.clearSelection();
        this.selectPiece(row, col);
      } else {
        this.clearSelection();
      }
    } else if (isCurrentPlayerPiece) {
      this.selectPiece(row, col);
    }
  }

  selectPiece(row, col) {
    this.clearSelection();
    this.selectedPiece = { row, col };
    const square = document.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );
    if (square) {
      square.classList.add("selected");
      this.showPossibleMoves(row, col);
    }
  }

  clearSelection() {
    if (this.selectedPiece) {
      const selectedSquare = document.querySelector(
        `[data-row="${this.selectedPiece.row}"][data-col="${this.selectedPiece.col}"]`
      );
      if (selectedSquare) {
        selectedSquare.classList.remove("selected");
      }
      this.selectedPiece = null;
    }

    // 清除所有高亮的格子
    this.highlightedSquares.forEach((coord) => {
      const square = document.querySelector(
        `[data-row="${coord.row}"][data-col="${coord.col}"]`
      );
      if (square) {
        square.classList.remove("possible-move");
      }
    });
    this.highlightedSquares.clear();
  }

  isKingInCheck(color) {
    // 找到王的位置
    let kingRow, kingCol;
    let foundKing = false;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (
          piece &&
          piece[1] === "k" &&
          piece[0] === (color === "white" ? "w" : "b")
        ) {
          kingRow = row;
          kingCol = col;
          foundKing = true;
          break;
        }
      }
      if (foundKing) break;
    }

    if (!foundKing) return false;

    // 检查是否有任何对方棋子可以攻击到王
    const opponentColor = color === "white" ? "b" : "w";
    const originalSelected = this.selectedPiece;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece[0] === opponentColor) {
          this.selectedPiece = { row, col };

          // 检查基本移动规则，不考虑将军状态
          let canAttackKing = false;
          switch (piece[1]) {
            case "p":
              canAttackKing = this.isValidPawnMove(row, col, kingRow, kingCol);
              break;
            case "r":
              canAttackKing = this.isValidRookMove(row, col, kingRow, kingCol);
              break;
            case "n":
              canAttackKing = this.isValidKnightMove(
                row,
                col,
                kingRow,
                kingCol
              );
              break;
            case "b":
              canAttackKing = this.isValidBishopMove(
                row,
                col,
                kingRow,
                kingCol
              );
              break;
            case "q":
              canAttackKing = this.isValidQueenMove(row, col, kingRow, kingCol);
              break;
            case "k":
              canAttackKing = this.isValidKingMove(row, col, kingRow, kingCol);
              break;
          }

          if (
            canAttackKing &&
            (piece[1] === "n" || this.isPathClear(row, col, kingRow, kingCol))
          ) {
            this.selectedPiece = originalSelected;
            return true;
          }
        }
      }
    }

    this.selectedPiece = originalSelected;
    return false;
  }

  isCheckmate(color) {
    // 如果没有被将军，就不可能被将死
    if (!this.isKingInCheck(color)) {
      return false;
    }

    // 检查所有己方棋子的所有可能移动
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece[0] === (color === "white" ? "w" : "b")) {
          // 临时选择这个棋子
          const tempSelected = this.selectedPiece;
          this.selectedPiece = { row, col };

          // 检查这个棋子的所有可能移动
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              if (this.isValidMove(toRow, toCol)) {
                // 如果找到任何合法移动，就不是将死
                this.selectedPiece = tempSelected;
                return false;
              }
            }
          }
          this.selectedPiece = tempSelected;
        }
      }
    }
    // 如果没有找到任何合法移动，就是将死
    return true;
  }

  updateCheckStatus() {
    this.isInCheck = this.isKingInCheck(this.currentPlayer);
    const statusText = document.getElementById("current-player");

    if (this.isCheckmate(this.currentPlayer)) {
      const winner = this.currentPlayer === "white" ? "黑方" : "白方";
      statusText.textContent = `将死！${winner}获胜！`;
      statusText.style.color = "red";
      this.isGameOver = true;
    } else if (this.isInCheck) {
      const player = this.currentPlayer === "white" ? "白方" : "黑方";
      statusText.textContent = `${player}被将军！`;
      statusText.style.color = "red";
    } else {
      const player = this.currentPlayer === "white" ? "白方" : "黑方";
      statusText.textContent = `${player}回合`;
      statusText.style.color = "";
    }
  }

  isValidMove(toRow, toCol) {
    const fromRow = this.selectedPiece.row;
    const fromCol = this.selectedPiece.col;
    const piece = this.board[fromRow][fromCol];
    const targetPiece = this.board[toRow][toCol];

    // 基本移动规则验证
    if (targetPiece && targetPiece[0] === piece[0]) {
      return false;
    }

    let isValidBasicMove = false;
    switch (piece[1]) {
      case "p":
        isValidBasicMove =
          this.isValidPawnMove(fromRow, fromCol, toRow, toCol) ||
          this.isValidEnPassant(fromRow, fromCol, toRow, toCol);
        break;
      case "k":
        isValidBasicMove =
          this.isValidKingMove(fromRow, fromCol, toRow, toCol) ||
          this.isValidCastling(fromRow, fromCol, toRow, toCol);
        break;
      case "r":
        isValidBasicMove = this.isValidRookMove(fromRow, fromCol, toRow, toCol);
        break;
      case "n":
        isValidBasicMove = this.isValidKnightMove(
          fromRow,
          fromCol,
          toRow,
          toCol
        );
        break;
      case "b":
        isValidBasicMove = this.isValidBishopMove(
          fromRow,
          fromCol,
          toRow,
          toCol
        );
        break;
      case "q":
        isValidBasicMove = this.isValidQueenMove(
          fromRow,
          fromCol,
          toRow,
          toCol
        );
        break;
    }

    if (!isValidBasicMove) {
      return false;
    }

    // 模拟移动并检查是否解除将军状态
    const originalPiece = this.board[toRow][toCol];
    this.board[toRow][toCol] = piece;
    this.board[fromRow][fromCol] = "";

    // 如果是吃过路兵，需要移除被吃的兵
    let enPassantPiece = null;
    if (
      this.enPassantTarget &&
      piece[1] === "p" &&
      toRow === this.enPassantTarget.row &&
      toCol === this.enPassantTarget.col
    ) {
      enPassantPiece = this.board[fromRow][toCol];
      this.board[fromRow][toCol] = "";
    }

    const stillInCheck = this.isKingInCheck(this.currentPlayer);

    // 恢复棋盘状态
    this.board[fromRow][fromCol] = piece;
    this.board[toRow][toCol] = originalPiece;
    if (enPassantPiece) {
      this.board[fromRow][toCol] = enPassantPiece;
    }

    return !stillInCheck;
  }

  isValidPawnMove(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    const direction = piece[0] === "w" ? -1 : 1;
    const startRow = piece[0] === "w" ? 6 : 1;

    // 前进一步
    if (
      fromCol === toCol &&
      toRow === fromRow + direction &&
      !this.board[toRow][toCol]
    ) {
      return true;
    }

    // 首次可以前进两步
    if (
      fromRow === startRow &&
      fromCol === toCol &&
      toRow === fromRow + 2 * direction &&
      !this.board[fromRow + direction][toCol] &&
      !this.board[toRow][toCol]
    ) {
      return true;
    }

    // 普通吃子
    if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
      return (
        this.board[toRow][toCol] && this.board[toRow][toCol][0] !== piece[0]
      );
    }

    return false;
  }

  isValidEnPassant(fromRow, fromCol, toRow, toCol) {
    if (!this.enPassantTarget) return false;

    const piece = this.board[fromRow][fromCol];
    if (piece[1] !== "p") return false;

    const direction = piece[0] === "w" ? -1 : 1;

    return (
      toRow === this.enPassantTarget.row &&
      toCol === this.enPassantTarget.col &&
      fromRow === this.enPassantTarget.row - direction &&
      Math.abs(fromCol - toCol) === 1
    );
  }

  isValidCastling(fromRow, fromCol, toRow, toCol) {
    const piece = this.board[fromRow][fromCol];
    if (piece[1] !== "k") return false;

    const color = piece[0] === "w" ? "white" : "black";
    const row = color === "white" ? 7 : 0;

    // 确保王没有移动过
    if (fromRow !== row || fromCol !== 4) return false;

    // 短易位
    if (toRow === row && toCol === 6) {
      if (!this.castlingRights[color].kingSide) return false;
      if (!this.board[row][7] || this.board[row][7] !== piece[0] + "r")
        return false;
      return (
        this.isCastlingPathClear(row, 4, 7) &&
        !this.isPathUnderAttack(row, 4, 6, color)
      );
    }

    // 长易位
    if (toRow === row && toCol === 2) {
      if (!this.castlingRights[color].queenSide) return false;
      if (!this.board[row][0] || this.board[row][0] !== piece[0] + "r")
        return false;
      return (
        this.isCastlingPathClear(row, 4, 0) &&
        !this.isPathUnderAttack(row, 4, 2, color)
      );
    }

    return false;
  }

  isCastlingPathClear(row, fromCol, toCol) {
    const step = fromCol < toCol ? 1 : -1;
    for (let col = fromCol + step; col !== toCol; col += step) {
      if (this.board[row][col]) return false;
    }
    return true;
  }

  isPathUnderAttack(row, fromCol, toCol, color) {
    const step = fromCol < toCol ? 1 : -1;
    for (let col = fromCol; col !== toCol + step; col += step) {
      if (this.isSquareUnderAttack(row, col, color)) return true;
    }
    return false;
  }

  isSquareUnderAttack(row, col, color) {
    const opponentColor = color === "white" ? "b" : "w";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece[0] === opponentColor) {
          const tempSelected = this.selectedPiece;
          this.selectedPiece = { row: r, col: c };
          const canAttack = this.isValidMove(row, col);
          this.selectedPiece = tempSelected;
          if (canAttack) return true;
        }
      }
    }
    return false;
  }

  isValidRookMove(fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  isValidKnightMove(fromRow, fromCol, toRow, toCol) {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  isValidBishopMove(fromRow, fromCol, toRow, toCol) {
    if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  isValidQueenMove(fromRow, fromCol, toRow, toCol) {
    if (
      fromRow === toRow ||
      fromCol === toCol ||
      Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol)
    ) {
      return this.isPathClear(fromRow, fromCol, toRow, toCol);
    }
    return false;
  }

  isValidKingMove(fromRow, fromCol, toRow, toCol) {
    return Math.abs(toRow - fromRow) <= 1 && Math.abs(toCol - fromCol) <= 1;
  }

  isPathClear(fromRow, fromCol, toRow, toCol) {
    const rowDir =
      fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
    const colDir =
      fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);

    let currentRow = fromRow + rowDir;
    let currentCol = fromCol + colDir;

    while (currentRow !== toRow || currentCol !== toCol) {
      if (this.board[currentRow][currentCol]) return false;
      currentRow += rowDir;
      currentCol += colDir;
    }

    return true;
  }

  showPossibleMoves(row, col) {
    // 清除之前的高亮
    this.highlightedSquares.forEach((coord) => {
      const square = document.querySelector(
        `[data-row="${coord.row}"][data-col="${coord.col}"]`
      );
      if (square) {
        square.classList.remove("possible-move");
      }
    });
    this.highlightedSquares.clear();

    // 显示新的可移动位置
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (this.isValidMove(i, j)) {
          const square = document.querySelector(
            `[data-row="${i}"][data-col="${j}"]`
          );
          if (square) {
            square.classList.add("possible-move");
            this.highlightedSquares.add({ row: i, col: j });
          }
        }
      }
    }
  }

  movePiece(toRow, toCol) {
    const fromRow = this.selectedPiece.row;
    const fromCol = this.selectedPiece.col;
    const movingPiece = this.board[fromRow][fromCol];

    // 检查是否是兵到达底线
    if (movingPiece[1] === "p" && (toRow === 0 || toRow === 7)) {
      this.pendingPromotion = {
        fromRow,
        fromCol,
        toRow,
        toCol,
        color: movingPiece[0],
      };
      this.showPromotionDialog();
      return;
    }

    this.executeMove(fromRow, fromCol, toRow, toCol);
  }

  showPromotionDialog() {
    const modal = document.getElementById("promotion-modal");
    const pieces = modal.querySelectorAll(".promotion-piece");
    const color = this.pendingPromotion.color === "w" ? "white" : "black";

    // 更新显示的棋子颜色
    pieces.forEach((piece) => {
      const pieceType = this.getPieceType(piece.dataset.piece);
      piece.textContent = PIECES[color][pieceType];
    });

    modal.classList.add("show");
  }

  completePawnPromotion(promotionPiece) {
    const { fromRow, fromCol, toRow, toCol, color } = this.pendingPromotion;
    const newPiece = color + promotionPiece; // 例如 'wq' 表示白后

    // 执行移动和升变
    this.executeMove(fromRow, fromCol, toRow, toCol, newPiece);

    // 隐藏对话框
    document.getElementById("promotion-modal").classList.remove("show");
    this.pendingPromotion = null;
  }

  executeMove(fromRow, fromCol, toRow, toCol, promotedPiece = null) {
    const movingPiece = promotedPiece || this.board[fromRow][fromCol];
    const capturedPiece = this.board[toRow][toCol];

    // 记录移动历史
    const moveInfo = {
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      piece: this.board[fromRow][fromCol],
      captured: capturedPiece,
      promotion: promotedPiece,
      enPassantTarget: this.enPassantTarget,
      enPassantCaptured: null,
      castling: null, // 记录王车易位信息
      castlingRights: JSON.parse(JSON.stringify(this.castlingRights)), // 保存当前易位权
    };

    // 执行移动
    this.board[toRow][toCol] = movingPiece;
    this.board[fromRow][fromCol] = "";

    // 处理王车易位
    if (movingPiece[1] === "k") {
      const color = movingPiece[0] === "w" ? "white" : "black";
      const row = color === "white" ? 7 : 0;

      // 短易位
      if (fromCol === 4 && toCol === 6) {
        this.board[row][5] = this.board[row][7]; // 移动车到新位置
        this.board[row][7] = ""; // 清除车的原位置
        moveInfo.castling = "kingside";
      }
      // 长易位
      else if (fromCol === 4 && toCol === 2) {
        this.board[row][3] = this.board[row][0]; // 移动车到新位置
        this.board[row][0] = ""; // 清除车的原位置
        moveInfo.castling = "queenside";
      }

      // 王移动后失去易位权
      this.castlingRights[color].kingSide = false;
      this.castlingRights[color].queenSide = false;
    }

    // 处理车的移动（影响易位权）
    if (movingPiece[1] === "r") {
      const color = movingPiece[0] === "w" ? "white" : "black";
      const row = color === "white" ? 7 : 0;
      if (fromRow === row) {
        if (fromCol === 0) this.castlingRights[color].queenSide = false;
        if (fromCol === 7) this.castlingRights[color].kingSide = false;
      }
    }

    // 处理过路兵
    if (movingPiece[1] === "p") {
      // 设置新的过路兵目标
      if (Math.abs(toRow - fromRow) === 2) {
        this.enPassantTarget = {
          row: (fromRow + toRow) / 2,
          col: fromCol,
        };
      } else if (
        this.enPassantTarget &&
        toRow === this.enPassantTarget.row &&
        toCol === this.enPassantTarget.col
      ) {
        // 执行吃过路兵
        const capturedPawnRow = fromRow;
        const capturedPawnCol = toCol;
        moveInfo.enPassantCaptured =
          this.board[capturedPawnRow][capturedPawnCol];
        this.board[capturedPawnRow][capturedPawnCol] = "";
        this.capturedPieces[
          this.currentPlayer === "white" ? "black" : "white"
        ].push(moveInfo.enPassantCaptured);
      } else {
        this.enPassantTarget = null;
      }
    } else {
      this.enPassantTarget = null;
    }

    // 更新被吃掉的棋子
    if (capturedPiece) {
      const capturedColor = capturedPiece[0] === "w" ? "white" : "black";
      this.capturedPieces[capturedColor].push(capturedPiece);
    }

    // 保存移动历史
    this.moveHistory.push(moveInfo);

    // 更新游戏状态
    this.initializeBoard();
    this.currentPlayer = this.currentPlayer === "white" ? "black" : "white";
    this.clearSelection();
    this.updateCapturedPieces();
    this.updateCheckStatus();
  }

  updateCapturedPieces() {
    ["white", "black"].forEach((color) => {
      const container = document.getElementById(`${color}-captured`);
      container.innerHTML = this.capturedPieces[color]
        .map((piece) => {
          const pieceType = this.getPieceType(piece[1]);
          return PIECES[color === "white" ? "black" : "white"][pieceType];
        })
        .join(" ");
    });
  }

  undoMove() {
    if (this.moveHistory.length === 0) return;

    const lastMove = this.moveHistory.pop();
    const {
      from,
      to,
      piece,
      captured,
      promotion,
      enPassantTarget,
      enPassantCaptured,
      castling,
      castlingRights,
    } = lastMove;

    // 恢复棋子位置
    this.board[from.row][from.col] = piece;
    this.board[to.row][to.col] = captured || "";

    // 恢复王车易位状态
    if (castling) {
      const row = from.row;
      if (castling === "kingside") {
        this.board[row][7] = this.board[row][5]; // 恢复车的位置
        this.board[row][5] = ""; // 清除车的临时位置
      } else if (castling === "queenside") {
        this.board[row][0] = this.board[row][3]; // 恢复车的位置
        this.board[row][3] = ""; // 清除车的临时位置
      }
    }

    // 恢复易位权
    this.castlingRights = castlingRights;

    // 恢复过路兵状态
    this.enPassantTarget = enPassantTarget;
    if (enPassantCaptured) {
      this.board[from.row][to.col] = enPassantCaptured;
      const capturedColor = enPassantCaptured[0] === "w" ? "white" : "black";
      this.capturedPieces[capturedColor].pop();
    }

    // 恢复被吃掉的棋子
    if (captured) {
      const capturedColor = captured[0] === "w" ? "white" : "black";
      this.capturedPieces[capturedColor].pop();
    }

    // 重置游戏状态
    this.currentPlayer = this.currentPlayer === "white" ? "black" : "white";
    this.isGameOver = false;
    this.clearSelection();
    this.initializeBoard();
    this.updateCapturedPieces();
    this.updateCheckStatus();
  }

  resetGame() {
    this.board = JSON.parse(JSON.stringify(INITIAL_BOARD));
    this.currentPlayer = "white";
    this.selectedPiece = null;
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
    this.isInCheck = false;
    this.isGameOver = false;
    this.highlightedSquares.clear();
    this.initializeBoard();
    this.updateCapturedPieces();
    document.getElementById("current-player").textContent = "白方回合";
    document.getElementById("current-player").style.color = "";
  }
}

// 初始化游戏
window.addEventListener("DOMContentLoaded", () => {
  new ChessGame();
});
