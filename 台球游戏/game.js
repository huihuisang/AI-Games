// 在文件开头添加调试函数
function debug(message) {
  console.log(message);
  document.getElementById("debug").textContent = message;
}

// 在文件最开始添加（在 debug 函数之前）
let mouseX = 0;
let mouseY = 0;

class Ball {
  constructor(x, y, radius, color, number) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.number = number;
    this.velocity = { x: 0, y: 0 };
    this.friction = 0.99; // 摩擦力
  }

  draw(ctx) {
    if (!ctx) {
      debug("绘制时上下文无效！");
      return;
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();

    if (this.number !== undefined && this.number !== 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius / 2, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();
      ctx.closePath();

      ctx.fillStyle = "black";
      ctx.font = `${this.radius}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.number.toString(), this.x, this.y);
    }
  }

  update() {
    // 更新球的位置
    this.x += this.velocity.x;
    this.y += this.velocity.y;

    // 应用摩擦力
    this.velocity.x *= this.friction;
    this.velocity.y *= this.friction;

    // 碰撞检测 - 边界
    if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
      this.velocity.x = -this.velocity.x;
    }
    if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
      this.velocity.y = -this.velocity.y;
    }
  }

  // 添加碰撞检测方法
  collideWith(otherBall) {
    const dx = this.x - otherBall.x;
    const dy = this.y - otherBall.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.radius + otherBall.radius) {
      // 计算碰撞角度
      const angle = Math.atan2(dy, dx);
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);

      // 旋转速度向量
      const rotateVelocities = (velocity, sin, cos) => {
        return {
          x: velocity.x * cos + velocity.y * sin,
          y: velocity.y * cos - velocity.x * sin,
        };
      };

      // 旋转回原来的角度
      const rotateBack = (velocity, sin, cos) => {
        return {
          x: velocity.x * cos - velocity.y * sin,
          y: velocity.y * cos + velocity.x * sin,
        };
      };

      // 旋转球的位置和速度
      const rotatedVelocities = {
        this: rotateVelocities(this.velocity, sin, cos),
        other: rotateVelocities(otherBall.velocity, sin, cos),
      };

      // 碰撞后的速度（完全弹性碰撞）
      const finalVelocities = {
        this: { x: rotatedVelocities.other.x, y: rotatedVelocities.this.y },
        other: { x: rotatedVelocities.this.x, y: rotatedVelocities.other.y },
      };

      // 旋转回原来的角度
      this.velocity = rotateBack(finalVelocities.this, sin, cos);
      otherBall.velocity = rotateBack(finalVelocities.other, sin, cos);

      // 防止球重叠
      const overlap = (this.radius + otherBall.radius - distance) / 2;
      const pushX = overlap * Math.cos(angle);
      const pushY = overlap * Math.sin(angle);

      this.x += pushX;
      this.y += pushY;
      otherBall.x -= pushX;
      otherBall.y -= pushY;

      // 增加一些能量损失
      this.velocity.x *= 0.95;
      this.velocity.y *= 0.95;
      otherBall.velocity.x *= 0.95;
      otherBall.velocity.y *= 0.95;
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
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.closePath();
  }

  checkBall(ball) {
    const dx = this.x - ball.x;
    const dy = this.y - ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.radius;
  }
}

// 在 Ball 类后添加 Cue（球杆）类
class Cue {
  constructor() {
    this.length = 150; // 球杆长度
    this.width = 4; // 球杆宽度
    this.color = "#8B4513"; // 球杆颜色
  }

  draw(ctx, ballX, ballY, mouseX, mouseY) {
    const angle = Math.atan2(mouseY - ballY, mouseX - ballX);

    // 如果正在拉动球杆，计算力度
    let pullDistance = 0;
    if (isPulling) {
      const dx = pullStartX - mouseX;
      const dy = pullStartY - mouseY;
      pullDistance = Math.min(Math.sqrt(dx * dx + dy * dy), 100);
    }

    // 计算球杆起点（从白球后方开始）
    const startX = ballX - Math.cos(angle) * (20 + pullDistance);
    const startY = ballY - Math.sin(angle) * (20 + pullDistance);

    // 计算球杆终点
    const endX = startX - Math.cos(angle) * this.length;
    const endY = startY - Math.sin(angle) * this.length;

    // 绘制瞄准线
    if (!isPulling) {
      this.drawAimLine(ctx, ballX, ballY, mouseX, mouseY);
    }

    // 绘制球杆
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = this.width;
    ctx.strokeStyle = this.color;
    ctx.stroke();

    // 绘制球杆头部
    ctx.beginPath();
    ctx.arc(startX, startY, this.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#F4A460";
    ctx.fill();
  }

  drawAimLine(ctx, ballX, ballY, mouseX, mouseY) {
    const maxBounces = 1; // 最多反弹次数
    let currentX = ballX;
    let currentY = ballY;
    let angle = Math.atan2(mouseY - ballY, mouseX - ballX);
    let dx = Math.cos(angle);
    let dy = Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";

    for (let bounce = 0; bounce <= maxBounces; bounce++) {
      let nextX = currentX;
      let nextY = currentY;
      let hitBorder = false;

      // 计算射线直到击中边界或其他球
      while (
        !hitBorder &&
        nextX >= 0 &&
        nextX <= canvas.width &&
        nextY >= 0 &&
        nextY <= canvas.height
      ) {
        nextX += dx * 5;
        nextY += dy * 5;

        // 检查是否击中其他球
        for (const ball of balls) {
          if (ball !== whiteBall) {
            const ballDx = nextX - ball.x;
            const ballDy = nextY - ball.y;
            const distance = Math.sqrt(ballDx * ballDx + ballDy * ballDy);
            if (distance < ball.radius) {
              hitBorder = true;
              break;
            }
          }
        }

        // 检查是否击中边界
        if (nextX <= 0 || nextX >= canvas.width) {
          dx = -dx;
          hitBorder = true;
        }
        if (nextY <= 0 || nextY >= canvas.height) {
          dy = -dy;
          hitBorder = true;
        }
      }

      ctx.lineTo(nextX, nextY);
      currentX = nextX;
      currentY = nextY;

      if (!hitBorder) break;
    }

    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// 获取画布和上下文
const canvas = document.getElementById("gameCanvas");
if (!canvas) {
  debug("找不到画布元素！");
  throw new Error("Canvas not found");
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  debug("无法获取画布上下文！");
  throw new Error("Cannot get canvas context");
}

// 设置球的布局参数
const startX = canvas.width - 250; // 从右侧开始排列
const startY = canvas.height / 2;
const spacing = 30; // 减小球之间的间距

// 创建所有球的数组
const balls = [];

// 创建白球（母球）
const whiteBall = new Ball(200, canvas.height / 2, 15, "white", 0);
balls.push(whiteBall);

// 在创建球之前添加球洞数组
const pockets = [];
const pocketRadius = 25;

// 创建六个球洞
// 左上
pockets.push(new Pocket(0, 0, pocketRadius));
// 左下
pockets.push(new Pocket(0, canvas.height, pocketRadius));
// 上中
pockets.push(new Pocket(canvas.width / 2, 0, pocketRadius));
// 下中
pockets.push(new Pocket(canvas.width / 2, canvas.height, pocketRadius));
// 右上
pockets.push(new Pocket(canvas.width, 0, pocketRadius));
// 右下
pockets.push(new Pocket(canvas.width, canvas.height, pocketRadius));

// 修改球的颜色和编号
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

// 修改球的排列方法
function createTriangle() {
  const rows = 5; // 5行三角形排列
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
          15,
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

// 在创建白球后添加球杆实例
const cue = new Cue();

// 添加全局变量
let isAiming = false;
let isPulling = false;
let pullStartX = 0;
let pullStartY = 0;

// 添加分数变量
let score = 0;

// 添加游戏状态变量
let gameOver = false;

// 修改鼠标事件处理
canvas.addEventListener("mousedown", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;

  // 只有当所有球都静止时才能击球
  if (
    balls.every(
      (ball) =>
        Math.abs(ball.velocity.x) < 0.01 && Math.abs(ball.velocity.y) < 0.01
    )
  ) {
    isAiming = true;
    isPulling = true;
    pullStartX = mouseX;
    pullStartY = mouseY;
  }
});

canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
});

canvas.addEventListener("mouseup", (e) => {
  if (!isPulling) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 计算击球方向（从白球指向鼠标的方向）
  const dx = mouseX - whiteBall.x;
  const dy = mouseY - whiteBall.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > 0) {
    // 设置击球速度（方向与瞄准方向相同）
    const maxSpeed = 20;
    const speed = Math.min((distance / 50) * 15, maxSpeed);

    whiteBall.velocity.x = (dx / distance) * speed; // 删除负号
    whiteBall.velocity.y = (dy / distance) * speed; // 删除负号
  }

  // 重置状态
  isAiming = false;
  isPulling = false;
});

// 修改游戏循环，添加球杆和瞄准线的绘制
function gameLoop() {
  // 清除画布
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 绘制背景
  ctx.fillStyle = "#076324";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 绘制球洞
  pockets.forEach((pocket) => pocket.draw(ctx));

  // 更新和绘制所有球
  for (let i = balls.length - 1; i >= 0; i--) {
    balls[i].update();

    // 检查是否有球进洞
    let pocketed = false;
    for (const pocket of pockets) {
      if (pocket.checkBall(balls[i])) {
        if (balls[i] !== whiteBall) {
          // 检查是否是黑球（8号球）
          if (balls[i].number === 8) {
            // 如果是黑球，游戏结束
            gameOver = true;
            score += 50; // 额外加分
          } else {
            // 如果不是黑球，正常加分
            score += balls[i].number;
          }
          balls.splice(i, 1);
          pocketed = true;
          break;
        } else {
          // 白球进洞的处理保持不变
          whiteBall.x = 200;
          whiteBall.y = canvas.height / 2;
          whiteBall.velocity = { x: 0, y: 0 };
          score = Math.max(0, score - 10);
        }
      }
    }

    if (!pocketed) {
      balls[i].draw(ctx);
      // 检查与其他球的碰撞
      for (let j = i - 1; j >= 0; j--) {
        balls[i].collideWith(balls[j]);
      }
    }
  }

  // 在所有球绘制完成后，检查是否所有球都静止
  const allBallsStopped = balls.every(
    (ball) =>
      Math.abs(ball.velocity.x) < 0.01 && Math.abs(ball.velocity.y) < 0.01
  );

  // 如果所有球都静止且没有在击球，绘制球杆和瞄准线
  if (allBallsStopped && !isAiming) {
    cue.drawAimLine(ctx, whiteBall.x, whiteBall.y, mouseX, mouseY);
    cue.draw(ctx, whiteBall.x, whiteBall.y, mouseX, mouseY);
  }

  // 绘制分数
  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`得分: ${score}`, 20, 20);

  // 在游戏循环末尾添加游戏结束的显示
  if (gameOver) {
    // 绘制游戏结束文字
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("游戏结束!", canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillText(
      `最终得分: ${score}`,
      canvas.width / 2,
      canvas.height / 2 + 30
    );

    // 停止游戏循环
    return;
  }

  requestAnimationFrame(gameLoop);
}

// 启动游戏
gameLoop();

// 添加加载完成提示
debug("游戏已启动！");
