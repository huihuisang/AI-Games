class Game {
  constructor() {
    this.score = 0;
    this.money = 100;
    this.towers = [];
    this.enemies = [];
    this.isGameRunning = false;
    this.isPaused = false;
    this.waveNumber = 0;
    this.enemySpawnInterval = null;
    this.countdownTimer = null;
    this.lives = 5;
    this.isGameOver = false;
    this.lastFrameTime = 0;

    this.towerTypes = {
      archer: {
        name: "弓箭手",
        icon: "🏹",
        cost: 50,
        damage: 20,
        range: 150,
        attackSpeed: 1000,
        projectileSpeed: 8,
        color: "#2ecc71",
        skillName: "快速射击",
        skillCooldown: 10000,
        skillEffect: (tower) => {
          tower.attackSpeed /= 2;
          setTimeout(() => {
            tower.attackSpeed *= 2;
          }, 5000);
        },
      },
      mage: {
        name: "法师",
        icon: "🔮",
        cost: 100,
        damage: 40,
        range: 200,
        attackSpeed: 1500,
        projectileSpeed: 6,
        color: "#3498db",
        skillName: "冰冻术",
        skillCooldown: 15000,
        skillEffect: () => {
          this.enemies.forEach((enemy) => {
            enemy.speed = 0.5;
            enemy.element.style.filter = "brightness(1.5) hue-rotate(180deg)";
            setTimeout(() => {
              enemy.speed = 1;
              enemy.element.style.filter = "";
            }, 3000);
          });
        },
      },
      cannon: {
        name: "炮塔",
        icon: "💣",
        cost: 150,
        damage: 80,
        range: 120,
        attackSpeed: 2000,
        projectileSpeed: 4,
        color: "#e74c3c",
        skillName: "轰炸",
        skillCooldown: 20000,
        skillEffect: (tower) => {
          const explosion = document.createElement("div");
          explosion.className = "explosion";
          explosion.style.left = `${
            tower.offsetLeft + tower.offsetWidth / 2
          }px`;
          explosion.style.top = `${tower.offsetTop + tower.offsetHeight / 2}px`;
          document.querySelector(".game-board").appendChild(explosion);

          this.enemies.forEach((enemy) => {
            const dx = enemy.x - tower.offsetLeft;
            const dy = enemy.y - tower.offsetTop;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 200) {
              enemy.health -= tower.damage * 2;
            }
          });

          setTimeout(() => explosion.remove(), 1000);
        },
      },
      tesla: {
        name: "电塔",
        icon: "⚡",
        cost: 200,
        damage: 60,
        range: 100,
        attackSpeed: 800,
        projectileSpeed: 12,
        color: "#9b59b6",
        skillName: "连锁闪电",
        skillCooldown: 12000,
        skillEffect: () => {
          let lastEnemy = null;
          this.enemies.slice(0, 5).forEach((enemy) => {
            enemy.health -= 100;
            if (lastEnemy) {
              const lightning = document.createElement("div");
              lightning.className = "lightning";
              lightning.style.left = `${lastEnemy.x}px`;
              lightning.style.top = `${lastEnemy.y}px`;
              lightning.style.width = `${Math.hypot(
                enemy.x - lastEnemy.x,
                enemy.y - lastEnemy.y
              )}px`;
              lightning.style.transform = `rotate(${Math.atan2(
                enemy.y - lastEnemy.y,
                enemy.x - lastEnemy.x
              )}rad)`;
              document.querySelector(".game-board").appendChild(lightning);
              setTimeout(() => lightning.remove(), 200);
            }
            lastEnemy = enemy;
          });
        },
      },
      poison: {
        name: "毒塔",
        icon: "☠️",
        cost: 175,
        damage: 30,
        range: 130,
        attackSpeed: 1200,
        projectileSpeed: 5,
        color: "#27ae60",
        skillName: "剧毒之云",
        skillCooldown: 18000,
        skillEffect: (tower) => {
          const cloud = document.createElement("div");
          cloud.className = "poison-cloud";
          cloud.style.left = `${tower.offsetLeft}px`;
          cloud.style.top = `${tower.offsetTop}px`;
          document.querySelector(".game-board").appendChild(cloud);

          const interval = setInterval(() => {
            this.enemies.forEach((enemy) => {
              const dx = enemy.x - tower.offsetLeft;
              const dy = enemy.y - tower.offsetTop;
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance < 150) {
                enemy.health -= 10;
                enemy.speed *= 0.95;
              }
            });
          }, 500);

          setTimeout(() => {
            clearInterval(interval);
            cloud.remove();
          }, 5000);
        },
      },
      ninja: {
        name: "忍者",
        icon: "🥷",
        cost: 225,
        damage: 100,
        range: 80,
        attackSpeed: 500,
        projectileSpeed: 15,
        color: "#34495e",
        skillName: "影分身",
        skillCooldown: 25000,
        skillEffect: (tower) => {
          const positions = [
            { x: -50, y: 0 },
            { x: 50, y: 0 },
            { x: 0, y: -50 },
            { x: 0, y: 50 },
          ];

          positions.forEach((pos) => {
            const shadow = document.createElement("div");
            shadow.className = "ninja-shadow";
            shadow.style.left = `${tower.offsetLeft + pos.x}px`;
            shadow.style.top = `${tower.offsetTop + pos.y}px`;
            document.querySelector(".game-board").appendChild(shadow);

            setTimeout(() => {
              this.enemies.forEach((enemy) => {
                const dx = enemy.x - (tower.offsetLeft + pos.x);
                const dy = enemy.y - (tower.offsetTop + pos.y);
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 100) {
                  enemy.health -= tower.damage;
                }
              });
              shadow.remove();
            }, 1000);
          });
        },
      },
    };

    this.selectedTowerType = "archer";
    this.initTowerSelection();
    this.loadSounds();

    // 修改网格布局
    this.gridRows = 7; // 增加到7行以获得更多空间
    this.gridCols = 10; // 增加到10列以获得更多空间
    this.towerZones = [
      // 路径上方的防御塔位置
      { row: 0, col: 1 },
      { row: 0, col: 3 },
      { row: 0, col: 5 },
      { row: 0, col: 7 },
      { row: 0, col: 9 },
      { row: 1, col: 1 },
      { row: 1, col: 3 },
      { row: 1, col: 5 },
      { row: 1, col: 7 },
      { row: 1, col: 9 },
      { row: 2, col: 1 },
      { row: 2, col: 3 },
      { row: 2, col: 5 },
      { row: 2, col: 7 },
      { row: 2, col: 9 },
      // 路径下方的防御塔位置
      { row: 4, col: 1 },
      { row: 4, col: 3 },
      { row: 4, col: 5 },
      { row: 4, col: 7 },
      { row: 4, col: 9 },
      { row: 5, col: 1 },
      { row: 5, col: 3 },
      { row: 5, col: 5 },
      { row: 5, col: 7 },
      { row: 5, col: 9 },
      { row: 6, col: 1 },
      { row: 6, col: 3 },
      { row: 6, col: 5 },
      { row: 6, col: 7 },
      { row: 6, col: 9 },
    ];

    // 添加怪物类型配置
    this.enemyTypes = {
      slime: {
        icon: "🟢",
        health: 50,
        speed: 2,
        reward: 10,
        damage: 1,
      },
      ghost: {
        icon: "👻",
        health: 80,
        speed: 2.5,
        reward: 15,
        damage: 1,
      },
      demon: {
        icon: "👿",
        health: 120,
        speed: 1.8,
        reward: 20,
        damage: 2,
      },
      dragon: {
        icon: "🐉",
        health: 200,
        speed: 1.5,
        reward: 30,
        damage: 3,
      },
      boss: {
        icon: "👹",
        health: 500,
        speed: 1,
        reward: 100,
        damage: 5,
      },
    };

    this.init();
  }

  init() {
    const towerSlots = document.querySelector(".tower-slots");
    towerSlots.style.gridTemplateColumns = `repeat(${this.gridCols}, 1fr)`;
    towerSlots.style.gridTemplateRows = `repeat(${this.gridRows}, 1fr)`;

    // 创建所有格子
    for (let row = 0; row < this.gridRows; row++) {
      for (let col = 0; col < this.gridCols; col++) {
        const cell = document.createElement("div");
        cell.className = "grid-cell";

        // 检查是否是可放置防御塔的位置
        if (
          this.towerZones.some((zone) => zone.row === row && zone.col === col)
        ) {
          const slot = document.createElement("div");
          slot.className = "tower-slot";
          slot.addEventListener("click", () => this.createTower(slot));
          cell.appendChild(slot);
        }

        towerSlots.appendChild(cell);
      }
    }

    // 绑定开始游戏按钮
    document.getElementById("start-game").addEventListener("click", () => {
      this.startGame();
    });
  }

  loadSounds() {
    this.sounds = {
      shoot: new Audio("sounds/shoot.mp3"),
      hit: new Audio("sounds/hit.mp3"),
      merge: new Audio("sounds/merge.mp3"),
      enemyDeath: new Audio("sounds/enemy-death.mp3"),
      wave: new Audio("sounds/wave.mp3"),
    };

    // 预加载音效
    Object.values(this.sounds).forEach((sound) => {
      sound.load();
      sound.volume = 0.3;
    });
  }

  createTower(slot) {
    // 检查格子是否已经有防御塔
    const existingTower = slot.querySelector(".tower");
    const towerType = this.towerTypes[this.selectedTowerType];

    if (existingTower) {
      // 如果已有防御塔，检查是否是相同类型和等级
      if (
        existingTower.dataset.type === this.selectedTowerType &&
        this.money >= towerType.cost
      ) {
        // 相同类型，直接升级现有的塔
        const currentLevel = parseInt(existingTower.dataset.level);
        existingTower.dataset.level = (currentLevel + 1).toString();

        // 提升塔的属性
        existingTower.attackSpeed *= 0.8; // 攻击速度提升
        existingTower.damage *= 1.5; // 伤害提升
        existingTower.range *= 1.2; // 范围提升

        // 更新范围指示器
        const rangeIndicator = existingTower.querySelector(".tower-range");
        if (rangeIndicator) {
          rangeIndicator.style.width = `${existingTower.range * 2}px`;
          rangeIndicator.style.height = `${existingTower.range * 2}px`;
        }

        // 扣除金币并播放音效
        this.money -= towerType.cost;
        this.sounds.merge.currentTime = 0;
        this.sounds.merge.play();

        // 更新分数和金币
        this.score += currentLevel * 10;
        this.money += currentLevel * 5;
        this.updateUI();
      }
      return;
    }

    // 如果格子为空且有足够金币，创建新防御塔
    if (this.money >= towerType.cost) {
      this.money -= towerType.cost;
      const tower = document.createElement("div");
      tower.className = "tower";
      tower.dataset.level = "1";
      tower.dataset.type = this.selectedTowerType;
      tower.style.backgroundColor = towerType.color;

      this.setupTower(tower, towerType);

      this.towers.push(tower);
      slot.appendChild(tower);
      this.updateUI();
    }
  }

  // 添加一个新方法来设置防御塔的属性
  setupTower(tower, towerType) {
    // 添加图标
    const icon = document.createElement("span");
    icon.className = "tower-icon";
    icon.textContent = towerType.icon;
    tower.appendChild(icon);

    // 添加攻击范围指示器
    const range = document.createElement("div");
    range.className = "tower-range";
    range.style.width = `${towerType.range * 2}px`;
    range.style.height = `${towerType.range * 2}px`;
    tower.appendChild(range);

    // 添加塔的属性
    tower.attackSpeed = towerType.attackSpeed;
    tower.damage = towerType.damage;
    tower.range = towerType.range;
    tower.lastShot = 0;

    // 添加技能按钮
    const skillButton = document.createElement("button");
    skillButton.className = "skill-button";
    skillButton.textContent = towerType.skillName;
    skillButton.addEventListener("click", () => this.useSkill(tower));
    tower.appendChild(skillButton);

    tower.lastSkillUse = 0;

    // 添加拖拽功能
    tower.draggable = true;
    tower.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", e.target.dataset.level);
      e.target.classList.add("dragging");
    });

    tower.addEventListener("dragend", (e) => {
      e.target.classList.remove("dragging");
    });
  }

  mergeTowers(tower1, tower2) {
    if (tower1.dataset.level === tower2.dataset.level) {
      const newLevel = parseInt(tower1.dataset.level) + 1;
      const towerType = this.towerTypes[tower1.dataset.type];

      // 创建新的防御塔
      const newTower = document.createElement("div");
      newTower.className = "tower";
      newTower.dataset.level = newLevel;
      newTower.dataset.type = tower1.dataset.type;
      newTower.style.backgroundColor = towerType.color;

      // 使用 setupTower 设置新塔的属性
      this.setupTower(newTower, towerType);

      // 提升新塔的属性
      newTower.attackSpeed *= 0.8; // 攻击速度提升
      newTower.damage *= 1.5; // 伤害提升
      newTower.range *= 1.2; // 范围提升

      // 更新范围指示器大小
      const rangeIndicator = newTower.querySelector(".tower-range");
      if (rangeIndicator) {
        rangeIndicator.style.width = `${newTower.range * 2}px`;
        rangeIndicator.style.height = `${newTower.range * 2}px`;
      }

      // 移除旧的防御塔
      const index1 = this.towers.indexOf(tower1);
      const index2 = this.towers.indexOf(tower2);
      if (index1 > -1) this.towers.splice(index1, 1);
      if (index2 > -1) this.towers.splice(index2, 1);
      tower1.remove();
      tower2.remove();

      // 添加新的防御塔
      this.towers.push(newTower);
      tower1.parentElement.appendChild(newTower);

      // 播放合成音效
      this.sounds.merge.currentTime = 0;
      this.sounds.merge.play();

      // 更新分数和金币
      this.score += newLevel * 10;
      this.money += newLevel * 5;
      this.updateUI();
    }
  }

  getTowerColor(level) {
    const colors = {
      1: "#ff4444",
      2: "#44ff44",
      3: "#4444ff",
      4: "#ffff44",
      5: "#ff44ff",
    };
    return colors[level] || "#ffffff";
  }

  startGame() {
    if (!this.isGameRunning && !this.isPaused) {
      const startButton = document.getElementById("start-game");
      startButton.disabled = true;
      startButton.textContent = "准备开始...";

      // 创建倒计时显示
      const countdown = document.createElement("div");
      countdown.className = "countdown";
      document.querySelector(".game-board").appendChild(countdown);

      let count = 3;
      countdown.textContent = count;

      this.countdownTimer = setInterval(() => {
        count--;
        countdown.textContent = count;

        if (count <= 0) {
          clearInterval(this.countdownTimer);
          countdown.remove();
          this.actuallyStartGame();
          startButton.textContent = "暂停游戏";
          startButton.disabled = false;
        }
      }, 1000);
    } else if (this.isGameRunning) {
      this.togglePause();
    }
  }

  actuallyStartGame() {
    this.isGameRunning = true;
    this.isPaused = false;
    this.lastFrameTime = 0;
    this.startWave();
    requestAnimationFrame((time) => this.gameLoop(time));

    // 播放开始音效
    const startSound = new Audio("sounds/game-start.mp3");
    startSound.volume = 0.3;
    startSound.play();
  }

  togglePause() {
    const startButton = document.getElementById("start-game");
    if (this.isPaused) {
      this.isPaused = false;
      this.isGameRunning = true;
      requestAnimationFrame((time) => this.gameLoop(time));
      startButton.textContent = "暂停游戏";
    } else {
      this.isPaused = true;
      this.isGameRunning = false;
      startButton.textContent = "继续游戏";
    }
  }

  startWave() {
    // 如果还有存活的怪物，等待它们被清除
    if (this.enemies.length > 0) {
      setTimeout(() => this.startWave(), 1000);
      return;
    }

    this.waveNumber++;

    // 显示波次提示
    const announcement = document.createElement("div");
    announcement.className = "wave-announcement";
    announcement.textContent = `第 ${this.waveNumber} 波来袭！`;
    document.querySelector(".game-board").appendChild(announcement);

    setTimeout(() => announcement.classList.add("show"), 100);
    setTimeout(() => {
      announcement.classList.remove("show");
      setTimeout(() => announcement.remove(), 300);
    }, 2000);

    let enemiesInWave = this.waveNumber * 5;
    let spawnDelay = 1500;

    // 播放波次音效
    this.sounds.wave.currentTime = 0;
    this.sounds.wave.play();

    // 清除之前的定时器
    if (this.enemySpawnInterval) {
      clearInterval(this.enemySpawnInterval);
    }

    let waveCheckInterval = null;

    // 生成敌人的定时器
    this.enemySpawnInterval = setInterval(() => {
      if (!this.isGameRunning || this.isPaused) return;

      if (enemiesInWave > 0) {
        this.spawnEnemy();
        enemiesInWave--;
      } else {
        clearInterval(this.enemySpawnInterval);

        // 开始检查波次是否结束
        if (!waveCheckInterval) {
          waveCheckInterval = setInterval(() => {
            if (this.enemies.length === 0) {
              clearInterval(waveCheckInterval);

              // 给予奖励
              this.money += this.waveNumber * 20;
              this.score += this.waveNumber * 50;
              this.updateUI();

              // 开始下一波
              if (this.isGameRunning && !this.isPaused) {
                setTimeout(() => this.startWave(), 3000);
              }
            }
          }, 1000);
        }
      }
    }, spawnDelay);
  }

  spawnEnemy() {
    const pathElement = document.querySelector(".path");
    const pathRect = pathElement.getBoundingClientRect();
    const boardRect = document
      .querySelector(".game-board")
      .getBoundingClientRect();
    const pathY = pathRect.top + pathRect.height / 2 - boardRect.top;

    // 根据波数选择怪物类型
    let enemyType;
    if (this.waveNumber % 10 === 0) {
      enemyType = this.enemyTypes.boss;
    } else if (this.waveNumber >= 8) {
      enemyType = this.randomChoice([
        this.enemyTypes.demon,
        this.enemyTypes.dragon,
        this.enemyTypes.ghost,
      ]);
    } else if (this.waveNumber >= 5) {
      enemyType = this.randomChoice([
        this.enemyTypes.ghost,
        this.enemyTypes.demon,
        this.enemyTypes.slime,
      ]);
    } else {
      enemyType = this.randomChoice([
        this.enemyTypes.slime,
        this.enemyTypes.ghost,
      ]);
    }

    // 根据波数增加怪物属性
    const healthMultiplier = 1 + (this.waveNumber - 1) * 0.5;
    const enemy = {
      x: -30,
      y: pathY,
      type: enemyType,
      health: enemyType.health * healthMultiplier,
      maxHealth: enemyType.health * healthMultiplier,
      speed: enemyType.speed,
      reward: enemyType.reward,
      damage: enemyType.damage,
      element: document.createElement("div"),
    };

    enemy.element.className = "enemy";

    // 添加怪物图标
    const icon = document.createElement("span");
    icon.className = "enemy-icon";
    icon.textContent = enemyType.icon;
    enemy.element.appendChild(icon);

    // 添加血条
    const healthBar = document.createElement("div");
    healthBar.className = "health-bar";
    const healthBarFill = document.createElement("div");
    healthBarFill.className = "health-bar-fill";
    healthBar.appendChild(healthBarFill);
    enemy.element.appendChild(healthBar);

    // 设置初始位置
    enemy.element.style.left = `${enemy.x}px`;
    enemy.element.style.top = `${enemy.y}px`;

    document.querySelector(".game-board").appendChild(enemy.element);
    this.enemies.push(enemy);
  }

  // 添加随机选择函数
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  getPathY() {
    return 280; // 返回新的固定路径高度
  }

  updateEnemies(deltaTime) {
    if (this.isGameOver) return;

    const gameBoard = document.querySelector(".game-board");
    const boardRect = gameBoard.getBoundingClientRect();
    const effectiveWidth = boardRect.width - 40;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      // 检查并移除已死亡的怪物
      if (
        enemy.isDead ||
        !enemy ||
        !enemy.element ||
        !enemy.element.parentNode
      ) {
        this.enemies.splice(i, 1);
        continue;
      }

      // 使用deltaTime计算新位置
      const newX = enemy.x + enemy.speed * 60 * deltaTime; // 60是基准帧率

      // 检查是否到达终点
      if (newX > effectiveWidth) {
        this.enemies.splice(i, 1);
        enemy.element.remove();
        this.lives--;
        this.money = Math.max(0, this.money - 10);
        this.updateUI();

        if (this.lives <= 0) {
          this.gameOver();
          return;
        }
        continue;
      }

      // 更新位置
      enemy.x = newX;
      enemy.element.style.left = `${enemy.x}px`;
      enemy.element.style.top = `${enemy.y}px`;

      // 更新血条
      const healthPercent = (enemy.health / enemy.maxHealth) * 100;
      const healthBar = enemy.element.querySelector(".health-bar-fill");
      if (healthBar) {
        healthBar.style.width = `${healthPercent}%`;
      }
    }
  }

  gameLoop(currentTime) {
    if (!this.lastFrameTime) {
      this.lastFrameTime = currentTime;
    }

    // 计算时间增量（单位：秒）
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    if (this.isGameRunning && !this.isPaused) {
      this.updateEnemies(deltaTime);
      this.updateTowers();
      this.updateUI();
      requestAnimationFrame((time) => this.gameLoop(time));
    }
  }

  updateTowers() {
    this.towers.forEach((tower) => {
      if (Date.now() - tower.lastShot > tower.attackSpeed) {
        const target = this.findNearestEnemy(tower);
        if (target) {
          this.shootAt(tower, target);
          tower.lastShot = Date.now();
        }
      }
    });
  }

  findNearestEnemy(tower) {
    // 实现寻找最近敌人的逻辑
    return this.enemies[0]; // 简单起见，先攻击第一个敌人
  }

  shootAt(tower, enemy) {
    const bullet = document.createElement("div");
    bullet.className = "bullet";

    const towerType = this.towerTypes[tower.dataset.type];
    bullet.style.backgroundColor = towerType.color;

    // 添加子弹特效
    if (tower.dataset.type === "archer") {
      bullet.classList.add("arrow");
    } else if (tower.dataset.type === "mage") {
      bullet.classList.add("magic");
    } else if (tower.dataset.type === "cannon") {
      bullet.classList.add("cannonball");
    }

    // 计算子弹起始位置
    const towerRect = tower.getBoundingClientRect();
    const boardRect = document
      .querySelector(".game-board")
      .getBoundingClientRect();
    const startX = towerRect.left - boardRect.left + towerRect.width / 2;
    const startY = towerRect.top - boardRect.top + towerRect.height / 2;

    bullet.style.left = `${startX}px`;
    bullet.style.top = `${startY}px`;

    document.querySelector(".game-board").appendChild(bullet);

    this.sounds.shoot.currentTime = 0;
    this.sounds.shoot.play();

    const animateBullet = () => {
      const bulletRect = bullet.getBoundingClientRect();
      const targetX = parseFloat(enemy.element.style.left);
      const targetY = parseFloat(enemy.element.style.top);

      const dx = targetX - parseFloat(bullet.style.left);
      const dy = targetY - parseFloat(bullet.style.top);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 5) {
        bullet.remove();
        this.hitEnemy(tower, enemy);
        return;
      }

      const speed = towerType.projectileSpeed;
      const vx = (dx / distance) * speed;
      const vy = (dy / distance) * speed;

      const currentX = parseFloat(bullet.style.left);
      const currentY = parseFloat(bullet.style.top);

      bullet.style.left = `${currentX + vx}px`;
      bullet.style.top = `${currentY + vy}px`;

      // 更新子弹旋转
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      bullet.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

      if (enemy.health > 0) {
        requestAnimationFrame(animateBullet);
      } else {
        bullet.remove();
      }
    };

    requestAnimationFrame(animateBullet);
  }

  hitEnemy(tower, enemy) {
    // 如果怪物已经不在数组中或已被移除，直接返回
    if (
      !this.enemies.includes(enemy) ||
      !enemy.element ||
      !enemy.element.parentNode
    ) {
      return;
    }

    // 播放击中音效
    this.sounds.hit.currentTime = 0;
    this.sounds.hit.play();

    // 创建击中特效
    const hit = document.createElement("div");
    hit.className = "hit-effect";
    hit.style.left = `${enemy.x}px`;
    hit.style.top = `${enemy.y}px`;
    document.querySelector(".game-board").appendChild(hit);

    // 移除击中特效
    setTimeout(() => hit.remove(), 300);

    // 计算伤害
    const damage = tower.damage;
    enemy.health -= damage;

    if (enemy.health <= 0) {
      // 标记怪物为已死亡，但不立即从数组中移除
      enemy.isDead = true;

      this.sounds.enemyDeath.currentTime = 0;
      this.sounds.enemyDeath.play();

      // 添加死亡动画效果
      enemy.element.classList.add("enemy-death");

      // 延迟移除元素，让动画有时间播放
      setTimeout(() => {
        if (enemy.element && enemy.element.parentNode) {
          enemy.element.remove();
        }
      }, 200);

      this.money += enemy.type.reward;
      this.score += enemy.type.reward * 2;
      this.updateUI();
    }
  }

  updateUI() {
    document.getElementById("score").textContent = this.score;
    document.getElementById("money").textContent = this.money;
    document.getElementById("lives").textContent = this.lives;

    // 更新塔选择面板的可用性
    const towerOptions = document.querySelectorAll(".tower-option");
    towerOptions.forEach((option) => {
      const towerType = this.towerTypes[option.dataset.type];
      if (this.money < towerType.cost) {
        option.classList.add("disabled");
      } else {
        option.classList.remove("disabled");
      }
    });
  }

  useSkill(tower) {
    const now = Date.now();
    const towerType = this.towerTypes[tower.dataset.type];
    if (now - tower.lastSkillUse >= towerType.skillCooldown) {
      towerType.skillEffect(tower);
      tower.lastSkillUse = now;
      const skillButton = tower.querySelector(".skill-button");
      skillButton.classList.add("cooldown");
      setTimeout(() => {
        skillButton.classList.remove("cooldown");
      }, towerType.skillCooldown);
    }
  }

  initTowerSelection() {
    const towerSelection = document.querySelector(".tower-selection");
    towerSelection.innerHTML = "";

    Object.entries(this.towerTypes).forEach(([type, tower]) => {
      const option = document.createElement("div");
      option.className = "tower-option";
      option.dataset.type = type;
      option.innerHTML = `
        <div class="tower-icon">${tower.icon}</div>
        <div class="tower-name">${tower.name}</div>
        <div class="skill-info">${tower.skillName}</div>
        <div class="cost">${tower.cost}金币</div>
      `;

      option.addEventListener("click", () => {
        if (this.money >= tower.cost) {
          this.selectedTowerType = type;
          document
            .querySelectorAll(".tower-option")
            .forEach((opt) => opt.classList.remove("selected"));
          option.classList.add("selected");
        }
      });

      towerSelection.appendChild(option);
    });
  }

  gameOver() {
    if (this.isGameOver) return;

    this.isGameOver = true;
    this.isGameRunning = false;
    clearInterval(this.enemySpawnInterval);

    // 清理所有现存的怪物
    this.enemies.forEach((enemy) => {
      if (enemy && enemy.element) {
        enemy.element.remove();
      }
    });
    this.enemies = [];

    // 创建游戏结束提示
    const gameOverScreen = document.createElement("div");
    gameOverScreen.className = "game-over";
    gameOverScreen.innerHTML = `
        <h2>游戏结束</h2>
        <p>最终得分: ${this.score}</p>
        <p>坚持了 ${this.waveNumber} 波</p>
        <button id="restart-game">重新开始</button>
    `;

    document.querySelector(".game-board").appendChild(gameOverScreen);

    // 添加重新开始按钮事件
    document.getElementById("restart-game").addEventListener("click", () => {
      location.reload(); // 简单的重新加载页面
    });
  }
}

// 启动游戏
window.onload = () => {
  const game = new Game();
};
