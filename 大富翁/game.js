// 游戏主类
class MonopolyGame {
  constructor() {
    try {
      console.log("开始初始化游戏...");
      this.players = [];
      this.currentPlayerIndex = 0;
      this.gameStarted = false;
      this.board = null;
      this.dice = null;
      this.cardSystem = null;

      // 初始化游戏设置
      this.INITIAL_MONEY = 20000;
      this.SALARY = 2000; // 经过起点获得的工资

      // 绑定DOM元素
      this.bindElements();
      // 绑定事件
      this.bindEvents();
      console.log("游戏初始化完成");
    } catch (error) {
      console.error("游戏初始化失败:", error);
      alert("游戏初始化失败，请刷新页面重试");
    }
  }

  // 绑定DOM元素
  bindElements() {
    console.log("开始绑定DOM元素...");
    this.startScreen = document.getElementById("start-screen");
    if (!this.startScreen) throw new Error("找不到开始界面元素");

    this.gameScreen = document.getElementById("game-screen");
    if (!this.gameScreen) throw new Error("找不到游戏界面元素");

    this.playerCount = document.getElementById("player-count");
    if (!this.playerCount) throw new Error("找不到玩家数量选择元素");

    this.startButton = document.getElementById("start-game");
    if (!this.startButton) throw new Error("找不到开始游戏按钮");

    this.rollDiceButton = document.getElementById("roll-dice");
    if (!this.rollDiceButton) throw new Error("找不到骰子按钮");

    this.buyPropertyButton = document.getElementById("buy-property");
    if (!this.buyPropertyButton) throw new Error("找不到购买房产按钮");

    this.buildHouseButton = document.getElementById("build-house");
    if (!this.buildHouseButton) throw new Error("找不到建造房屋按钮");

    this.endTurnButton = document.getElementById("end-turn");
    if (!this.endTurnButton) throw new Error("找不到结束回合按钮");

    this.messageBox = document.getElementById("message-box");
    if (!this.messageBox) throw new Error("找不到消息框元素");

    this.playersInfo = document.getElementById("players-info");
    if (!this.playersInfo) throw new Error("找不到玩家信息元素");

    this.diceElement = document.getElementById("dice");
    if (!this.diceElement) throw new Error("找不到骰子元素");

    console.log("DOM元素绑定完成");
  }

  // 绑定事件监听器
  bindEvents() {
    console.log("开始绑定事件...");

    // 开始游戏按钮点击事件
    this.startButton.addEventListener("click", () => {
      console.log("点击开始游戏按钮");
      this.startGame();
    });

    // 投掷骰子按钮点击事件
    this.rollDiceButton.addEventListener("click", () => {
      console.log("点击投掷骰子按钮");
      if (!this.rollDiceButton.disabled) {
        this.rollDice();
      }
    });

    // 购买房产按钮点击事件
    this.buyPropertyButton.addEventListener("click", () => {
      console.log("点击购买房产按钮");
      if (!this.buyPropertyButton.disabled) {
        this.buyProperty();
      }
    });

    // 建造房屋按钮点击事件
    this.buildHouseButton.addEventListener("click", () => {
      console.log("点击建造房屋按钮");
      if (!this.buildHouseButton.disabled) {
        this.buildHouse();
      }
    });

    // 结束回合按钮点击事件
    this.endTurnButton.addEventListener("click", () => {
      console.log("点击结束回合按钮");
      if (!this.endTurnButton.disabled) {
        this.endTurn();
      }
    });

    console.log("事件绑定完成");
  }

