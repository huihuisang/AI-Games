export const RITUALS = Object.freeze([
  { id: 'caishen', name: '财神爷', description: '金手一点，拍胸脯护你财运', buttonLabel: '请财神选一组',
    art: 'assets/mascots/caishen-front.webp', thumbnail: 'assets/mascots/caishen-front-small.webp', eyebrow: '财神爷 · 本神给你撑腰', title: '老板，这组本神罩着',
    seal: '财神护财', token: '元宝' },
  { id: 'future', name: '未来的我', description: '穿越回来，偷偷给你递好运', buttonLabel: '让未来的我来选',
    art: 'assets/mascots/future-front.webp', thumbnail: 'assets/mascots/future-front-small.webp', eyebrow: '未来的我 · 偷偷带点剧透', title: '嘘，好运从未来带来了',
    seal: '未来来信', token: '来信' },
  { id: 'cat', name: '招财猫', description: '招财爪施法，傲娇包票护你', buttonLabel: '让猫猫帮我选',
    art: 'assets/mascots/cat-front.webp', video: 'assets/video/cat-spell.mp4', thumbnail: 'assets/mascots/cat-front-small.webp', eyebrow: '招财猫 · 本喵亲自施法', title: '招财爪启动，接好喵',
    seal: '招财爪印', token: '猫条' },
  { id: 'koi', name: '锦鲤', description: '自带幸运光环，摆尾送你福气', buttonLabel: '请锦鲤选一组',
    art: 'assets/mascots/koi.webp', thumbnail: 'assets/mascots/koi-small.webp', eyebrow: '锦鲤 · 幸运光环借你戴', title: '尾巴一摆，好运冲你来',
    seal: '锦鲤保佑', token: '泡泡' },
  { id: 'direct', name: '随机选号', description: '今天自己挑，不请搭子', buttonLabel: '开始随机选号', art: null },
].map(ritual => Object.freeze(ritual)));

export function restoreRitual(id) {
  return RITUALS.find(ritual => ritual.id === id) ?? RITUALS[0];
}
