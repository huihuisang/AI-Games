export const RITUALS = Object.freeze([
  { id: 'caishen', name: '请财神', description: '元宝送福，开个好头', buttonLabel: '请财神开奖',
    art: 'assets/ritual-caishen.svg', eyebrow: '财神专程来一趟', title: '把福气，交到你手上',
    caption: '接住这份好心情，准备开个好头。', seal: '福气到账', token: '元宝' },
  { id: 'future', name: '来自未来的我', description: '明天的你，捎来一封信', buttonLabel: '请未来的我开奖',
    art: 'assets/ritual-future.svg', eyebrow: '收到一封未来来信', title: '未来的我，说放心去试',
    caption: '“好好生活呀，接下来交给现在的你。”', seal: '未来已签收', token: '来信' },
  { id: 'cat', name: '招财猫', description: '挥挥小爪，好心情报到', buttonLabel: '请招财猫开奖',
    art: 'assets/ritual-cat.svg', eyebrow: '小爪一挥，烦恼退退', title: '喵，把好心情招过来',
    caption: '今天也要像猫一样，轻松一点。', seal: '接住好运', token: '金币' },
  { id: 'koi', name: '锦鲤', description: '轻轻一跃，愿望泛起涟漪', buttonLabel: '请锦鲤开奖',
    art: 'assets/ritual-koi.svg', eyebrow: '有一条锦鲤，正游向你', title: '小小心愿，跃出水面',
    caption: '愿今天，有件让你嘴角上扬的小事。', seal: '好事发生', token: '心愿' },
  { id: 'direct', name: '直接摇奖', description: '今天靠自己', buttonLabel: '开始摇奖', art: null },
].map(ritual => Object.freeze(ritual)));

export function restoreRitual(id) {
  return RITUALS.find(ritual => ritual.id === id) ?? RITUALS[0];
}
