// 地块类
class Tile {
  constructor(data, position) {
    this.type = data.type;
    this.name = data.name;
    this.position = position;
    this.price = data.price || 0;
    this.color = data.color;
    this.owner = null;
    this.houses = 0;
    this.buildingCost = this.price ? this.price / 2 : 0;
    this.action = data.action;
    this.amount = data.amount;
  }

  // 计算租金
  calculateRent(houseCount = this.houses) {
    if (!this.owner || this.type !== "property") return 0;

    let rent = this.price * 0.1; // 基础租金是价格的10%

    // 如果有房屋，每个房屋增加租金
    if (houseCount > 0) {
      rent += this.buildingCost * houseCount;
    }

    // 如果垄断，租金翻倍
    if (this.owner.hasMonopoly(this.color)) {
      rent *= 2;
    }

    return Math.round(rent);
  }
}

// 游戏棋盘类
class GameBoard {
  constructor() {
    console.log("Initializing GameBoard...");
    this.canvas = document.getElementById("board-canvas");
    if (!this.canvas) {
      console.error("Canvas element not found!");
      return;
    }
    this.ctx = this.canvas.getContext("2d");
    this.tiles = [];
    this.jailPosition = 10;

    // 定义地块颜色
    this.propertyColors = {
      brown: "#8B4513",
      lightBlue: "#87CEEB",
      pink: "#FF69B4",
      orange: "#FFA500",
      red: "#FF0000",
      yellow: "#FFD700",
      green: "#008000",
      blue: "#0000FF",
    };

    console.log("Canvas element found:", this.canvas);
    console.log("Canvas context:", this.ctx);

    // 初始化画布大小
    this.resizeCanvas();

    // 初始化地块
    this.initializeTiles();

    // 绘制棋盘
    this.draw();

    // 监听窗口大小变化
    window.addEventListener("resize", () => {
      console.log("Window resized");
      this.resizeCanvas();
    });
  }

  // 调整画布大小
  resizeCanvas() {
    const container = this.canvas.parentElement;
    if (!container) {
      console.error("Canvas container not found");
      return;
    }

    // 获取容器的实际大小
    const containerStyle = window.getComputedStyle(container);
    const containerWidth = parseInt(containerStyle.width);
    const containerHeight = parseInt(containerStyle.height);

    console.log("Container size:", containerWidth, containerHeight);

    // 设置画布大小为容器的实际大小
    this.canvas.width = containerWidth;
    this.canvas.height = containerHeight;

    // 计算合适的格子大小
    this.tileSize = Math.min(containerWidth, containerHeight) / 13;

    console.log("Canvas resized to:", this.canvas.width, this.canvas.height);
    console.log("Tile size:", this.tileSize);

    // 立即重绘
    if (this.tiles.length > 0) {
      this.draw();
    }
  }

  // 初始化地块
  initializeTiles() {
    console.log("Initializing tiles...");
    const tileData = [
      { type: "corner", name: "起点", action: "collect", amount: 2000 },
      {
        type: "property",
        name: "第一大道",
        price: 600,
        color: this.propertyColors.brown,
      },
      { type: "fate", name: "命运" },
      {
        type: "property",
        name: "第二大道",
        price: 600,
        color: this.propertyColors.brown,
      },
      { type: "tax", name: "所得税", amount: 2000 },
      { type: "railroad", name: "南方铁路", price: 2000 },
      {
        type: "property",
        name: "第三大道",
        price: 1000,
        color: this.propertyColors.lightBlue,
      },
      { type: "chance", name: "机会" },
      {
        type: "property",
        name: "第四大道",
        price: 1000,
        color: this.propertyColors.lightBlue,
      },
      {
        type: "property",
        name: "第五大道",
        price: 1200,
        color: this.propertyColors.lightBlue,
      },
      { type: "corner", name: "监狱/探监", action: "jail" },
    ];

    // 创建地块对象
    tileData.forEach((data, index) => {
      this.tiles.push(new Tile(data, index));
    });

    console.log("Tiles initialized:", this.tiles.length, "tiles created");
  }

  // 绘制棋盘
  draw() {
    if (!this.ctx) {
      console.error("Canvas context not found");
      return;
    }

    console.log("Drawing board...");

    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 计算棋盘大小和位置
    const boardSize = this.tileSize * 11;
    const startX = (this.canvas.width - boardSize) / 2;
    const startY = (this.canvas.height - boardSize) / 2;

    console.log("Board dimensions:", startX, startY, boardSize);

    // 绘制棋盘背景
    this.ctx.fillStyle = "#F0F0F0";
    this.ctx.fillRect(startX, startY, boardSize, boardSize);

    // 绘制中心区域
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillRect(
      startX + this.tileSize,
      startY + this.tileSize,
      boardSize - 2 * this.tileSize,
      boardSize - 2 * this.tileSize
    );

    // 绘制每个地块
    this.tiles.forEach((tile, index) => {
      const position = this.calculateTilePosition(index, startX, startY);
      this.drawTile(tile, position);
      console.log(`Drawing tile ${index} at:`, position.x, position.y);
    });

    // 绘制中心标题
    this.ctx.fillStyle = "#2c3e50";
    this.ctx.font = `bold ${this.tileSize}px Arial`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("大富翁", startX + boardSize / 2, startY + boardSize / 2);
  }

