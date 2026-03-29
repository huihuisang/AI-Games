// 骰子Unicode字符
const DICE_FACES = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];

// 地块类
class Tile {
  constructor(data, index) {
    this.index = index;
    this.type = data.type;
    this.name = data.name;
    this.price = data.price || 0;
    this.color = data.color || null;
    this.colorGroup = data.colorGroup || null;
    this.owner = null;
    this.houses = 0;
    this.buildCost = data.price ? Math.floor(data.price * 0.6) : 0;
    this.taxAmount = data.taxAmount || 0;
  }

  getRent() {
    if (!this.owner) return 0;

    if (this.type === "property") {
      let base = Math.floor(this.price * 0.1);
      if (this.houses > 0) {
        base += this.buildCost * this.houses;
      }
      if (this.owner.hasMonopoly(this.colorGroup)) {
        base = Math.floor(base * 1.5);
      }
      return base;
    }

    if (this.type === "railroad") {
      const count = this.owner.properties.filter(
        (p) => p.type === "railroad"
      ).length;
      return 500 * Math.pow(2, count - 1);
    }

    if (this.type === "utility") {
      const count = this.owner.properties.filter(
        (p) => p.type === "utility"
      ).length;
      return count === 1 ? 400 : 1000;
    }

    return 0;
  }
}

// 棋盘数据 - 28格简化版
const BOARD_DATA = [
  // 底边 (右->左): 0-7
  { type: "corner", name: "起点" },
  { type: "property", name: "老街", price: 600, color: "#8B4513", colorGroup: "brown" },
  { type: "chance", name: "机会" },
  { type: "property", name: "胡同", price: 600, color: "#8B4513", colorGroup: "brown" },
  { type: "tax", name: "所得税", taxAmount: 2000 },
  { type: "railroad", name: "东方铁路", price: 2000 },
  { type: "property", name: "花园路", price: 1000, color: "#87CEEB", colorGroup: "lightBlue" },

  // 左边 (下->上): 7-13
  { type: "corner", name: "监狱" },
  { type: "property", name: "湖滨道", price: 1000, color: "#87CEEB", colorGroup: "lightBlue" },
  { type: "property", name: "公园路", price: 1200, color: "#87CEEB", colorGroup: "lightBlue" },
  { type: "fate", name: "命运" },
  { type: "property", name: "中山路", price: 1400, color: "#FF69B4", colorGroup: "pink" },
  { type: "utility", name: "电力公司", price: 1500 },
  { type: "property", name: "解放路", price: 1400, color: "#FF69B4", colorGroup: "pink" },

  // 顶边 (左->右): 14-20
  { type: "corner", name: "免费停车" },
  { type: "property", name: "南京路", price: 1800, color: "#FFA500", colorGroup: "orange" },
  { type: "chance", name: "机会" },
  { type: "property", name: "淮海路", price: 1800, color: "#FFA500", colorGroup: "orange" },
  { type: "property", name: "长安街", price: 2000, color: "#FF0000", colorGroup: "red" },
  { type: "railroad", name: "南方铁路", price: 2000 },
  { type: "property", name: "王府井", price: 2200, color: "#FF0000", colorGroup: "red" },

  // 右边 (上->下): 21-27
  { type: "corner", name: "去监狱" },
  { type: "property", name: "外滩", price: 2600, color: "#FFD700", colorGroup: "yellow" },
  { type: "fate", name: "命运" },
  { type: "property", name: "陆家嘴", price: 2600, color: "#FFD700", colorGroup: "yellow" },
  { type: "tax", name: "奢侈税", taxAmount: 1000 },
  { type: "property", name: "紫禁城", price: 3500, color: "#4169E1", colorGroup: "blue" },
  { type: "property", name: "天安门", price: 4000, color: "#4169E1", colorGroup: "blue" },
];

const TOTAL_TILES = BOARD_DATA.length;
const TILES_PER_SIDE = TOTAL_TILES / 4; // 7