  // 开始游戏
  startGame() {
    try {
      console.log("开始游戏初始化...");
      const playerCount = parseInt(this.playerCount.value);
      if (isNaN(playerCount) || playerCount < 1 || playerCount > 4) {
        this.showMessage("请选择有效的玩家数量（1-4人）");
        return;
      }

      // 初始化游戏组件
      console.log("初始化玩家...");
      this.initializePlayers(playerCount);

      console.log("初始化游戏棋盘...");
      this.board = new GameBoard();

      console.log("初始化卡牌系统...");
      this.cardSystem = new CardSystem();

      this.gameStarted = true;

      // 切换界面
      console.log("切换到游戏界面...");
      this.startScreen.style.display = "none";
      this.gameScreen.style.display = "block";
      this.gameScreen.classList.remove("hidden");

      // 初始化游戏状态
      this.currentPlayerIndex = 0;
      this.updateUI();
      this.showMessage("游戏开始！");

      // 如果第一个玩家是人类玩家，启用骰子按钮
      console.log("设置初始玩家...");
      if (!this.currentPlayer.isAI) {
        this.enableDiceRoll();
        this.showMessage(`${this.currentPlayer.name} 的回合，请投掷骰子`);
      } else {
        this.playAITurn();
      }

      // 初始绘制棋盘
      console.log("绘制游戏棋盘...");
      this.board.draw();
      this.board.drawPlayers(this.players);

      console.log("游戏初始化完成！");
    } catch (error) {
      console.error("游戏初始化错误:", error);
      this.showMessage("游戏初始化失败，请刷新页面重试");
    }
  }

  // 初始化玩家
  initializePlayers(count) {
    this.players = []; // 清空现有玩家
    const colors = ["#e74c3c", "#2ecc71", "#3498db", "#f1c40f"];
    const names = ["玩家1", "玩家2", "玩家3", "玩家4"];

    for (let i = 0; i < count; i++) {
      const isAI = i > 0; // 第一个玩家是人类，其他是AI
      const player = new Player({
        id: i,
        name: names[i],
        color: colors[i],
        money: this.INITIAL_MONEY,
        position: 0,
        isAI: isAI,
      });
      this.players.push(player);
    }
  }

  // 掷骰子
  rollDice() {
    const diceNumber = Math.floor(Math.random() * 6) + 1;
    this.diceElement.textContent = diceNumber;
    this.movePlayer(this.currentPlayer, diceNumber);
    this.rollDiceButton.disabled = true;
    this.showMessage(`${this.currentPlayer.name} 掷出了 ${diceNumber} 点`);
  }

  // 移动玩家
  movePlayer(player, steps) {
    const oldPosition = player.position;
    player.position = (player.position + steps) % this.board.tiles.length;

    // 检查是否经过起点
    if (player.position < oldPosition) {
      player.money += this.SALARY;
      this.showMessage(`${player.name} 经过起点，获得工资 ${this.SALARY}`);
    }

    this.board.drawPlayers(this.players);
    this.checkCurrentTile();
    this.updateUI();
  }

  // 检查当前格子
  checkCurrentTile() {
    const currentTile = this.board.tiles[this.currentPlayer.position];

    if (
      currentTile.type === "property" ||
      currentTile.type === "railroad" ||
      currentTile.type === "utility"
    ) {
      if (!currentTile.owner) {
        this.buyPropertyButton.disabled = false;
        this.endTurnButton.disabled = false;
      } else if (currentTile.owner !== this.currentPlayer) {
        this.payRent(currentTile);
      }
    } else if (currentTile.type === "chance") {
      this.drawChanceCard();
    } else if (currentTile.type === "fate") {
      this.drawFateCard();
    } else {
      // 其他类型的格子（如：起点、监狱等）
      this.endTurnButton.disabled = false;
    }
  }

  // 购买房产
  buyProperty() {
    const currentTile = this.board.tiles[this.currentPlayer.position];
    if (
      currentTile.type === "property" ||
      currentTile.type === "railroad" ||
      currentTile.type === "utility"
    ) {
      if (!currentTile.owner && this.currentPlayer.money >= currentTile.price) {
        this.currentPlayer.money -= currentTile.price;
        this.currentPlayer.addProperty(currentTile); // 使用Player类中的addProperty方法
        this.showMessage(
          `${this.currentPlayer.name} 购买了 ${currentTile.name}，支付 ${currentTile.price} 元`
        );
        this.buyPropertyButton.disabled = true;
        this.endTurnButton.disabled = false;
        this.updateUI();
        this.board.draw(); // 重新绘制棋盘以显示所有权变化
      } else if (this.currentPlayer.money < currentTile.price) {
        this.showMessage("资金不足，无法购买！");
      }
    }
  }

