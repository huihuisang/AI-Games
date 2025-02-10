// 等待DOM加载完成
window.onload = function () {
  // 在文件开头添加调试函数
  function debug(message) {
    console.log(message);
    document.getElementById("debug").textContent = message;
  }

  // 获取画布和上下文
  const canvas = document.getElementById("gameCanvas");
  if (!canvas) {
    console.error("找不到画布元素！");
    return;
  }

  // 设置画布大小
  const maxWidth = Math.min(window.innerWidth - 100, 1200);
  const maxHeight = Math.min(window.innerHeight - 150, 600);

  // 保持2:1的比例
  if (maxWidth / 2 > maxHeight) {
    canvas.height = maxHeight;
    canvas.width = maxHeight * 2;
  } else {
    canvas.width = maxWidth;
    canvas.height = maxWidth / 2;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.error("无法获取画布上下文！");
    return;
  }

  // 鼠标位置
  let mouseX = canvas.width / 4;
  let mouseY = canvas.height / 2;

  // 游戏状态变量
  const gameState = {
    score: 0,
    remainingBalls: 15,
    status: "aiming", // aiming, shooting, or gameover
    isPulling: false,
    pullStartX: 0,
    pullStartY: 0,
    keyPower: 0, // 添加键盘控制的力度
  };

  // 球的物理属性
  const FRICTION = 0.985; // 摩擦系数
  const COLLISION_DAMPING = 0.8; // 碰撞能量损失
  const MIN_SPEED = 0.1; // 最小速度阈值

  class Ball {
    constructor(x, y, radius, color, number) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.color = color;
      this.number = number;
      this.velocity = { x: 0, y: 0 };
      this.spin = 0; // 旋转角度
      this.pocketed = false;
    }

    draw(ctx) {
      if (this.pocketed) return;

      // 绘制球体
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();

      // 添加光泽效果
      const gradient = ctx.createRadialGradient(
        this.x - this.radius / 3,
        this.y - this.radius / 3,
        this.radius / 10,
        this.x,
        this.y,
        this.radius
      );
      gradient.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.2)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fill();

      // 绘制数字
      if (this.number !== undefined && this.number !== 0) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius / 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();

        ctx.fillStyle = "black";
        ctx.font = `bold ${this.radius}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(this.number.toString(), this.x, this.y);
      }

      // 绘制阴影
      ctx.beginPath();
      ctx.arc(this.x + 2, this.y + 2, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fill();
    }

    update() {
      if (this.pocketed) return;

      // 更新位置
      this.x += this.velocity.x;
      this.y += this.velocity.y;

      // 应用摩擦力
      this.velocity.x *= FRICTION;
      this.velocity.y *= FRICTION;

      // 如果速度小于阈值，停止运动
      if (Math.abs(this.velocity.x) < MIN_SPEED) this.velocity.x = 0;
      if (Math.abs(this.velocity.y) < MIN_SPEED) this.velocity.y = 0;

      // 更新旋转
      this.spin *= FRICTION;

      // 边界碰撞检测
      this.handleBoundaryCollision();
    }

    handleBoundaryCollision() {
      const cushionElasticity = 0.6;

      if (this.x + this.radius > canvas.width - 30) {
        this.x = canvas.width - 30 - this.radius;
        this.velocity.x = -this.velocity.x * cushionElasticity;
        this.spin = -this.spin * 0.5;
      }
      if (this.x - this.radius < 30) {
        this.x = 30 + this.radius;
        this.velocity.x = -this.velocity.x * cushionElasticity;
        this.spin = -this.spin * 0.5;
      }
      if (this.y + this.radius > canvas.height - 30) {
        this.y = canvas.height - 30 - this.radius;
        this.velocity.y = -this.velocity.y * cushionElasticity;
        this.spin = -this.spin * 0.5;
      }
      if (this.y - this.radius < 30) {
        this.y = 30 + this.radius;
        this.velocity.y = -this.velocity.y * cushionElasticity;
        this.spin = -this.spin * 0.5;
      }
    }

    collideWith(otherBall) {
      if (this.pocketed || otherBall.pocketed) return;

      const dx = this.x - otherBall.x;
      const dy = this.y - otherBall.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.radius + otherBall.radius) {
        // 计算碰撞角度和法线
        const angle = Math.atan2(dy, dx);
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);

        // 计算碰撞后的速度
        const v1 = Math.sqrt(
          this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
        );
        const v2 = Math.sqrt(
          otherBall.velocity.x * otherBall.velocity.x +
            otherBall.velocity.y * otherBall.velocity.y
        );

        const direction1 = Math.atan2(this.velocity.y, this.velocity.x);
        const direction2 = Math.atan2(
          otherBall.velocity.y,
          otherBall.velocity.x
        );

        const newVx1 =
          v2 * Math.cos(direction2 - angle) * cos +
          v1 * Math.sin(direction1 - angle) * -sin;
        const newVy1 =
          v2 * Math.cos(direction2 - angle) * sin +
          v1 * Math.sin(direction1 - angle) * cos;
        const newVx2 =
          v1 * Math.cos(direction1 - angle) * cos +
          v2 * Math.sin(direction2 - angle) * -sin;
        const newVy2 =
          v1 * Math.cos(direction1 - angle) * sin +
          v2 * Math.sin(direction2 - angle) * cos;

        // 应用新速度
        this.velocity.x = newVx1 * COLLISION_DAMPING;
        this.velocity.y = newVy1 * COLLISION_DAMPING;
        otherBall.velocity.x = newVx2 * COLLISION_DAMPING;
        otherBall.velocity.y = newVy2 * COLLISION_DAMPING;

        // 计算自旋效果
        this.spin = (newVx1 - this.velocity.x) * 0.1;
        otherBall.spin = (newVx2 - otherBall.velocity.x) * 0.1;

        // 防止球重叠
        const overlap = (this.radius + otherBall.radius - distance) / 2;
        const pushX = overlap * Math.cos(angle);
        const pushY = overlap * Math.sin(angle);
        this.x += pushX;
        this.y += pushY;
        otherBall.x -= pushX;
        otherBall.y -= pushY;
      }
    }
  }

  // 在 Ball 类后添加 Pocket（球洞）类
  class Pocket {
    constructor(x, y, radius) {
      this.x = x;
      this.y = y;
      this.radius = radius;
    }

    draw(ctx) {
      // 绘制球袋阴影
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fill();

      // 绘制球袋
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#000000";
      ctx.fill();

      // 绘制球袋内部
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1a1a";
      ctx.fill();
    }

    checkBall(ball) {
      if (ball.pocketed) return false;

      const dx = this.x - ball.x;
      const dy = this.y - ball.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.radius) {
        ball.pocketed = true;
        if (ball.number > 0) {
          gameState.score += ball.number;
          gameState.remainingBalls--;
          document.getElementById("score").textContent = gameState.score;
          document.getElementById("remaining-balls").textContent =
            gameState.remainingBalls;
        }
        return true;
      }
      return false;
    }
  }

  // 在 Ball 类后添加 Cue（球杆）类
  class Cue {
    constructor() {
      this.length = 150;
      this.width = 4;
      this.power = 0;
      this.maxPower = 20;
      this.powerStep = 1; // 每次按键改变的力度值
    }

    draw(ctx, ballX, ballY, mouseX, mouseY) {
      if (gameState.status !== "aiming") return;

      // 计算角度
      const angle = Math.atan2(mouseY - ballY, mouseX - ballX);

      // 使用键盘控制的力度或鼠标拖动的力度
      const currentPower = gameState.isPulling
        ? this.power
        : gameState.keyPower;

      // 计算球杆位置
      const pullDistance = currentPower * 5;
      const startX = ballX - Math.cos(angle) * (20 + pullDistance);
      const startY = ballY - Math.sin(angle) * (20 + pullDistance);
      const endX = startX - Math.cos(angle) * this.length;
      const endY = startY - Math.sin(angle) * this.length;

      // 绘制瞄准线
      ctx.beginPath();
      ctx.moveTo(ballX, ballY);
      ctx.lineTo(ballX + Math.cos(angle) * 200, ballY + Math.sin(angle) * 200);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // 绘制球杆
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);

      // 创建球杆渐变
      const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
      gradient.addColorStop(0, "#8B4513");
      gradient.addColorStop(0.2, "#D2691E");
      gradient.addColorStop(0.8, "#8B4513");
      gradient.addColorStop(1, "#654321");

      ctx.lineWidth = this.width;
      ctx.strokeStyle = gradient;
      ctx.stroke();

      // 绘制球杆头部
      ctx.beginPath();
      ctx.arc(startX, startY, this.width / 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#F4A460";
      ctx.fill();

      // 更新力度条
      const powerFill = document.getElementById("power-fill");
      if (powerFill) {
        powerFill.style.width = `${(currentPower / this.maxPower) * 100}%`;
      }
    }
  }

  // 球的配置
  const ballsConfig = [
    { color: "yellow", number: 1 },
    { color: "blue", number: 2 },
    { color: "red", number: 3 },
    { color: "purple", number: 4 },
    { color: "orange", number: 5 },
    { color: "green", number: 6 },
    { color: "maroon", number: 7 },
    { color: "black", number: 8 },
    { color: "yellow", number: 9 },
    { color: "blue", number: 10 },
    { color: "red", number: 11 },
    { color: "purple", number: 12 },
    { color: "orange", number: 13 },
    { color: "green", number: 14 },
    { color: "maroon", number: 15 },
  ];

  // 创建所有球的数组
  const balls = [];
  const pockets = [];
  const pocketRadius = 25;

  // 创建白球（母球）
  const whiteBall = new Ball(
    canvas.width / 4,
    canvas.height / 2,
    12,
    "white",
    0
  );
  balls.push(whiteBall);

  // 创建六个球洞
  const pocketOffset = 35;
  pockets.push(new Pocket(pocketOffset, pocketOffset, pocketRadius)); // 左上
  pockets.push(
    new Pocket(pocketOffset, canvas.height - pocketOffset, pocketRadius)
  ); // 左下
  pockets.push(new Pocket(canvas.width / 2, pocketOffset, pocketRadius)); // 上中
  pockets.push(
    new Pocket(canvas.width / 2, canvas.height - pocketOffset, pocketRadius)
  ); // 下中
  pockets.push(
    new Pocket(canvas.width - pocketOffset, pocketOffset, pocketRadius)
  ); // 右上
  pockets.push(
    new Pocket(
      canvas.width - pocketOffset,
      canvas.height - pocketOffset,
      pocketRadius
    )
  ); // 右下

  // 修改球的排列方法
  function createTriangle() {
    const startX = canvas.width * 0.75;
    const startY = canvas.height / 2;
    const spacing = 25;
    const rows = 5;
    let ballIndex = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col <= row; col++) {
        if (ballIndex >= ballsConfig.length) break;

        const x = startX + row * spacing * Math.cos(Math.PI / 6);
        const y = startY + (col - row / 2) * spacing;

        balls.push(
          new Ball(
            x,
            y,
            12,
            ballsConfig[ballIndex].color,
            ballsConfig[ballIndex].number
          )
        );

        ballIndex++;
      }
    }
  }

  // 创建三角形排列的球
  createTriangle();

  // 创建球杆
  const cue = new Cue();

  // 添加键盘事件监听
  window.addEventListener("keydown", (e) => {
    if (gameState.status !== "aiming" || gameState.isPulling) return;

    switch (e.key) {
      case "ArrowUp":
        gameState.keyPower = Math.min(
          gameState.keyPower + cue.powerStep,
          cue.maxPower
        );
        break;
      case "ArrowDown":
        gameState.keyPower = Math.max(gameState.keyPower - cue.powerStep, 0);
        break;
      case " ": // 空格键击球
      case "Enter": // 添加Enter键击球
        if (
          gameState.status === "aiming" &&
          Math.abs(whiteBall.velocity.x) < MIN_SPEED &&
          Math.abs(whiteBall.velocity.y) < MIN_SPEED
        ) {
          const angle = Math.atan2(mouseY - whiteBall.y, mouseX - whiteBall.x);
          const power = gameState.keyPower * 2;
          whiteBall.velocity.x = Math.cos(angle) * power;
          whiteBall.velocity.y = Math.sin(angle) * power;
          gameState.status = "shooting";
          gameState.keyPower = 0;
        }
        break;
    }
  });

  // 修改鼠标按下事件，清除键盘力度
  canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // 只有在瞄准状态且白球静止时才能击球
    if (
      gameState.status === "aiming" &&
      Math.abs(whiteBall.velocity.x) < MIN_SPEED &&
      Math.abs(whiteBall.velocity.y) < MIN_SPEED
    ) {
      gameState.isPulling = true;
      gameState.pullStartX = mouseX;
      gameState.pullStartY = mouseY;
      gameState.keyPower = 0; // 清除键盘力度
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // 更新球杆力度
    if (gameState.isPulling && gameState.status === "aiming") {
      const dx = gameState.pullStartX - mouseX;
      const dy = gameState.pullStartY - mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      cue.power = Math.min(distance / 10, cue.maxPower);
    }
  });

  canvas.addEventListener("mouseup", (e) => {
    if (!gameState.isPulling || gameState.status !== "aiming") return;

    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;

    // 计算击球方向和力度
    const dx = gameState.pullStartX - mouseX;
    const dy = gameState.pullStartY - mouseY;
    const angle = Math.atan2(dy, dx);
    const power = cue.power * 2; // 增加力度倍数使击球更明显

    // 根据拉动方向设置球的速度
    whiteBall.velocity.x = Math.cos(angle) * power;
    whiteBall.velocity.y = Math.sin(angle) * power;

    // 更新游戏状态
    gameState.status = "shooting";
    gameState.isPulling = false;
    cue.power = 0;
  });

  // 修改游戏循环
  function gameLoop() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景
    ctx.fillStyle = "#076324";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制球洞
    pockets.forEach((pocket) => pocket.draw(ctx));

    // 更新和绘制所有球
    let allBallsStopped = true;

    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];

      if (!ball.pocketed) {
        ball.update();

        // 检查球是否在运动
        if (
          Math.abs(ball.velocity.x) > MIN_SPEED ||
          Math.abs(ball.velocity.y) > MIN_SPEED
        ) {
          allBallsStopped = false;
        }

        // 检查是否进袋
        for (const pocket of pockets) {
          if (pocket.checkBall(ball)) {
            if (ball !== whiteBall) {
              if (ball.number === 8) {
                gameState.status = "gameover";
                gameState.score += 50;
              }
              balls.splice(i, 1);
              break;
            } else {
              // 白球进袋处理
              whiteBall.x = canvas.width / 4;
              whiteBall.y = canvas.height / 2;
              whiteBall.velocity = { x: 0, y: 0 };
              whiteBall.pocketed = false;
              gameState.score = Math.max(0, gameState.score - 10);
            }
          }
        }

        // 绘制球
        ball.draw(ctx);

        // 检查碰撞
        for (let j = i - 1; j >= 0; j--) {
          if (!balls[j].pocketed) {
            ball.collideWith(balls[j]);
          }
        }
      }
    }

    // 如果所有球都停止，切换回瞄准状态
    if (allBallsStopped && gameState.status === "shooting") {
      gameState.status = "aiming";
    }

    // 在瞄准状态下绘制球杆
    if (gameState.status === "aiming" && !whiteBall.pocketed) {
      cue.draw(ctx, whiteBall.x, whiteBall.y, mouseX, mouseY);
    }

    // 处理游戏结束状态
    if (gameState.status === "gameover") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "white";
      ctx.font = "48px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("游戏结束!", canvas.width / 2, canvas.height / 2 - 30);
      ctx.fillText(
        `最终得分: ${gameState.score}`,
        canvas.width / 2,
        canvas.height / 2 + 30
      );
      return;
    }

    requestAnimationFrame(gameLoop);
  }

  // 启动游戏
  gameLoop();

  // 添加加载完成提示
  debug("游戏已启动！");
};