// 游戏棋盘类
class GameBoard {
  constructor() {
    this.canvas = document.getElementById("board-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.tiles = [];
    this.tileSize = 0;
    this.cornerSize = 0;
    this.boardX = 0;
    this.boardY = 0;
    this.boardPx = 0;

    this.initTiles();
    // Delay initial resize to let the layout settle
    requestAnimationFrame(() => {
      this.resize();
      // Double-check after a short delay for mobile browsers
      setTimeout(() => this.resize(), 100);
    });
    window.addEventListener("resize", () => this.resize());
  }

  initTiles() {
    BOARD_DATA.forEach((data, i) => {
      this.tiles.push(new Tile(data, i));
    });
  }

  resize() {
    const container = this.canvas.parentElement;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Fallback if container has no dimensions yet
    if (w <= 0 || h <= 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Board fits in the smaller dimension
    const side = Math.max(Math.min(w, h) - 10, 200);
    this.canvas.width = side * dpr;
    this.canvas.height = side * dpr;
    this.canvas.style.width = side + "px";
    this.canvas.style.height = side + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Calculate tile sizes: corners are square, sides have (TILES_PER_SIDE - 2) regular tiles
    const normalCount = TILES_PER_SIDE - 2; // 5 normal tiles per side
    // corner = 1.4 * tile width, board = 2*corner + normalCount*tile
    // side = board => side = 2*1.4*tw + 5*tw = 7.8*tw
    this.tileSize = side / (2 * 1.4 + normalCount);
    this.cornerSize = this.tileSize * 1.4;
    this.boardPx = side;
    this.boardX = 0;
    this.boardY = 0;

    this.draw();
  }

  // Get pixel rect {x, y, w, h} for tile at given index
  getTileRect(index) {
    const ts = this.tileSize;
    const cs = this.cornerSize;
    const bp = this.boardPx;
    const nc = TILES_PER_SIDE - 2; // normal tiles per side
    const sideIndex = Math.floor(index / TILES_PER_SIDE);
    const posInSide = index % TILES_PER_SIDE;

    let x, y, w, h;

    if (sideIndex === 0) {
      // Bottom row, going right to left: index 0 is bottom-right corner
      y = bp - cs;
      h = cs;
      if (posInSide === 0) {
        // bottom-right corner (起点)
        x = bp - cs;
        w = cs;
      } else {
        // tiles 1..5 go right to left, then index 6 is corner but that's side 1 pos 0
        x = bp - cs - posInSide * ts;
        w = ts;
      }
    } else if (sideIndex === 1) {
      // Left column, going bottom to top
      x = 0;
      w = cs;
      if (posInSide === 0) {
        // bottom-left corner (监狱)
        y = bp - cs;
        h = cs;
      } else {
        y = bp - cs - posInSide * ts;
        h = ts;
      }
    } else if (sideIndex === 2) {
      // Top row, going left to right
      y = 0;
      h = cs;
      if (posInSide === 0) {
        // top-left corner (免费停车)
        x = 0;
        w = cs;
      } else {
        x = cs + (posInSide - 1) * ts;
        w = ts;
      }
    } else {
      // Right column, going top to bottom
      x = bp - cs;
      w = cs;
      if (posInSide === 0) {
        // top-right corner (去监狱)
        y = 0;
        h = cs;
      } else {
        y = cs + (posInSide - 1) * ts;
        h = ts;
      }
    }

    return { x, y, w, h };
  }

  draw(players) {
    const ctx = this.ctx;
    const bp = this.boardPx;

    ctx.clearRect(0, 0, bp, bp);

    // Board background
    ctx.fillStyle = "#e8f5e9";
    ctx.fillRect(0, 0, bp, bp);

    // Draw center area
    const cs = this.cornerSize;
    const innerX = cs;
    const innerY = cs;
    const innerW = bp - 2 * cs;
    const innerH = bp - 2 * cs;
    ctx.fillStyle = "#c8e6c9";
    ctx.fillRect(innerX, innerY, innerW, innerH);

    // Center title
    ctx.fillStyle = "#1b5e20";
    ctx.font = `bold ${bp * 0.06}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("大富翁", bp / 2, bp / 2 - bp * 0.03);
    ctx.font = `${bp * 0.025}px sans-serif`;
    ctx.fillStyle = "#388e3c";
    ctx.fillText("MONOPOLY", bp / 2, bp / 2 + bp * 0.04);

    // Draw all tiles
    for (let i = 0; i < this.tiles.length; i++) {
      this.drawTile(i);
    }

    // Draw players
    if (players) {
      this.drawPlayers(players);
    }
  }

  drawTile(index) {
    const ctx = this.ctx;
    const tile = this.tiles[index];
    const rect = this.getTileRect(index);
    const { x, y, w, h } = rect;
    const sideIndex = Math.floor(index / TILES_PER_SIDE);
    const posInSide = index % TILES_PER_SIDE;
    const isCorner = posInSide === 0;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#90a4ae";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // Color strip for properties
    if (tile.color) {
      const stripSize = Math.min(w, h) * 0.22;
      ctx.fillStyle = tile.color;
      if (sideIndex === 0) {
        ctx.fillRect(x, y, w, stripSize);
      } else if (sideIndex === 1) {
        ctx.fillRect(x + w - stripSize, y, stripSize, h);
      } else if (sideIndex === 2) {
        ctx.fillRect(x, y + h - stripSize, w, stripSize);
      } else {
        ctx.fillRect(x, y, stripSize, h);
      }
    }

    // Owner indicator
    if (tile.owner) {
      ctx.fillStyle = tile.owner.color;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.globalAlpha = 1;
    }

    // Text
    const cx = x + w / 2;
    const cy = y + h / 2;
    const minDim = Math.min(w, h);

    ctx.fillStyle = "#263238";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (isCorner) {
      // Corner tiles - larger text
      ctx.font = `bold ${minDim * 0.18}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      // Special icons for corners
      const icons = { "起点": "GO", "监狱": "🔒", "免费停车": "🅿️", "去监狱": "👮" };
      const icon = icons[tile.name];
      if (icon) {
        ctx.font = `${minDim * 0.25}px sans-serif`;
        ctx.fillText(icon, cx, cy - minDim * 0.1);
      }
      ctx.font = `bold ${minDim * 0.14}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.fillText(tile.name, cx, cy + minDim * 0.15);
    } else {
      // Regular tiles
      const fontSize = minDim * 0.17;
      ctx.font = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;

      // Special icons
      if (tile.type === "chance") {
        ctx.font = `${minDim * 0.3}px sans-serif`;
        ctx.fillText("❓", cx, cy - minDim * 0.08);
        ctx.font = `bold ${fontSize * 0.8}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillText("机会", cx, cy + minDim * 0.2);
      } else if (tile.type === "fate") {
        ctx.font = `${minDim * 0.3}px sans-serif`;
        ctx.fillText("🎴", cx, cy - minDim * 0.08);
        ctx.font = `bold ${fontSize * 0.8}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillText("命运", cx, cy + minDim * 0.2);
      } else if (tile.type === "tax") {
        ctx.font = `${minDim * 0.25}px sans-serif`;
        ctx.fillText("💰", cx, cy - minDim * 0.1);
        ctx.font = `bold ${fontSize * 0.75}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillText(tile.name, cx, cy + minDim * 0.15);
        ctx.font = `${fontSize * 0.6}px sans-serif`;
        ctx.fillStyle = "#e53935";
        ctx.fillText(`¥${tile.taxAmount}`, cx, cy + minDim * 0.32);
      } else if (tile.type === "railroad") {
        ctx.font = `${minDim * 0.22}px sans-serif`;
        ctx.fillText("🚂", cx, cy - minDim * 0.15);
        ctx.font = `bold ${fontSize * 0.7}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillText(tile.name, cx, cy + minDim * 0.08);
        ctx.font = `${fontSize * 0.6}px sans-serif`;
        ctx.fillStyle = "#666";
        ctx.fillText(`¥${tile.price}`, cx, cy + minDim * 0.28);
      } else if (tile.type === "utility") {
        ctx.font = `${minDim * 0.22}px sans-serif`;
        ctx.fillText("⚡", cx, cy - minDim * 0.15);
        ctx.font = `bold ${fontSize * 0.7}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillText(tile.name, cx, cy + minDim * 0.08);
        ctx.font = `${fontSize * 0.6}px sans-serif`;
        ctx.fillStyle = "#666";
        ctx.fillText(`¥${tile.price}`, cx, cy + minDim * 0.28);
      } else if (tile.type === "property") {
        // Property name - may need to split for vertical sides
        const nameOffset = tile.color ? minDim * 0.05 : 0;
        ctx.font = `bold ${fontSize * 0.75}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillText(tile.name, cx, cy + nameOffset);
        // Price
        ctx.font = `${fontSize * 0.6}px sans-serif`;
        ctx.fillStyle = "#666";
        ctx.fillText(`¥${tile.price}`, cx, cy + nameOffset + minDim * 0.2);

        // Houses
        if (tile.houses > 0) {
          const houseStr = tile.houses >= 5 ? "🏨" : "🏠".repeat(tile.houses);
          ctx.font = `${minDim * 0.15}px sans-serif`;
          ctx.fillText(houseStr, cx, cy - minDim * 0.25);
        }
      }
    }
  }

  drawPlayers(players) {
    const ctx = this.ctx;
    const activePlayers = players.filter((p) => !p.bankrupt);

    // Group players by position
    const groups = {};
    activePlayers.forEach((p) => {
      if (!groups[p.position]) groups[p.position] = [];
      groups[p.position].push(p);
    });

    for (const pos in groups) {
      const group = groups[pos];
      const rect = this.getTileRect(parseInt(pos));
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const r = Math.min(rect.w, rect.h) * 0.14;

      group.forEach((player, i) => {
        const angle = (i / group.length) * Math.PI * 2 - Math.PI / 2;
        const spread = group.length > 1 ? r * 1.2 : 0;
        const px = cx + Math.cos(angle) * spread;
        const py = cy + Math.sin(angle) * spread;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.arc(px + 1, py + 1, r, 0, Math.PI * 2);
        ctx.fill();

        // Token
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Player number
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${r * 1.2}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(player.id + 1, px, py);
      });
    }
  }

  // Get center point of a tile for animation
  getTileCenter(index) {
    const rect = this.getTileRect(index);
    return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
  }
}