  // 建造房屋
  buildHouse() {
    const currentTile = this.board.tiles[this.currentPlayer.position];
    if (
      currentTile.type === "property" &&
      currentTile.owner === this.currentPlayer &&
      currentTile.houses < 3 &&
      this.currentPlayer.money >= currentTile.buildingCost
    ) {
      // 检查是否拥有同色系的所有地产
      if (!this.currentPlayer.hasMonopoly(currentTile.color)) {
        this.showMessage("需要拥有同色系的所有地产才能建造房屋！");
        return;
      }

      this.currentPlayer.money -= currentTile.buildingCost;
      currentTile.houses++;
      this.showMessage(
        `${this.currentPlayer.name} 在 ${currentTile.name} 建造了一座房屋，支付 ${currentTile.buildingCost} 元`
      );
      this.buildHouseButton.disabled = currentTile.houses >= 3;
      this.endTurnButton.disabled = false;
      this.updateUI();
      this.board.draw(); // 重新绘制棋盘以显示新房屋
    }
  }

  // 支付租金
  payRent(tile) {
    if (!tile.owner || tile.owner === this.currentPlayer) return;

    let rent = 0;
    if (tile.type === "property") {
      rent = tile.calculateRent();
    } else if (tile.type === "railroad") {
      // 铁路租金：基础租金 * 2^(拥有的铁路数量-1)
      const railroadCount = tile.owner.properties.filter(
        (p) => p.type === "railroad"
      ).length;
      rent = 500 * Math.pow(2, railroadCount - 1);
    } else if (tile.type === "utility") {
      // 公用事业租金：根据拥有的公用事业数量和骰子点数计算
      const utilityCount = tile.owner.properties.filter(
        (p) => p.type === "utility"
      ).length;
      const diceNumber = parseInt(this.diceElement.textContent);
      rent = utilityCount === 1 ? diceNumber * 100 : diceNumber * 200;
    }

    // 检查是否有免费通行卡
    const freePassIndex = this.currentPlayer.cards.indexOf("免费通行");
    if (freePassIndex !== -1) {
      this.currentPlayer.cards.splice(freePassIndex, 1);
      this.showMessage(`${this.currentPlayer.name} 使用免费通行卡，免除租金！`);
      this.endTurnButton.disabled = false;
      return;
    }

    if (this.currentPlayer.money >= rent) {
      this.currentPlayer.money -= rent;
      tile.owner.money += rent;
      this.showMessage(
        `${this.currentPlayer.name} 支付租金 ${rent} 元给 ${tile.owner.name}`
      );
      this.endTurnButton.disabled = false;
    } else {
      this.bankruptcy(tile.owner);
    }
    this.updateUI();
  }

  // 破产处理
  bankruptcy(creditor) {
    this.showMessage(`${this.currentPlayer.name} 破产了！`);

    // 将所有资产转移给债权人
    if (creditor) {
      // 转移所有房产
      [...this.currentPlayer.properties].forEach((property) => {
        this.currentPlayer.removeProperty(property);
        creditor.addProperty(property);
      });

      // 转移所有现金
      creditor.money += this.currentPlayer.money;
      this.currentPlayer.money = 0;

      this.showMessage(
        `${this.currentPlayer.name} 的所有资产已转移给 ${creditor.name}`
      );
    }

    // 从游戏中移除破产玩家
    const playerIndex = this.players.indexOf(this.currentPlayer);
    this.players.splice(playerIndex, 1);

    // 如果只剩一个玩家，游戏结束
    if (this.players.length === 1) {
      this.gameOver(this.players[0]);
    } else {
      // 调整当前玩家索引
      this.currentPlayerIndex = this.currentPlayerIndex % this.players.length;
      this.updateUI();
      this.enableDiceRoll();
    }
  }

