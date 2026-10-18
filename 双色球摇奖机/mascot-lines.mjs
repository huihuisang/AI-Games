import { randomInt } from './draw.mjs';

export const MASCOT_LINES = Object.freeze(Object.fromEntries(Object.entries({
  caishen: [
    '这组号码本神罩着，财运给你撑腰。',
    '元宝往这一放，福气先给你占个位。',
    '老板，本神金手一点，这组必须旺你。',
    '你的愿望我记账了，福气一分都不少。',
    '财神亲选，今天的排面给你拉满。',
    '本神盖个章：这组号码，财气十足。',
    '财神爷亲自护你，穷气见了都得绕路。',
    '这算盘一响，好运就往你兜里赶。',
    '老板放心，财路上的门我替你推开。',
    '本神把元宝押这儿了，这回一定中！',
    '财运加急件，本神亲自给你送到。',
    '这组我开过光了，好运得多看你两眼。',
    '别人求财靠许愿，你这单财神亲自办。',
    '本神给这组施个法：好运翻倍，福气管够。',
    '金算盘替你一拨，霉运统统记到别处。',
    '老板收好，这可是沾了仙气的号码。',
    '天上的财库我熟，替你多打个招呼。',
    '福袋给你系紧了，好运一颗都跑不了。',
    '本神今天偏心，就把财气往你这边吹。',
    '这组号码有本神担保，气势上先中头彩。',
  ],
  future: [
    '这组我在未来见过，先替你把好运带回来。',
    '嘘，未来的中奖名单，我好像看见你了。',
    '我跨了三条时间线，就为护住你这点好运。',
    '这组号码先收好，未来的你笑得可大声了。',
    '时光机不白坐，给你捎了点未来的财运。',
    '偷偷改了下好运日程，今天优先安排你。',
    '未来的我已经开始庆祝了，你先别露馅。',
    '这几个号码眼熟，像我未来密码箱上的。',
    '我从未来回来，可不是陪你凑热闹的。',
    '听未来的自己一句：这组，气场稳得很。',
    '我把未来的好运借来了，利息我替你还。',
    '别问我怎么知道，时光机停门口呢。',
    '我给这条时间线加了个好运补丁，专门护你。',
    '这组号码我罩着，平行宇宙也别想抢。',
    '剧透一句：未来的你，说这次一定中。',
    '我把你今天的幸运值，从未来拉满了。',
    '时间坐标对上了，这回好运该轮到你。',
    '从明天给你寄来的福气，今天提前签收。',
    '我替你跟未来打过招呼了，记得给你留个好位。',
    '这趟穿越没带行李，满舱都是给你的好运。',
  ],
  cat: [
    '本喵爪子一盖，这组号码归我保佑。',
    '招财爪启动，你的财运本喵来守。',
    '这组本喵蹭过了，满满都是招财气。',
    '本喵尾巴一甩，霉运去别家排队。',
    '这组号码本喵罩着，谁也不许说不旺。',
    '给你拍个招财爪，福气拿走，罐头留下。',
    '本喵亲选，幸运概率翻倍，喵说的！',
    '九条命攒的福气，今天分你一大把。',
    '本喵已经替你把财门挠开了，快接着。',
    '别看本喵个子小，招财这事可是祖传。',
    '这组一定中！本喵连庆功罐头都挑好了。',
    '不许愁眉苦脸，本喵施法要你旺起来。',
    '小爪一挥，好运自动往你怀里钻。',
    '谁说猫只会睡觉？本喵梦里都在替你招财。',
    '本喵把福气团成球，挨个塞进你号码里。',
    '今天破例多招两下手，偏心你，怎么啦。',
    '这组本喵验过了，闻着就有发财的味。',
    '本喵的招财铃铛响了，好运在找你呢。',
    '爪印签好了，这份好运不准退给本喵。',
    '这一爪下去，财气是你的，猫条是我的。',
  ],
  koi: [
    '尾巴一摆，这组号码自带幸运光环。',
    '你的愿望我叼住了，这回不许它溜走。',
    '我替你游过龙门，福气给你捎回来了。',
    '这一身金鳞不是白长的，专门替你挡霉运。',
    '我把好运吐成泡泡，一个个往你这儿送。',
    '这组我用尾巴拍过了，锦鲤认证。',
    '别人转发锦鲤，你有锦鲤亲自保佑。',
    '水里捞了半天，给你捞到一兜财运。',
    '我往这组号码里，偷偷多添了两勺幸运。',
    '这波我替你推着，好运顺流到你家。',
    '锦鲤亲自下场，这回一定中个大的。',
    '我的幸运光环借你戴，今天先不还。',
    '尾巴拍三下，霉运全冲走，好运留下来。',
    '这组我施了锦鲤咒，概率翻倍，气势拉满。',
    '许的愿望别撤回，我已经游出去办了。',
    '这身红金战袍一亮，财运不得给点面子？',
    '龙门那边我有熟鱼，替你说两句好话。',
    '专门给你掀个好运浪，接稳，别湿了鞋。',
    '今天的水流听我的，财气全往你这边漂。',
    '我拿满池子的福气，给你这组号码撑腰。',
  ],
}).map(([id, lines]) => [id, Object.freeze(lines)])));

const STORAGE_KEY = 'double-color-machine.dialogue.v1';

export function createMascotVoice({ readStorage = () => null, writeStorage = () => {}, randomIndex = randomInt } = {}) {
  let saved;
  try { saved = JSON.parse(readStorage(STORAGE_KEY)); } catch { /* Dialogue works without storage. */ }
  const characters = Object.fromEntries(Object.entries(MASCOT_LINES).map(([id, lines]) => {
    const record = saved?.version === 1 ? saved.characters?.[id] : null;
    const validIndex = index => Number.isInteger(index) && index >= 0 && index < lines.length;
    const valid = record && validIndex(record.last) && Array.isArray(record.remaining)
      && record.remaining.length < lines.length && record.remaining.every(validIndex)
      && new Set(record.remaining).size === record.remaining.length && !record.remaining.includes(record.last);
    return [id, valid ? { remaining: [...record.remaining], last: record.last } : { remaining: [], last: null }];
  }));

  return {
    next(id) {
      if (!Object.hasOwn(MASCOT_LINES, id)) return null;
      const lines = MASCOT_LINES[id];
      const state = characters[id];
      if (!state.remaining.length) {
        state.remaining = lines.map((_, index) => index);
        for (let i = state.remaining.length - 1; i > 0; i--) {
          const other = randomIndex(i + 1);
          [state.remaining[i], state.remaining[other]] = [state.remaining[other], state.remaining[i]];
        }
        // Avoid an immediate repeat when a fresh cycle starts.
        const end = state.remaining.length - 1;
        if (state.remaining[end] === state.last) {
          [state.remaining[0], state.remaining[end]] = [state.remaining[end], state.remaining[0]];
        }
      }
      state.last = state.remaining.pop();
      try { writeStorage(STORAGE_KEY, JSON.stringify({ version: 1, characters })); } catch { /* Persistence is optional. */ }
      return lines[state.last];
    },
  };
}