  // 计算地块位置
  calculateTilePosition(index, startX, startY) {
    const boardSize = this.tileSize * 11;
    const tilesPerSide = 10;

    if (index === 0)
      return {
        x: startX + boardSize - this.tileSize,
        y: startY + boardSize - this.tileSize,
      }; // 起点
    if (index <= tilesPerSide)
      return {
        x: startX + boardSize - index * this.tileSize,
        y: startY + boardSize - this.tileSize,
      }; // 下边
    if (index <= tilesPerSide * 2)
      return {
        x: startX,
        y: startY + boardSize - (index - tilesPerSide) * this.tileSize,
      }; // 左边
    if (index <= tilesPerSide * 3)
      return {
        x: startX + (index - tilesPerSide * 2) * this.tileSize,
        y: startY,
      }; // 上边
    return {
      x: startX + boardSize - this.tileSize,
      y: startY + (index - tilesPerSide * 3) * this.tileSize,
    }; // 右边
  }

  // 绘制单个地块
  drawTile(tile, position) {
    const { x, y } = position;

    // 绘制地块背景
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 1;
    this.ctx.fillRect(x, y, this.tileSize, this.tileSize);
    this.ctx.strokeRect(x, y, this.tileSize, this.tileSize);

    // 如果是房产，绘制颜色条
    if (tile.type === "property") {
      this.ctx.fillStyle = tile.color;
      this.ctx.fillRect(x, y, this.tileSize, this.tileSize * 0.2);
    }

    // 绘制地块名称
    this.ctx.fillStyle = "#000000";
    this.ctx.font = `${this.tileSize * 0.12}px Arial`;
    this.ctx.textAlign = "center";
    this.wrapText(
      tile.name,
      x + this.tileSize / 2,
      y + this.tileSize * 0.4,
      this.tileSize * 0.9,
      this.tileSize * 0.15
    );

    // 如果是房产，绘制价格
    if (
      tile.type === "property" ||
      tile.type === "railroad" ||
      tile.type === "utility"
    ) {
      this.ctx.fillStyle = "#666666";
      this.ctx.font = `${this.tileSize * 0.1}px Arial`;
      this.ctx.fillText(
        `￥${tile.price}`,
        x + this.tileSize / 2,
        y + this.tileSize * 0.8
      );
    }

    // 如果有房屋，绘制房屋图标
    if (tile.type === "property" && tile.houses > 0) {
      this.drawHouses(tile.houses, x, y);
    }

    // 如果有所有者，绘制所有者标记
    if (tile.owner) {
      this.ctx.fillStyle = tile.owner.color;
      this.ctx.beginPath();
      this.ctx.arc(
        x + this.tileSize * 0.5,
        y + this.tileSize * 0.9,
        this.tileSize * 0.1,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }
  }

  // 文字自动换行
  wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split("");
    let line = "";

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = this.ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && n > 0) {
        this.ctx.fillText(line, x, y);
        line = words[n];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, x, y);
  }

  // 绘制房屋
  drawHouses(count, x, y) {
    const houseSize = this.tileSize * 0.15;
    const spacing = this.tileSize * 0.2;
    const startX =
      x + (this.tileSize - (count * houseSize + (count - 1) * spacing)) / 2;
    const startY = y + this.tileSize * 0.6;

    this.ctx.fillStyle = "#32CD32";
    for (let i = 0; i < count; i++) {
      const houseX = startX + i * (houseSize + spacing);
      this.drawHouse(houseX, startY, houseSize);
    }
  }

  // 绘制单个房屋
  drawHouse(x, y, size) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + size / 2, y);
    this.ctx.lineTo(x + size, y + size);
    this.ctx.lineTo(x, y + size);
    this.ctx.closePath();
    this.ctx.fill();
  }

  // 绘制玩家
  drawPlayers(players) {
    players.forEach((player, index) => {
      const position = this.calculateTilePosition(
        player.position,
        (this.canvas.width - this.tileSize * 11) / 2,
        (this.canvas.height - this.tileSize * 11) / 2
      );

      // 计算玩家在地块上的偏移位置
      const offsetX = (index % 2) * (this.tileSize / 2);
      const offsetY = Math.floor(index / 2) * (this.tileSize / 2);

      // 绘制玩家标记
      this.ctx.fillStyle = player.color;
      this.ctx.beginPath();
      this.ctx.arc(
        position.x + this.tileSize / 4 + offsetX,
        position.y + this.tileSize / 4 + offsetY,
        this.tileSize * 0.15,
        0,
        Math.PI * 2
      );
      this.ctx.fill();

      // 绘制玩家编号
      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = `${this.tileSize * 0.2}px Arial`;
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        player.id + 1,
        position.x + this.tileSize / 4 + offsetX,
        position.y + this.tileSize / 4 + offsetY
      );
    });
  }
}
