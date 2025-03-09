// 卡牌管理类
class CardSystem {
  constructor() {
    this.chanceCards = this.initializeChanceCards();
    this.fateCards = this.initializeFateCards();
    this.shuffleCards();
  }

  // 初始化机会卡
  initializeChanceCards() {
    return [
      {
        name: "银行红利",
        description: "银行发放红利，获得 2000 元",
        action: (player, game) => {
          player.money += 2000;
          game.showMessage(`${player.name} 获得银行红利 2000 元`);
        },
      },
      {
        name: "前进到起点",
        description: "前进到起点，并获得 2000 元",
        action: (player, game) => {
          const oldPosition = player.position;
          player.position = 0;
          player.money += 2000;
          game.board.drawPlayers(game.players);
          game.showMessage(`${player.name} 前进到起点，获得 2000 元`);
        },
      },
      {
        name: "路费",
        description: "支付道路维护费 1500 元",
        action: (player, game) => {
          player.money -= 1500;
          game.showMessage(`${player.name} 支付道路维护费 1500 元`);
          if (player.money < 0) {
            game.bankruptcy();
          }
        },
      },
      {
        name: "房屋维修",
        description: "每座房屋需要支付维修费 500 元",
        action: (player, game) => {
          const houses = player.properties.reduce(
            (total, property) => total + property.houses,
            0
          );
          const cost = houses * 500;
          player.money -= cost;
          game.showMessage(`${player.name} 支付房屋维修费 ${cost} 元`);
          if (player.money < 0) {
            game.bankruptcy();
          }
        },
      },
      {
        name: "前进三步",
        description: "前进三步",
        action: (player, game) => {
          game.movePlayer(player, 3);
          game.showMessage(`${player.name} 前进三步`);
        },
      },
      {
        name: "后退两步",
        description: "后退两步",
        action: (player, game) => {
          const newPosition =
            (player.position - 2 + game.board.tiles.length) %
            game.board.tiles.length;
          player.position = newPosition;
          game.board.drawPlayers(game.players);
          game.showMessage(`${player.name} 后退两步`);
        },
      },
      {
        name: "免费通行",
        description: "获得一张免费通行卡，可以免除一次租金",
        action: (player, game) => {
          player.cards.push("免费通行");
          game.showMessage(`${player.name} 获得一张免费通行卡`);
        },
      },
      {
        name: "生日快乐",
        description: "今天是你的生日，每位玩家送你 500 元",
        action: (player, game) => {
          let total = 0;
          game.players.forEach((p) => {
            if (p !== player && p.money >= 500) {
              p.money -= 500;
              total += 500;
            }
          });
          player.money += total;
          game.showMessage(`${player.name} 收到生日礼金 ${total} 元`);
        },
      },
    ];
  }

  // 初始化命运卡
  initializeFateCards() {
    return [
      {
        name: "中彩票",
        description: "恭喜中彩票，获得 5000 元",
        action: (player, game) => {
          player.money += 5000;
          game.showMessage(`${player.name} 中彩票获得 5000 元`);
        },
      },
      {
        name: "所得税",
        description: "缴纳所得税，支付总资产的 10%",
        action: (player, game) => {
          const tax = Math.round(player.getTotalAssets() * 0.1);
          player.money -= tax;
          game.showMessage(`${player.name} 缴纳所得税 ${tax} 元`);
          if (player.money < 0) {
            game.bankruptcy();
          }
        },
      },
      {
        name: "进监狱",
        description: "因逃税被抓，进入监狱",
        action: (player, game) => {
          player.goToJail();
          game.board.drawPlayers(game.players);
          game.showMessage(`${player.name} 进入监狱`);
        },
      },
      {
        name: "免费出狱",
        description: "获得一张免费出狱卡",
        action: (player, game) => {
          player.cards.push("免费出狱");
          game.showMessage(`${player.name} 获得一张免费出狱卡`);
        },
      },
      {
        name: "财产保险",
        description: "支付所有房产总价值的 5% 作为保险费",
        action: (player, game) => {
          const propertyValue = player.properties.reduce((total, property) => {
            return (
              total + property.price + property.houses * property.buildingCost
            );
          }, 0);
          const insurance = Math.round(propertyValue * 0.05);
          player.money -= insurance;
          game.showMessage(`${player.name} 支付保险费 ${insurance} 元`);
          if (player.money < 0) {
            game.bankruptcy();
          }
        },
      },
      {
        name: "股市大涨",
        description: "股市大涨，获得现金的 50% 作为收益",
        action: (player, game) => {
          const profit = Math.round(player.money * 0.5);
          player.money += profit;
          game.showMessage(`${player.name} 获得股市收益 ${profit} 元`);
        },
      },
      {
        name: "慈善捐款",
        description: "向慈善基金会捐款 2000 元",
        action: (player, game) => {
          player.money -= 2000;
          game.showMessage(`${player.name} 慈善捐款 2000 元`);
          if (player.money < 0) {
            game.bankruptcy();
          }
        },
      },
      {
        name: "医疗费",
        description: "支付医疗费 1000 元",
        action: (player, game) => {
          player.money -= 1000;
          game.showMessage(`${player.name} 支付医疗费 1000 元`);
          if (player.money < 0) {
            game.bankruptcy();
          }
        },
      },
    ];
  }

  // 洗牌
  shuffleCards() {
    this.shuffleArray(this.chanceCards);
    this.shuffleArray(this.fateCards);
  }

  // Fisher-Yates 洗牌算法
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // 抽取机会卡
  drawChanceCard() {
    const card = this.chanceCards.pop();
    this.chanceCards.unshift(card); // 将使用过的卡放回牌堆底部
    return card;
  }

  // 抽取命运卡
  drawFateCard() {
    const card = this.fateCards.pop();
    this.fateCards.unshift(card); // 将使用过的卡放回牌堆底部
    return card;
  }
}