  // 游戏结束
  gameOver(winner) {
    this.showMessage(`游戏结束！${winner.name} 获得胜利！`);
    this.gameStarted = false;

    // 显示最终资产统计
    this.showMessage(`最终资产统计：`);
    this.showMessage(`${winner.name}: ${winner.getTotalAssets()} 元`);

    // 禁用所有按钮
    this.rollDiceButton.disabled = true;
    this.buyPropertyButton.disabled = true;
    this.buildHouseButton.disabled = true;
    this.endTurnButton.disabled = true;

    // 添加重新开始按钮
    const restartButton = document.createElement("button");
    restartButton.textContent = "重新开始";
    restartButton.onclick = () => window.location.reload();
    this.messageBox.appendChild(restartButton);
  }

  // 结束回合
  endTurn() {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.players.length;
    this.updateUI();
    this.enableDiceRoll();

    if (this.currentPlayer.isAI) {
      this.playAITurn();
    }
  }

  // AI回合
  playAITurn() {
    // TODO: 实现AI逻辑
    setTimeout(() => {
      this.rollDice();
      // AI决策逻辑
      setTimeout(() => {
        this.endTurn();
      }, 1000);
    }, 1000);
  }

  // 启用骰子按钮
  enableDiceRoll() {
    this.rollDiceButton.disabled = false;
    this.endTurnButton.disabled = true;
  }

  // 显示消息
  showMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    this.messageBox.appendChild(messageElement);
    this.messageBox.scrollTop = this.messageBox.scrollHeight;
  }

  // 更新UI
  updateUI() {
    // 更新玩家信息
    this.playersInfo.innerHTML = this.players
      .map(
        (player) => `
      <div class="player-info" style="border-left: 4px solid ${
        player.color
      }; padding: 10px; margin: 5px 0;">
        <div>${player.name} ${
          player === this.currentPlayer ? "(当前回合)" : ""
        }</div>
        <div>资金: ￥${player.money}</div>
        <div>房产: ${player.properties.length} 处</div>
        <div>总资产: ￥${player.getTotalAssets()}</div>
        ${
          player.cards.length > 0
            ? `<div>持有卡片: ${player.cards.join(", ")}</div>`
            : ""
        }
      </div>
    `
      )
      .join("");

    // 更新按钮状态
    const currentTile = this.board.tiles[this.currentPlayer.position];
    this.buyPropertyButton.disabled =
      !currentTile ||
      currentTile.owner ||
      (currentTile.type !== "property" &&
        currentTile.type !== "railroad" &&
        currentTile.type !== "utility") ||
      this.currentPlayer.money < currentTile.price;

    this.buildHouseButton.disabled =
      !currentTile ||
      currentTile.type !== "property" ||
      currentTile.owner !== this.currentPlayer ||
      currentTile.houses >= 3 ||
      this.currentPlayer.money < currentTile.buildingCost ||
      !this.currentPlayer.hasMonopoly(currentTile.color);

    // 在掷骰子之前禁用结束回合按钮
    if (this.rollDiceButton.disabled === false) {
      this.endTurnButton.disabled = true;
    }
  }

  // 获取当前玩家
  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  // 抽取机会卡
  drawChanceCard() {
    if (!this.cardSystem) {
      console.error("卡牌系统未初始化");
      return;
    }
    const card = this.cardSystem.drawChanceCard();
    this.showMessage(
      `${this.currentPlayer.name} 抽到机会卡：${card.description}`
    );
    card.action(this.currentPlayer, this);
    this.endTurnButton.disabled = false;
  }

  // 抽取命运卡
  drawFateCard() {
    if (!this.cardSystem) {
      console.error("卡牌系统未初始化");
      return;
    }
    const card = this.cardSystem.drawFateCard();
    this.showMessage(
      `${this.currentPlayer.name} 抽到命运卡：${card.description}`
    );
    card.action(this.currentPlayer, this);
    this.endTurnButton.disabled = false;
  }
}
