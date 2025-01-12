class Game {
  constructor() {
    this.sunCount = 50;
    this.board = [];
    this.zombies = [];
    this.selectedPlant = null;
    this.gameBoard = document.getElementById("game-board");
    this.sunCountDisplay = document.getElementById("sun-count");
    this.plants = {
      sunflower: { cost: 50, cooldown: 15000, damage: 0, health: 100 },
      peashooter: { cost: 100, cooldown: 1500, damage: 25, health: 100 },
      wallnut: { cost: 50, cooldown: 30000, damage: 0, health: 400 },
      icePeashooter: {
        cost: 150,
        cooldown: 1500,
        damage: 20,
        health: 100,
        slowEffect: true,
      },
      cherryBomb: {
        cost: 150,
        cooldown: 30000,
        damage: 100,
        health: 100,
        explosive: true,
      },
      doublePeashooter: {
        cost: 200,
        cooldown: 1500,
        damage: 25,
        health: 100,
        doubleShot: true,
      },
      jalapeno: {
        cost: 125,
        cooldown: 30000,
        damage: 100,
        health: 100,
        rowClear: true,
      },
    };

    this.init();
  }

  init() {
    this.createBoard();
    this.createPlantSelector();
    this.startZombieSpawner();
    this.startSunProduction();
    this.startPlantActions();
  }

  createBoard() {
    for (let row = 0; row < 5; row++) {
      this.board[row] = [];
      for (let col = 0; col < 9; col++) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";
        cell.dataset.row = row;
        cell.dataset.col = col;
        cell.addEventListener("click", () => this.handleCellClick(row, col));
        this.gameBoard.appendChild(cell);
        this.board[row][col] = null;
      }
    }
  }

  createPlantSelector() {
    const selector = document.querySelector(".plant-selector");
    Object.keys(this.plants).forEach((plantType) => {
      const option = document.createElement("div");
      option.className = "plant-option";
      option.dataset.plant = plantType;
      option.style.backgroundImage = `url('images/${plantType}.png')`;

      // 添加成本显示
      const cost = document.createElement("div");
      cost.className = "cost";
      cost.textContent = this.plants[plantType].cost;
      option.appendChild(cost);

      option.addEventListener("click", () =>
        this.selectPlant(plantType, option)
      );
      selector.appendChild(option);
    });

    // 添加点击空白处取消选择的功能
    document.addEventListener("click", (e) => {
      if (
        !e.target.closest(".plant-selector") &&
        !e.target.closest(".game-board")
      ) {
        this.selectedPlant = null;
        this.updatePlantSelection();
      }
    });
  }

  selectPlant(plantType, clickedOption) {
    if (this.selectedPlant === plantType) {
      // 如果点击已选中的植物，取消选择
      this.selectedPlant = null;
    } else if (this.sunCount >= this.plants[plantType].cost) {
      // 选择新的植物
      this.selectedPlant = plantType;
    }

    this.updatePlantSelection();
  }

  updatePlantSelection() {
    const allOptions = document.querySelectorAll(".plant-option");

    allOptions.forEach((option) => {
      const plantType = option.dataset.plant;
      option.classList.remove("selected", "insufficient");

      if (this.sunCount < this.plants[plantType].cost) {
        option.classList.add("insufficient");
      }

      if (plantType === this.selectedPlant) {
        option.classList.add("selected");
      }
    });
  }

  handleCellClick(row, col) {
    if (!this.selectedPlant || this.board[row][col]) return;

    const cost = this.plants[this.selectedPlant].cost;
    if (this.sunCount >= cost) {
      this.placePlant(row, col, this.selectedPlant);
      this.sunCount -= cost;
      this.updateSunCount();
      this.selectedPlant = null;
      this.updatePlantSelection();
    }
  }

  placePlant(row, col, plantType) {
    const cell = this.gameBoard.children[row * 9 + col];
    const plant = document.createElement("div");
    plant.className = "plant";
    plant.style.backgroundImage = `url('images/${plantType}.png')`;
    cell.appendChild(plant);

    const plantObj = {
      type: plantType,
      health: this.plants[plantType].health,
      element: plant,
      lastAction: 0,
    };
    this.board[row][col] = plantObj;

    // 立即触发一次性植物的效果
    if (this.plants[plantType].explosive) {
      setTimeout(() => {
        this.explode(row, col);
        plantObj.element.remove();
        this.board[row][col] = null;
      }, 1000);
    } else if (this.plants[plantType].rowClear) {
      setTimeout(() => {
        this.clearRow(row);
        plantObj.element.remove();
        this.board[row][col] = null;
      }, 1000);
    }
  }

  explode(row, col) {
    // 获取爆炸范围内的僵尸（3x3范围）
    const affectedZombies = this.zombies.filter((zombie) => {
      const zombieCol = Math.floor(zombie.position / 100);
      return (
        Math.abs(zombie.row - row) <= 1 && // 上下一行
        Math.abs(zombieCol - col) <= 1
      ); // 左右一格
    });

    // 移除受影响的僵尸
    affectedZombies.forEach((zombie) => {
      zombie.health = 0;
      zombie.element.remove();
    });
    this.zombies = this.zombies.filter((z) => !affectedZombies.includes(z));
  }

  clearRow(row) {
    // 获取同一行的所有僵尸
    const affectedZombies = this.zombies.filter((zombie) => zombie.row === row);

    // 移除该行的所有僵尸
    affectedZombies.forEach((zombie) => {
      zombie.health = 0;
      zombie.element.remove();
    });
    this.zombies = this.zombies.filter((z) => !affectedZombies.includes(z));
  }

  startPlantActions() {
    setInterval(() => {
      const now = Date.now();
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 9; col++) {
          const plant = this.board[row][col];
          if (!plant) continue;

          if (
            plant.type === "sunflower" &&
            now - plant.lastAction >= this.plants.sunflower.cooldown
          ) {
            this.spawnSunFromPlant(plant.element);
            plant.lastAction = now;
          } else if (
            (plant.type === "peashooter" ||
              plant.type === "icePeashooter" ||
              plant.type === "doublePeashooter") &&
            now - plant.lastAction >= this.plants[plant.type].cooldown
          ) {
            this.shootPea(row, col);
            plant.lastAction = now;
          }
        }
      }
    }, 100);
  }

  shootPea(row, col) {
    const plant = this.board[row][col];
    const zombiesInRow = this.zombies.filter((z) => z.row === row);
    if (zombiesInRow.length === 0) return;

    const pea = document.createElement("div");
    pea.className = plant.type === "icePeashooter" ? "pea ice-pea" : "pea";

    this.gameBoard.appendChild(pea);

    const startX = col * 100 + 60;
    const startY = row * 100 + 50 + 100;

    pea.style.left = startX + "px";
    pea.style.top = startY + "px";

    const nearestZombie = zombiesInRow.reduce((nearest, current) => {
      return !nearest || current.position < nearest.position
        ? current
        : nearest;
    }, null);

    if (nearestZombie) {
      requestAnimationFrame(() => {
        pea.style.transition = "left 0.3s linear";
        pea.style.left = nearestZombie.position + 30 + "px";
      });

      setTimeout(() => {
        pea.remove();
        if (this.zombies.includes(nearestZombie)) {
          nearestZombie.health -= this.plants[plant.type].damage;

          // 冰豌豆的减速效果
          if (plant.type === "icePeashooter" && nearestZombie.speed > 0.15) {
            nearestZombie.speed *= 0.5;
          }

          if (nearestZombie.health <= 0) {
            nearestZombie.element.remove();
            this.zombies = this.zombies.filter((z) => z !== nearestZombie);
          }
        }
      }, 300);

      // 双发射手的第二发
      if (plant.type === "doublePeashooter") {
        setTimeout(() => {
          this.shootPea(row, col);
        }, 150);
      }
    }
  }

  spawnSunFromPlant(plantElement) {
    const sun = document.createElement("div");
    sun.className = "sun";
    const rect = plantElement.getBoundingClientRect();
    const containerRect = this.gameBoard.getBoundingClientRect();
    sun.style.left = rect.left - containerRect.left + "px";
    sun.style.top = rect.top - containerRect.top + "px";
    this.gameBoard.appendChild(sun);

    sun.addEventListener("click", () => {
      this.sunCount += 25;
      this.updateSunCount();
      sun.remove();
    });

    setTimeout(() => sun.remove(), 5000);
  }

  spawnZombie() {
    const row = Math.floor(Math.random() * 5);
    const zombie = document.createElement("div");
    zombie.className = "zombie";
    zombie.style.backgroundImage = "url('images/zombie.png')";

    // 设置僵尸的起始位置在游戏板最右边外面一点
    const startPosition = 900;
    zombie.style.left = startPosition + "px";

    // 将僵尸添加到对应行的容器中
    const rowContainer = this.gameBoard.children[row * 9];
    rowContainer.appendChild(zombie);

    const zombieObj = {
      element: zombie,
      row: row,
      position: startPosition,
      health: 100,
      speed: 0.3,
    };

    this.zombies.push(zombieObj);
    this.moveZombie(zombieObj);
  }

  moveZombie(zombie) {
    const moveInterval = setInterval(() => {
      zombie.position -= zombie.speed;
      zombie.element.style.left = zombie.position + "px";

      // 计算僵尸当前所在的格子（每个格子宽度100px）
      const col = Math.floor(zombie.position / 100);

      // 检查是否碰到植物
      if (col >= 0 && col < 9 && this.board[zombie.row][col]) {
        const plant = this.board[zombie.row][col];
        clearInterval(moveInterval);
        this.zombieEatPlant(zombie, plant, col);
        return;
      }

      // 检查是否到达最左边或死亡
      if (zombie.position <= -60) {
        // 完全离开屏幕才算输
        clearInterval(moveInterval);
        zombie.element.remove();
        this.zombies = this.zombies.filter((z) => z !== zombie);
        alert("游戏结束！僵尸进入了你的房子！");
        this.resetGame();
      } else if (zombie.health <= 0) {
        clearInterval(moveInterval);
        zombie.element.remove();
        this.zombies = this.zombies.filter((z) => z !== zombie);
      }
    }, 20);
  }

  zombieEatPlant(zombie, plant, col) {
    const eatInterval = setInterval(() => {
      plant.health -= 1;

      // 如果植物死亡
      if (plant.health <= 0) {
        clearInterval(eatInterval);
        plant.element.remove();
        this.board[zombie.row][col] = null;
        // 继续移动，但要避免立即触发下一个植物的检测
        zombie.position = col * 100 - 10;
        this.moveZombie(zombie);
      }

      // 如果僵尸死亡
      if (zombie.health <= 0) {
        clearInterval(eatInterval);
        zombie.element.remove();
        this.zombies = this.zombies.filter((z) => z !== zombie);
      }
    }, 100);
  }

  startZombieSpawner() {
    // 第一波僵尸30秒后出现
    setTimeout(() => this.spawnZombie(), 30000);

    // 之后每15秒出现一个僵尸
    setInterval(() => this.spawnZombie(), 15000);
  }

  spawnSun() {
    const sun = document.createElement("div");
    sun.className = "sun";
    sun.style.left = Math.random() * 800 + 50 + "px";
    sun.style.top = "0px";
    document.querySelector(".game-container").appendChild(sun);

    sun.addEventListener("click", () => {
      this.sunCount += 25;
      this.updateSunCount();
      sun.remove();
    });

    setTimeout(() => sun.remove(), 10000);
  }

  startSunProduction() {
    setInterval(() => this.spawnSun(), 10000);
  }

  updateSunCount() {
    this.sunCountDisplay.textContent = this.sunCount;
    this.updatePlantSelection(); // 更新植物选择状态
  }

  resetGame() {
    // 清除所有植物和僵尸
    this.zombies.forEach((zombie) => zombie.element.remove());
    this.zombies = [];

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.board[row][col]) {
          this.board[row][col].element.remove();
          this.board[row][col] = null;
        }
      }
    }

    // 重置阳光数量
    this.sunCount = 50;
    this.updateSunCount();
  }
}

// 启动游戏
window.addEventListener("load", () => {
  new Game();
});
