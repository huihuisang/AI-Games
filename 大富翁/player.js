// 玩家类
class Player {
  constructor({ id, name, color, money, isAI }) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.money = money;
    this.position = 0;
    this.isAI = isAI;
    this.properties = [];
    this.inJail = false;
    this.jailTurns = 0;
    this.cards = [];
    this.bankrupt = false;
    this.doublesCount = 0;
  }

  addProperty(tile) {
    this.properties.push(tile);
    tile.owner = this;
  }

  removeProperty(tile) {
    const idx = this.properties.indexOf(tile);
    if (idx > -1) {
      this.properties.splice(idx, 1);
      tile.owner = null;
      tile.houses = 0;
    }
  }

  getTotalAssets() {
    const propValue = this.properties.reduce((sum, p) => {
      return sum + p.price + p.houses * p.buildCost;
    }, 0);
    return this.money + propValue;
  }

  hasMonopoly(colorGroup) {
    if (!colorGroup) return false;
    const game = window.game;
    if (!game || !game.board) return false;
    const total = game.board.tiles.filter(
      (t) => t.colorGroup === colorGroup
    ).length;
    const owned = this.properties.filter(
      (p) => p.colorGroup === colorGroup
    ).length;
    return owned === total && total > 0;
  }

  goToJail() {
    this.inJail = true;
    this.jailTurns = 0;
    // Jail is tile index 7
    this.position = 7;
  }

  releaseFromJail() {
    this.inJail = false;
    this.jailTurns = 0;
  }

  // AI: decide whether to buy
  shouldBuy(tile) {
    if (!this.isAI) return false;
    if (this.money < tile.price) return false;

    const safetyMoney = 3000;
    const remaining = this.money - tile.price;

    // Always buy if can complete a monopoly
    if (tile.colorGroup) {
      const sameGroup = this.properties.filter(
        (p) => p.colorGroup === tile.colorGroup
      ).length;
      const totalInGroup = window.game.board.tiles.filter(
        (t) => t.colorGroup === tile.colorGroup
      ).length;
      if (sameGroup === totalInGroup - 1) return true;
    }

    // Buy railroads/utilities if affordable
    if (tile.type === "railroad" || tile.type === "utility") {
      return remaining > safetyMoney;
    }

    // Buy property if we can afford it with safety margin
    if (remaining > safetyMoney * 0.5) return true;

    // Cheap properties are worth buying even when tight on cash
    if (tile.price <= 1000 && remaining > 1000) return true;

    return false;
  }

  // AI: decide whether to build
  shouldBuild(tile) {
    if (!this.isAI) return false;
    if (tile.type !== "property") return false;
    if (tile.owner !== this) return false;
    if (tile.houses >= 5) return false;
    if (!this.hasMonopoly(tile.colorGroup)) return false;
    if (this.money - tile.buildCost < 2000) return false;
    return true;
  }
}
