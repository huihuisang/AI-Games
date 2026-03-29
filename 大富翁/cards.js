// 卡牌系统
class CardSystem {
  constructor() {
    this.chanceCards = this.makeChanceCards();
    this.fateCards = this.makeFateCards();
    this.shuffle(this.chanceCards);
    this.shuffle(this.fateCards);
  }

  makeChanceCards() {
    return [
      {
        name: "银行红利",
        icon: "🏦",
        desc: "银行发放红利，获得 ¥2000",
        action: (player, game) => {
          player.money += 2000;
          game.log(`${player.name} 获得银行红利 ¥2000`);
        },
      },
      {
        name: "前进到起点",
        icon: "➡️",
        desc: "直接前进到起点，获得 ¥2000",
        action: (player, game) => {
          player.position = 0;
          player.money += 2000;
          game.log(`${player.name} 前进到起点，获得 ¥2000`);
        },
      },
      {
        name: "道路维修费",
        icon: "🔧",
        desc: "支付道路维修费 ¥1500",
        action: (player, game) => {
          player.money -= 1500;
          game.log(`${player.name} 支付道路维修费 ¥1500`);
        },
      },
      {
        name: "房屋维修",
        icon: "🏠",
        desc: "每座房屋支付 ¥500 维修费",
        action: (player, game) => {
          const houses = player.properties.reduce((s, p) => s + p.houses, 0);
          const cost = houses * 500;
          player.money -= cost;
          game.log(`${player.name} 支付房屋维修费 ¥${cost}（${houses}座房屋）`);
        },
      },
      {
        name: "前进三步",
        icon: "👟",
        desc: "向前走三步",
        action: (player, game) => {
          game.movePlayerBy(player, 3);
        },
      },
      {
        name: "后退两步",
        icon: "🔙",
        desc: "后退两步",
        action: (player, game) => {
          player.position =
            (player.position - 2 + TOTAL_TILES) % TOTAL_TILES;
          game.log(`${player.name} 后退了两步`);
        },
      },
      {
        name: "免费通行",
        icon: "🎫",
        desc: "获得一张免费通行卡，可免除一次租金",
        action: (player, game) => {
          player.cards.push("免费通行");
          game.log(`${player.name} 获得一张免费通行卡`);
        },
      },
      {
        name: "生日快乐",
        icon: "🎂",
        desc: "今天是你的生日！每位玩家送你 ¥500",
        action: (player, game) => {
          let total = 0;
          game.players.forEach((p) => {
            if (p !== player && !p.bankrupt) {
              const gift = Math.min(500, p.money);
              p.money -= gift;
              total += gift;
            }
          });
          player.money += total;
          game.log(`${player.name} 收到生日礼金 ¥${total}`);
        },
      },
    ];
  }

  makeFateCards() {
    return [
      {
        name: "中彩票",
        icon: "🎰",
        desc: "恭喜中彩票！获得 ¥5000",
        action: (player, game) => {
          player.money += 5000;
          game.log(`${player.name} 中彩票获得 ¥5000`);
        },
      },
      {
        name: "缴纳所得税",
        icon: "📋",
        desc: "缴纳总资产 10% 的所得税",
        action: (player, game) => {
          const tax = Math.round(player.getTotalAssets() * 0.1);
          player.money -= tax;
          game.log(`${player.name} 缴纳所得税 ¥${tax}`);
        },
      },
      {
        name: "进监狱",
        icon: "🔒",
        desc: "因逃税被抓，进入监狱！",
        action: (player, game) => {
          player.goToJail();
          game.log(`${player.name} 被送进监狱！`);
        },
      },
      {
        name: "免费出狱",
        icon: "🔑",
        desc: "获得一张免费出狱卡",
        action: (player, game) => {
          player.cards.push("免费出狱");
          game.log(`${player.name} 获得一张免费出狱卡`);
        },
      },
      {
        name: "股市大涨",
        icon: "📈",
        desc: "股市大涨！获得现金 50% 的收益",
        action: (player, game) => {
          const profit = Math.round(player.money * 0.5);
          player.money += profit;
          game.log(`${player.name} 获得股市收益 ¥${profit}`);
        },
      },
      {
        name: "慈善捐款",
        icon: "❤️",
        desc: "向慈善基金会捐款 ¥2000",
        action: (player, game) => {
          player.money -= 2000;
          game.log(`${player.name} 慈善捐款 ¥2000`);
        },
      },
      {
        name: "医疗费",
        icon: "🏥",
        desc: "支付医疗费 ¥1000",
        action: (player, game) => {
          player.money -= 1000;
          game.log(`${player.name} 支付医疗费 ¥1000`);
        },
      },
      {
        name: "意外之财",
        icon: "💎",
        desc: "捡到一颗钻石！获得 ¥3000",
        action: (player, game) => {
          player.money += 3000;
          game.log(`${player.name} 捡到钻石获得 ¥3000`);
        },
      },
    ];
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  drawChance() {
    const card = this.chanceCards.pop();
    this.chanceCards.unshift(card);
    return card;
  }

  drawFate() {
    const card = this.fateCards.pop();
    this.fateCards.unshift(card);
    return card;
  }
}
