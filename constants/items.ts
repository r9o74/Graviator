import { ItemType } from '../types';

// 記録DB用のアイテムキー（DBとの永続的な契約。後から改名しないこと）
// Record<ItemType, string> なので、ItemType に新アイテムを追加してキーを書き忘れるとコンパイルエラーになる
export const ITEM_KEYS: Record<ItemType, string> = {
    [ItemType.MASS_BOOST]: 'MASS_BOOST',
    [ItemType.SATELLITE]: 'SATELLITE',
    [ItemType.INVISIBILITY]: 'INVISIBILITY',
    [ItemType.GRAVITY_WAVE]: 'GRAVITY_WAVE',
    [ItemType.INVERSION]: 'INVERSION',
    [ItemType.REPULSIVE_TRAIL]: 'REPULSIVE_TRAIL',
    [ItemType.CAPTURE]: 'CAPTURE',
    [ItemType.RAMJET]: 'RAMJET',
    [ItemType.HOLE]: 'HOLE',
};

export interface ItemInfo {
    type: ItemType;
    name: string;
    englishName: string;
    desc: string;
}

// アイテムの説明データ（アイテムガイド・アカウントページで共有。表示順もこの順）
export const ITEM_INFOS: ItemInfo[] = [
    { type: ItemType.MASS_BOOST, name: "質量増加", englishName: "MASS BOOST", desc: "質量が大幅に増加し、敵を引き寄せる力が強くなる。" },
    { type: ItemType.SATELLITE, name: "衛星", englishName: "SATELLITE", desc: "周囲に7つの衛星を発射し、近くの敵を自動で迎撃する。" },
    { type: ItemType.INVISIBILITY, name: "透明化", englishName: "STEALTH", desc: "敵から認識されなくなる。一部アイテムの影響も受けなくなる。" },
    { type: ItemType.GRAVITY_WAVE, name: "重力波", englishName: "GRAVITY WAVE", desc: "周囲に強力な重力波を放ち、範囲内の敵を弾き飛ばす。" },
    { type: ItemType.INVERSION, name: "反転", englishName: "REPULSE", desc: "引力を斥力に反転させ、近づく敵を押し返す。" },
    { type: ItemType.REPULSIVE_TRAIL, name: "軌斥", englishName: "REFLECTRAIL", desc: "移動した軌跡に壁判定を残し、触れた敵を弾き返す。" },
    { type: ItemType.CAPTURE, name: "強奪", englishName: "CAPTURE", desc: "接近した敵からアイテム効果を奪い取る。" },
    { type: ItemType.RAMJET, name: "ラムジェット", englishName: "RAMJET", desc: "進路上の敵を吸い込み、後方に吹き飛ばす。" },
    { type: ItemType.HOLE, name: "ブラックホール", englishName: "BLACK HOLE", desc: "全てを巻き込むブラックホールを射出する。" },
];
