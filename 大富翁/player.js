// 玩家类
class Player {
  constructor({ id, name, color, money, position, isAI }) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.money = money;
    this.position = position;
    this.isAI = isAI;
    this.properties = []; // 拥有的房产
    this.inJail = false; // 是否在监狱
    this.jailTurns = 0; // 在监狱待的回合数
    this.cards = []; // 持有的卡片
  }

  // 添加房产
  addProperty(property) {
    this.properties.push(property);
    property.owner = this; // 设置房产所有者
  }

  // 移除房产
  removeProperty(property) {
    const index = this.properties.indexOf(property);
    if (index > -1) {
      this.properties.splice(index, 1);
      property.owner = null; // 清除房产所有者
    }
  }

  // 获取总资产
  getTotalAssets() {
    const propertyValue = this.properties.reduce((total, property) => {
      return total + property.price + property.houses * property.buildingCost;
    }, 0);
    return this.money + propertyValue;
  }

  // 检查是否拥有某个颜色的所有房产
  hasMonopoly(color) {
    // 获取当前游戏实例
    const game = window.game;
    if (!game || !game.board) return false;

    const colorProperties = this.properties.filter((p) => p.color === color);
    const totalColorProperties = game.board.tiles.filter(
      (t) => t.type === "property" && t.color === color
    ).length;
    return colorProperties.length === totalColorProperties;
  }

  // 进入监狱
  goToJail() {
    this.inJail = true;
    this.jailTurns = 0;
    const game = window.game;
    if (game && game.board) {
      this.position = game.board.jailPosition;
    }
  }

  // 从监狱释放
  releaseFromJail() {
    this.inJail = false;
    this.jailTurns = 0;
  }

  // AI决策逻辑
  makeDecision(gameState) {
    if (!this.isAI) return null;

    // 获取当前位置的地块
    const currentTile = gameState.board.tiles[this.position];

    // 如果是空地且有足够的钱，就购买
    if (
      currentTile.type === "property" &&
      !currentTile.owner &&
      this.money >= currentTile.price
    ) {
      // 判断是否值得购买
      const worthBuying = this.evaluateProperty(currentTile, gameState);
      if (worthBuying) {
        return "buy";
      }
    }

    // 如果是自己的地产且有足够的钱，考虑建房
    if (
      currentTile.type === "property" &&
      currentTile.owner === this &&
      currentTile.houses < 3 &&
      this.money >= currentTile.buildingCost
    ) {
      const worthBuilding = this.evaluateBuilding(currentTile, gameState);
      if (worthBuilding) {
        return "build";
      }
    }

    return "end";
  }

  // AI评估是否值得购买地产
  evaluateProperty(property, gameState) {
    // 保留最低资金安全线
    const SAFETY_MONEY = 5000;
    if (this.money - property.price < SAFETY_MONEY) {
      return false;
    }

    // 评估地块价值
    const value = this.calculatePropertyValue(property, gameState);
    return value > property.price;
  }

  // AI评估是否值得建房
  evaluateBuilding(property, gameState) {
    // 保留最低资金安全线
    const SAFETY_MONEY = 3000;
    if (this.money - property.buildingCost < SAFETY_MONEY) {
      return false;
    }

    // 如果有垄断，优先建房
    if (this.hasMonopoly(property.color)) {
      return true;
    }

    // 评估建房收益
    const currentRent = property.calculateRent();
    const futureRent = property.calculateRent(property.houses + 1);
    const rentIncrease = futureRent - currentRent;

    // 如果租金增加能在10回合内收回成本，就建房
    return rentIncrease * 10 > property.buildingCost;
  }

  // AI计算地产价值
  calculatePropertyValue(property, gameState) {
    let value = property.price;

    // 如果是垄断的最后一块地，价值更高
    const sameColorProperties = gameState.board.tiles.filter(
      (t) => t.type === "property" && t.color === property.color
    );
    const ownedSameColor = this.properties.filter(
      (p) => p.color === property.color
    ).length;
    if (ownedSameColor === sameColorProperties.length - 1) {
      value *= 1.5;
    }

    // 根据位置评估价值
    const position = property.position;
    if (position < 10 || position > 30) {
      // 靠近起点的位置
      value *= 1.2;
    }

    return value;
  }
}
