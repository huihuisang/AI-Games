// 大富翁游戏主类
class MonopolyGame {
  constructor() {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.gameStarted = false;
    this.board = null;
    this.cardSystem = null;
    this.awaitingAction = false;
    this.lastDiceTotal = 0;

    this.INITIAL_MONEY = 20000;
    this.SALARY = 2000;
    this.JAIL_FEE = 1000;

    this.bindElements();
    this.bindEvents();
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  // DOM binding
  bindElements() {
    this.startScreen = document.getElementById("start-screen");
    this.gameScreen = document.getElementById("game-screen");
    this.playerCountSelect = document.getElementById("player-count");
    this.startButton = document.getElementById("start-game");
    this.rollDiceBtn = document.getElementById("roll-dice");
    this.buyBtn = document.getElementById("buy-property");
    this.buildBtn = document.getElementById("build-house");
    this.endTurnBtn = document.getElementById("end-turn");
    this.messageBox = document.getElementById("message-box");
    this.playersInfo = document.getElementById("players-info");
    this.dice1El = document.getElementById("dice1");
    this.dice2El = document.getElementById("dice2");
    this.cardModal = document.getElementById("card-modal");
    this.cardIcon = document.getElementById("card-icon");
    this.cardTitle = document.getElementById("card-title");
    this.cardDesc = document.getElementById("card-description");
    this.cardOkBtn = document.getElementById("card-ok");
  }

  bindEvents() {
    this.startButton.addEventListener("click", () => this.startGame());
    this.rollDiceBtn.addEventListener("click", () => this.rollDice());
    this.buyBtn.addEventListener("click", () => this.buyProperty());
    this.buildBtn.addEventListener("click", () => this.buildHouse());
    this.endTurnBtn.addEventListener("click", () => this.endTurn());
    this.cardOkBtn.addEventListener("click", () => this.closeCardModal());
  }

  // Start game
  startGame() {
    const count = parseInt(this.playerCountSelect.value);
    const colors = ["#e53935", "#43a047", "#1e88e5", "#fdd835"];
    const names = ["玩家1", "电脑2", "电脑3", "电脑4"];

    this.players = [];
    for (let i = 0; i < count; i++) {
      this.players.push(
        new Player({
          id: i,
          name: names[i],
          color: colors[i],
          money: this.INITIAL_MONEY,
          isAI: i > 0,
        })
      );
    }

    this.board = new GameBoard();
    this.cardSystem = new CardSystem();
    this.currentPlayerIndex = 0;
    this.gameStarted = true;

    this.startScreen.classList.add("hidden");
    this.gameScreen.classList.remove("hidden");

    this.messageBox.innerHTML = "";
    this.log("游戏开始！祝你好运！");
    this.log(`${this.currentPlayer.name} 的回合，请投掷骰子`);

    this.updateUI();
    this.board.draw(this.players);
    this.enableRoll();
  }

  // Logging
  log(msg) {
    const div = document.createElement("div");
    div.textContent = msg;
    this.messageBox.appendChild(div);
    this.messageBox.scrollTop = this.messageBox.scrollHeight;
  }

  // Dice
  rollDice() {
    if (!this.gameStarted) return;
    this.disableAllButtons();

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    this.lastDiceTotal = d1 + d2;
    const isDoubles = d1 === d2;

    // Animate dice
    this.dice1El.classList.add("rolling");
    this.dice2El.classList.add("rolling");

    let rolls = 0;
    const anim = setInterval(() => {
      this.dice1El.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
      this.dice2El.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
      rolls++;
      if (rolls > 8) {
        clearInterval(anim);
        this.dice1El.classList.remove("rolling");
        this.dice2El.classList.remove("rolling");
        this.dice1El.textContent = DICE_FACES[d1 - 1];
        this.dice2El.textContent = DICE_FACES[d2 - 1];
        this.afterDiceRoll(d1, d2, isDoubles);
      }
    }, 80);
  }

  afterDiceRoll(d1, d2, isDoubles) {
    const player = this.currentPlayer;
    const total = d1 + d2;
    this.log(`${player.name} 掷出 ${d1} + ${d2} = ${total}`);

    // Handle jail
    if (player.inJail) {
      if (isDoubles) {
        player.releaseFromJail();
        this.log(`${player.name} 掷出双数，出狱了！`);
        this.movePlayerBy(player, total);
      } else {
        player.jailTurns++;
        if (player.jailTurns >= 3) {
          // Must pay to get out
          const jailCard = player.cards.indexOf("免费出狱");
          if (jailCard !== -1) {
            player.cards.splice(jailCard, 1);
            this.log(`${player.name} 使用免费出狱卡！`);
          } else {
            player.money -= this.JAIL_FEE;
            this.log(`${player.name} 支付 ¥${this.JAIL_FEE} 出狱`);
          }
          player.releaseFromJail();
          this.movePlayerBy(player, total);
        } else {
          this.log(`${player.name} 在监狱中（第${player.jailTurns}/3回合）`);
          this.enableEndTurn();
        }
      }
      return;
    }

    // Normal move
    this.movePlayerBy(player, total);
  }

  movePlayerBy(player, steps) {
    const oldPos = player.position;
    const newPos = (player.position + steps) % TOTAL_TILES;

    // Check if passed GO
    if (newPos < oldPos && newPos !== 0) {
      player.money += this.SALARY;
      this.log(`${player.name} 经过起点，领取工资 ¥${this.SALARY}`);
    }

    player.position = newPos;
    this.board.draw(this.players);
    this.landOnTile(player);
  }

  // Land on a tile
  landOnTile(player) {
    const tile = this.board.tiles[player.position];
    this.log(`${player.name} 到达「${tile.name}」`);

    switch (tile.type) {
      case "corner":
        this.handleCorner(player, tile);
        break;
      case "property":
      case "railroad":
      case "utility":
        this.handleProperty(player, tile);
        break;
      case "chance":
        this.handleCard(player, "chance");
        return; // card modal handles flow
      case "fate":
        this.handleCard(player, "fate");
        return;
      case "tax":
        player.money -= tile.taxAmount;
        this.log(`${player.name} 缴纳${tile.name} ¥${tile.taxAmount}`);
        this.checkBankruptcy(player);
        this.enableEndTurn();
        break;
      default:
        this.enableEndTurn();
    }
    this.updateUI();
  }

  handleCorner(player, tile) {
    if (tile.name === "起点") {
      player.money += this.SALARY;
      this.log(`${player.name} 停在起点，额外获得 ¥${this.SALARY}`);
    } else if (tile.name === "去监狱") {
      player.goToJail();
      this.log(`${player.name} 被送进监狱！`);
      this.board.draw(this.players);
    } else if (tile.name === "监狱") {
      this.log(`${player.name} 只是路过监狱探望`);
    } else {
      this.log(`${player.name} 在免费停车休息`);
    }
    this.enableEndTurn();
  }

  handleProperty(player, tile) {
    if (!tile.owner) {
      // Unowned - can buy
      if (player.money >= tile.price) {
        this.awaitingAction = true;
        if (player.isAI) {
          if (player.shouldBuy(tile)) {
            this.buyProperty();
          } else {
            this.enableEndTurn();
          }
        } else {
          this.buyBtn.disabled = false;
          this.endTurnBtn.disabled = false;
          this.log(`「${tile.name}」无人拥有，售价 ¥${tile.price}，是否购买？`);
        }
      } else {
        this.log(`资金不足，无法购买「${tile.name}」`);
        this.enableEndTurn();
      }
    } else if (tile.owner === player) {
      // Own property - maybe build
      if (
        tile.type === "property" &&
        tile.houses < 5 &&
        player.hasMonopoly(tile.colorGroup) &&
        player.money >= tile.buildCost
      ) {
        if (player.isAI) {
          if (player.shouldBuild(tile)) {
            this.buildHouse();
          } else {
            this.enableEndTurn();
          }
        } else {
          this.buildBtn.disabled = false;
          this.endTurnBtn.disabled = false;
          this.log(`你拥有「${tile.name}」，可以建造房屋（¥${tile.buildCost}）`);
        }
      } else {
        this.enableEndTurn();
      }
    } else {
      // Pay rent
      this.payRent(player, tile);
    }
  }

  payRent(player, tile) {
    // Check free pass card
    const freeIdx = player.cards.indexOf("免费通行");
    if (freeIdx !== -1) {
      player.cards.splice(freeIdx, 1);
      this.log(`${player.name} 使用免费通行卡，免除租金！`);
      this.enableEndTurn();
      return;
    }

    const rent = tile.getRent();
    if (rent <= 0) {
      this.enableEndTurn();
      return;
    }

    player.money -= rent;
    tile.owner.money += rent;
    this.log(
      `${player.name} 支付租金 ¥${rent} 给 ${tile.owner.name}`
    );

    if (player.money < 0) {
      this.handleBankruptcy(player, tile.owner);
    } else {
      this.enableEndTurn();
    }
    this.updateUI();
  }

  // Cards
  handleCard(player, type) {
    const card =
      type === "chance"
        ? this.cardSystem.drawChance()
        : this.cardSystem.drawFate();

    // Show modal
    this.cardIcon.textContent = card.icon;
    this.cardTitle.textContent = card.name;
    this.cardDesc.textContent = card.desc;
    this.cardModal.classList.remove("hidden");

    this._pendingCard = card;
    this._pendingCardPlayer = player;

    if (player.isAI) {
      setTimeout(() => this.closeCardModal(), 1200);
    }
  }

  closeCardModal() {
    this.cardModal.classList.add("hidden");
    const card = this._pendingCard;
    const player = this._pendingCardPlayer;
    if (card && player) {
      card.action(player, this);
      this._pendingCard = null;
      this._pendingCardPlayer = null;

      if (player.money < 0) {
        this.handleBankruptcy(player, null);
      }

      this.board.draw(this.players);
      this.updateUI();
      this.enableEndTurn();
    }
  }

  // Buy property
  buyProperty() {
    const player = this.currentPlayer;
    const tile = this.board.tiles[player.position];

    if (tile.owner || player.money < tile.price) return;

    player.money -= tile.price;
    player.addProperty(tile);
    this.log(
      `${player.name} 购买了「${tile.name}」，花费 ¥${tile.price}`
    );

    this.buyBtn.disabled = true;
    this.board.draw(this.players);
    this.updateUI();
    this.enableEndTurn();
  }

  // Build house
  buildHouse() {
    const player = this.currentPlayer;
    const tile = this.board.tiles[player.position];

    if (
      tile.type !== "property" ||
      tile.owner !== player ||
      tile.houses >= 5 ||
      !player.hasMonopoly(tile.colorGroup) ||
      player.money < tile.buildCost
    ) {
      return;
    }

    player.money -= tile.buildCost;
    tile.houses++;
    const label = tile.houses >= 5 ? "酒店" : `${tile.houses}座房屋`;
    this.log(
      `${player.name} 在「${tile.name}」建造了房屋（${label}），花费 ¥${tile.buildCost}`
    );

    this.buildBtn.disabled = true;
    this.board.draw(this.players);
    this.updateUI();
    this.enableEndTurn();
  }

  // Bankruptcy
  handleBankruptcy(player, creditor) {
    player.bankrupt = true;
    this.log(`💀 ${player.name} 破产了！`);

    if (creditor) {
      player.properties.forEach((prop) => {
        prop.owner = creditor;
        creditor.properties.push(prop);
      });
      creditor.money += Math.max(0, player.money);
      this.log(`${player.name} 的资产转移给 ${creditor.name}`);
    }

    player.properties = [];
    player.money = 0;

    // Check win condition
    const alive = this.players.filter((p) => !p.bankrupt);
    if (alive.length === 1) {
      this.gameOver(alive[0]);
      return;
    }

    this.updateUI();
    this.board.draw(this.players);
  }

  checkBankruptcy(player) {
    if (player.money < 0) {
      this.handleBankruptcy(player, null);
    }
  }

  // Game over
  gameOver(winner) {
    this.gameStarted = false;
    this.log(`🏆 游戏结束！${winner.name} 获得胜利！`);
    this.log(`最终资产: ¥${winner.getTotalAssets()}`);

    this.disableAllButtons();

    const btn = document.createElement("button");
    btn.textContent = "重新开始";
    btn.style.marginTop = "10px";
    btn.onclick = () => window.location.reload();
    this.messageBox.appendChild(btn);
  }

  // End turn
  endTurn() {
    if (!this.gameStarted) return;
    this.disableAllButtons();

    // Find next non-bankrupt player
    let next = (this.currentPlayerIndex + 1) % this.players.length;
    let safety = 0;
    while (this.players[next].bankrupt && safety < this.players.length) {
      next = (next + 1) % this.players.length;
      safety++;
    }
    this.currentPlayerIndex = next;

    const player = this.currentPlayer;
    this.log(`--- ${player.name} 的回合 ---`);
    this.updateUI();

    if (player.isAI) {
      setTimeout(() => this.playAITurn(), 800);
    } else {
      if (player.inJail) {
        this.log(`你在监狱中（第${player.jailTurns}/3回合），投掷双数可出狱`);
      }
      this.enableRoll();
    }
  }

  // AI turn
  playAITurn() {
    if (!this.gameStarted) return;
    this.rollDice();
  }

  // Button helpers
  enableRoll() {
    this.rollDiceBtn.disabled = false;
    this.buyBtn.disabled = true;
    this.buildBtn.disabled = true;
    this.endTurnBtn.disabled = true;
  }

  enableEndTurn() {
    this.rollDiceBtn.disabled = true;
    this.endTurnBtn.disabled = false;

    // AI auto-ends turn
    if (this.currentPlayer.isAI) {
      setTimeout(() => {
        if (this.gameStarted && !this.endTurnBtn.disabled) {
          this.endTurn();
        }
      }, 600);
    }
  }

  disableAllButtons() {
    this.rollDiceBtn.disabled = true;
    this.buyBtn.disabled = true;
    this.buildBtn.disabled = true;
    this.endTurnBtn.disabled = true;
  }

  // Update UI
  updateUI() {
    if (!this.board) return;

    this.playersInfo.innerHTML = this.players
      .filter((p) => !p.bankrupt)
      .map((p) => {
        const isCurrent = p === this.currentPlayer;
        const propCount = p.properties.length;
        const houses = p.properties.reduce((s, t) => s + t.houses, 0);
        return `
          <div class="player-info ${isCurrent ? "active" : ""}"
               style="border-left-color: ${p.color}">
            <div class="player-name">
              ${p.isAI ? "🤖" : "👤"} ${p.name}
              ${isCurrent ? " ◀" : ""}
              ${p.inJail ? " 🔒" : ""}
            </div>
            <div class="player-money">¥${p.money.toLocaleString()}</div>
            <div class="player-detail">
              地产 ${propCount} | 房屋 ${houses} | 总资产 ¥${p.getTotalAssets().toLocaleString()}
            </div>
            ${p.cards.length > 0 ? `<div class="player-detail">卡片: ${p.cards.join(", ")}</div>` : ""}
          </div>
        `;
      })
      .join("");
  }
}
