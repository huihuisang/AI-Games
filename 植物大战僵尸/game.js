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
      smallMushroom: {
        cost: 75,
        cooldown: 2000,
        damage: 15,
        health: 80,
        nightOnly: true, // 夜间专用
      },
      bigMushroom: {
        cost: 150,
        cooldown: 1800,
        damage: 40,
        health: 120,
        splashDamage: true, // 溅射伤害
        nightOnly: true,
      },
      poisonMushroom: {
        cost: 125,
        cooldown: 2500,
        damage: 20,
        health: 100,
        poisonEffect: true, // 毒素效果
        nightOnly: true,
      },
      repeater: {
        cost: 200,
        cooldown: 1500,
        damage: 20,
        health: 100,
        doubleShot: true, // 连续发射两颗豌豆
      },
      gatlingPea: {
        cost: 450,
        cooldown: 1400,
        damage: 15,
        health: 100,
        multiShot: 4, // 连续发射4颗豌豆
      },
      pumpkin: {
        cost: 125,
        cooldown: 30000,
        damage: 0,
        health: 600,
        armor: true, // 可以套在其他植物上
      },
      spikeweed: {
        cost: 100,
        cooldown: 1000,
        damage: 10,
        health: 100,
        groundAttack: true, // 地刺攻击
      },
      torchwood: {
        cost: 175,
        cooldown: 0,
        damage: 0,
        health: 100,
        firePea: true, // 让经过的豌豆变成火豌豆
      },
      magnetShroom: {
        cost: 100,
        cooldown: 15000,
        damage: 0,
        health: 100,
        magnetic: true, // 可以吸走金属僵尸的装备
        nightOnly: true,
      },
    };

    this.zombieTypes = [
      {
        type: "normal",
        health: 100,
        speed: 0.3,
        damage: 1,
      },
      {
        type: "conehead",
        health: 200,
        speed: 0.25,
        damage: 1,
      },
      {
        type: "buckethead",
        health: 300,
        speed: 0.2,
        damage: 1.5,
      },
      {
        type: "newspaper",
        health: 150,
        speed: 0.2,
        damage: 1,
        enraged: true,
      },
      {
        type: "dancing",
        health: 180,
        speed: 0.35,
        damage: 1,
        summonBackup: true,
      },
      {
        type: "football",
        health: 400,
        speed: 0.4,
        damage: 2,
      },
      {
        type: "pole",
        health: 100,
        speed: 0.5,
        damage: 1,
        vaulting: true,
      },
    ];

    this.isNightTime = false;
    this.game = null;
    this.init();
  }

  init() {
    this.createBoard();
    this.createPlantSelector();
    this.startZombieSpawner();
    this.startSunProduction();
    this.startPlantActions();

    window.game = this;
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
      option.dataset.name = this.getPlantName(plantType);
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
    const plantInfo = this.plants[plantType];
    if (this.selectedPlant === plantType) {
      this.selectedPlant = null;
    } else if (
      this.sunCount >= plantInfo.cost &&
      (!plantInfo.nightOnly || (plantInfo.nightOnly && this.isNightTime))
    ) {
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
    // 随机选择僵尸类型
    const zombieType =
      this.zombieTypes[Math.floor(Math.random() * this.zombieTypes.length)];
    const zombie = document.createElement("div");
    zombie.className = `zombie zombie-${zombieType.type}`;

    const startPosition = 900;
    zombie.style.left = startPosition + "px";

    const rowContainer = this.gameBoard.children[row * 9];
    rowContainer.appendChild(zombie);

    const zombieObj = {
      element: zombie,
      row: row,
      position: startPosition,
      health: zombieType.health,
      speed: zombieType.speed,
      damage: zombieType.damage,
      type: zombieType.type,
    };

    this.zombies.push(zombieObj);
    this.moveZombie(zombieObj);
  }

  moveZombie(zombie) {
    const moveInterval = setInterval(() => {
      // 处理报纸僵尸的激怒状态
      if (
        zombie.type === "newspaper" &&
        zombie.health <= 75 &&
        !zombie.isEnraged
      ) {
        zombie.speed *= 1.5;
        zombie.isEnraged = true;
        zombie.element.classList.add("enraged");
      }

      // 处理撑杆僵尸的跳跃
      if (zombie.type === "pole" && zombie.vaulting) {
        const col = Math.floor(zombie.position / 100);
        if (col >= 0 && col < 9 && this.board[zombie.row][col]) {
          zombie.position -= 100; // 跳过一格
          zombie.vaulting = false;
          zombie.speed *= 0.7; // 跳跃后速度降低
        }
      }

      // 处理舞王僵尸召唤伴舞
      if (
        zombie.type === "dancing" &&
        zombie.summonBackup &&
        Math.random() < 0.01
      ) {
        this.summonBackupDancers(zombie.row);
        zombie.summonBackup = false;
      }

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
    this.sunProductionInterval = setInterval(() => this.spawnSun(), 10000);
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

  // 添加昼夜切换系统
  toggleDayNight() {
    this.isNightTime = !this.isNightTime;
    const gameContainer = document.querySelector(".game-container");

    if (this.isNightTime) {
      gameContainer.classList.add("night-time");
      // 减少阳光生产
      clearInterval(this.sunProductionInterval);
      this.sunProductionInterval = setInterval(() => this.spawnSun(), 15000);
    } else {
      gameContainer.classList.remove("night-time");
      // 恢复正常阳光生产
      clearInterval(this.sunProductionInterval);
      this.sunProductionInterval = setInterval(() => this.spawnSun(), 10000);
    }

    this.updatePlantSelection();
  }

  // 添加召唤伴舞僵尸的方法
  summonBackupDancers(row) {
    const adjacentRows = [row - 1, row + 1].filter((r) => r >= 0 && r < 5);
    adjacentRows.forEach((r) => {
      const backupZombie = {
        type: "normal",
        health: 75,
        speed: 0.35,
        damage: 0.8,
      };
      this.spawnSpecificZombie(backupZombie, r);
    });
  }

  // 添加生成特定僵尸的方法
  spawnSpecificZombie(zombieType, row) {
    const zombie = document.createElement("div");
    zombie.className = `zombie zombie-${zombieType.type}`;

    const startPosition = 900;
    zombie.style.left = startPosition + "px";

    const rowContainer = this.gameBoard.children[row * 9];
    rowContainer.appendChild(zombie);

    const zombieObj = {
      element: zombie,
      row: row,
      position: startPosition,
      health: zombieType.health,
      speed: zombieType.speed,
      damage: zombieType.damage,
      type: zombieType.type,
    };

    this.zombies.push(zombieObj);
    this.moveZombie(zombieObj);
  }

  // 添加获取植物名称的方法
  getPlantName(plantType) {
    const nameMap = {
      sunflower: "向日葵",
      peashooter: "豌豆射手",
      wallnut: "坚果墙",
      icePeashooter: "寒冰射手",
      cherryBomb: "樱桃炸弹",
      doublePeashooter: "双发射手",
      jalapeno: "火爆辣椒",
      smallMushroom: "小蘑菇",
      bigMushroom: "大蘑菇",
      poisonMushroom: "毒蘑菇",
      repeater: "复读射手",
      gatlingPea: "加特林",
      pumpkin: "南瓜头",
      spikeweed: "地刺",
      torchwood: "火炬树",
      magnetShroom: "磁力菇",
    };
    return nameMap[plantType] || plantType;
  }
}

// 启动游戏
window.addEventListener("load", () => {
  new Game();
});
