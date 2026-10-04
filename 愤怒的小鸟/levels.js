/* =========================================================
 * 愤怒的小鸟2 · 仿制版 —— 关卡数据 & 共享数值表
 * 坐标系：y 向下，GY 为地面顶面高度；所有构建函数
 * 都以“所放置表面的高度”为参数，自动留 1px 缝隙防初始穿透
 * ========================================================= */
'use strict';

const ABLevels = (() => {
  const GY = 950;

  // ---------- 数值表（物理引擎与游戏层共用） ----------
  const MAT = {
    wood:  { density: 0.0016, hp: 220, points: 500, friction: 0.75, restitution: 0.1 },
    stone: { density: 0.0030, hp: 520, points: 900, friction: 0.75, restitution: 0.08 },
    ice:   { density: 0.0012, hp: 85,  points: 300, friction: 0.42, restitution: 0.15 },
  };
  const BIRDS = {
    red:     { name: '大红',   r: 17, density: 0.0044, ability: null,   desc: '稳重的一发' },
    chuck:   { name: '飞镖黄', r: 15, density: 0.0038, ability: 'dash', desc: '点击：向前冲刺' },
    blues:   { name: '蓝弟弟', r: 12, density: 0.0030, ability: 'split', desc: '点击：一分为三' },
    bomb:    { name: '炸弹黑', r: 19, density: 0.0050, ability: 'boom', desc: '点击：原地爆炸' },
    matilda: { name: '白公主', r: 18, density: 0.0034, ability: 'egg',  desc: '点击：俯冲下蛋' },
  };
  const PIG = { r: 22, density: 0.0009, hp: 110, points: 5000, helmetHp: 380, helmetPoints: 6000, helmetDensity: 0.0018 };
  const TNT = { size: 44, density: 0.0010, hp: 55, points: 700 };

  // ---------- 构建快捷函数（bottom = 放置面高度） ----------
  const col  = (x, mat, bottom, w = 22, h = 115) => ({ t: 'b', mat, x, y: bottom - h / 2 - 1, w, h, angle: 0 });
  const beam = (x, mat, bottom, w = 150, h = 22) => ({ t: 'b', mat, x, y: bottom - h / 2 - 1, w, h, angle: 0 });
  const box  = (x, mat, bottom, s = 46) => ({ t: 'b', mat, x, y: bottom - s / 2 - 1, w: s, h: s, angle: 0 });
  const pane = (x, mat, bottom, w = 18, h = 95) => ({ t: 'b', mat, x, y: bottom - h / 2 - 1, w, h, angle: 0 });
  const pig  = (x, bottom, r = PIG.r, helmet = false) => ({ t: 'p', x, y: bottom - r - 2, r, helmet });
  const tnt  = (x, bottom, s = TNT.size) => ({ t: 'x', x, y: bottom - s / 2 - 1, w: s, h: s });

  // ---------- 八个关卡 ----------
  const levels = [

    {
      name: '初试身手', width: 2200,
      birds: ['red', 'red', 'red'],
      build() {
        const out = [];
        out.push(col(1480, 'wood', GY), col(1600, 'wood', GY));
        out.push(pig(1540, GY));
        const top = GY - 115;
        out.push(beam(1540, 'wood', top, 170));
        out.push(pig(1540, top - 22));
        out.push(box(1478, 'wood', top - 22, 40), box(1602, 'wood', top - 22, 40));
        return out;
      },
    },

    {
      name: '冰凉小屋', width: 2300,
      birds: ['red', 'blues', 'blues'],
      build() {
        const out = [];
        out.push(pane(1440, 'ice', GY), pane(1580, 'ice', GY));
        out.push(pig(1510, GY));
        let y = GY - 95;
        out.push(beam(1510, 'ice', y, 150, 20));
        y -= 20;
        out.push(pig(1510, y));
        out.push(pane(1455, 'ice', y), pane(1565, 'ice', y));
        y -= 95;
        out.push(beam(1510, 'ice', y, 130, 20));
        y -= 20;
        out.push(pig(1510, y));
        out.push(box(1680, 'ice', GY, 44), box(1680, 'ice', GY - 44, 40));
        return out;
      },
    },

    {
      name: '木头堡垒', width: 2400,
      birds: ['red', 'chuck', 'chuck', 'red'],
      build() {
        const out = [];
        // 左侧双层塔
        out.push(col(1380, 'wood', GY), col(1500, 'wood', GY));
        out.push(pig(1440, GY));
        let y = GY - 115;
        out.push(beam(1440, 'wood', y));
        y -= 22;
        out.push(col(1380, 'wood', y), col(1500, 'wood', y));
        out.push(pig(1440, y));
        y -= 115;
        out.push(beam(1440, 'wood', y));
        y -= 22;
        out.push(pig(1440, y));
        // TNT 弹药箱
        out.push(tnt(1615, GY));
        // 右侧小塔
        out.push(col(1735, 'wood', GY), col(1855, 'wood', GY));
        out.push(pig(1795, GY));
        y = GY - 115;
        out.push(beam(1795, 'wood', y));
        out.push(pig(1795, y - 22));
        return out;
      },
    },

    {
      name: '石头阵', width: 2400,
      birds: ['bomb', 'red', 'bomb', 'chuck'],
      build() {
        const out = [];
        // 左侧石墙（双层）+ 墙顶哨猪
        out.push(col(1400, 'stone', GY, 26), col(1400, 'stone', GY - 115, 26));
        out.push(box(1400, 'stone', GY - 230, 46));
        out.push(pig(1400, GY - 276));
        // 石头碉堡
        out.push(box(1560, 'stone', GY), box(1660, 'stone', GY));
        out.push(pig(1610, GY));
        let y = GY - 46;
        out.push(beam(1610, 'stone', y, 150, 26));
        y -= 26;
        out.push(pig(1610, y));
        out.push(box(1560, 'stone', y, 40), box(1660, 'stone', y, 40));
        // 右侧冰栏羊圈
        out.push(pane(1720, 'ice', GY, 18), pane(1810, 'ice', GY, 18));
        out.push(pig(1765, GY));
        out.push(beam(1765, 'ice', GY - 95, 130, 20));
        out.push(pig(1765, GY - 117));
        return out;
      },
    },

    {
      name: '高空猪塔', width: 2500,
      birds: ['matilda', 'chuck', 'red', 'blues'],
      build() {
        const out = [];
        // 三层高塔
        out.push(col(1590, 'wood', GY), col(1710, 'wood', GY));
        out.push(pig(1650, GY));
        let y = GY - 115;
        out.push(beam(1650, 'wood', y));
        y -= 22;
        out.push(col(1590, 'wood', y), col(1710, 'wood', y));
        out.push(pig(1650, y));
        y -= 115;
        out.push(beam(1650, 'wood', y));
        y -= 22;
        out.push(col(1608, 'wood', y, 20), col(1692, 'wood', y, 20));
        y -= 115;
        out.push(beam(1650, 'wood', y));
        y -= 22;
        out.push(pig(1650, y));
        // 侧边冰塔上的小猪
        out.push(box(1900, 'ice', GY, 44), box(1900, 'ice', GY - 44, 44));
        out.push(pig(1900, GY - 88));
        // 右侧独居猪
        out.push(box(2065, 'wood', GY, 46));
        out.push(pig(2065, GY - 46));
        return out;
      },
    },

    {
      name: '双子要塞', width: 2600,
      birds: ['red', 'chuck', 'bomb', 'blues', 'chuck'],
      build() {
        const out = [];
        // 两座双层塔
        for (const cx of [1450, 1850]) {
          out.push(col(cx - 70, 'wood', GY), col(cx + 70, 'wood', GY));
          out.push(pig(cx, GY));
          let y = GY - 115;
          out.push(beam(cx, 'wood', y, 170));
          y -= 22;
          out.push(col(cx - 70, 'wood', y), col(cx + 70, 'wood', y));
          y -= 115;
          out.push(beam(cx, 'wood', y, 170));
        }
        // 天桥 + TNT + 猪王
        const bridgeTop = GY - 115 - 22 - 115 - 22; // = 676
        out.push(beam(1650, 'wood', bridgeTop, 430, 24));
        let y = bridgeTop - 24;
        out.push(tnt(1650, y));
        out.push(pig(1550, y), pig(1750, y));
        out.push(pig(1650, y - 44, PIG.r, true));
        return out;
      },
    },

    {
      name: '猪猪迷宫', width: 2600,
      birds: ['matilda', 'bomb', 'chuck', 'blues', 'red'],
      build() {
        const out = [];
        // 一层：三个猪圈
        out.push(col(1400, 'stone', GY, 26), col(1560, 'wood', GY), col(1740, 'wood', GY), col(1900, 'stone', GY, 26));
        out.push(pig(1480, GY), pig(1650, GY), pig(1820, GY));
        let y = GY - 115;
        // 石板大屋顶
        out.push(beam(1650, 'stone', y, 560, 26));
        y -= 26;
        // 二层：冰栏杆平台
        out.push(pane(1520, 'ice', y, 18), pane(1780, 'ice', y, 18));
        out.push(pig(1650, y));
        y -= 95;
        out.push(beam(1650, 'ice', y, 290, 20));
        y -= 20;
        // 塔顶戴头盔的猪王
        out.push(pig(1650, y, PIG.r, true));
        return out;
      },
    },

    {
      name: '猪王城堡', width: 3000,
      birds: ['red', 'chuck', 'blues', 'bomb', 'matilda', 'chuck'],
      build() {
        const out = [];
        // 左右双塔（石基木身）
        for (const cx of [1350, 2050]) {
          out.push(col(cx - 70, 'stone', GY, 26), col(cx + 70, 'stone', GY, 26));
          out.push(pig(cx, GY));
          let y = GY - 115;
          out.push(beam(cx, 'stone', y, 170, 26));
          y -= 26;
          out.push(col(cx - 55, 'wood', y, 20), col(cx + 55, 'wood', y, 20));
          out.push(pig(cx, y));
          y -= 115;
          out.push(beam(cx, 'wood', y, 150, 22));
          y -= 22;
          out.push(pig(cx, y));
        }
        // 中央主堡 + TNT 弹药库
        out.push(pane(1530, 'stone', GY, 20, 110), pane(1870, 'stone', GY, 20, 110));
        out.push(col(1610, 'stone', GY, 26), col(1790, 'stone', GY, 26));
        out.push(tnt(1655, GY), tnt(1745, GY));
        out.push(pig(1700, GY));
        let y = GY - 115;
        out.push(beam(1700, 'stone', y, 250, 26));
        y -= 26;
        out.push(col(1650, 'wood', y, 20), col(1750, 'wood', y, 20));
        out.push(pig(1700, y));
        y -= 115;
        out.push(beam(1700, 'wood', y, 140, 22));
        y -= 22;
        // 城堡之巅：戴头盔的猪王
        out.push(pig(1700, y, PIG.r, true));
        return out;
      },
    },
  ];

  return { GY, MAT, BIRDS, PIG, TNT, levels };
})();

if (typeof module !== 'undefined') module.exports = ABLevels;
else window.ABLevels = ABLevels;
