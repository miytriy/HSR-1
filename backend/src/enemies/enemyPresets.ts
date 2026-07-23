import type { CombatEntity, Element, EnemyType } from "../types";

export interface EnemyConfig {
  id: string;
  name: string;
  enemyType: EnemyType;
  level: number;
  maxHp: number;
  def: number;
  spd: number;
  weaknesses: Element[];       // 弱点属性リスト
  elementResistances: Partial<Record<Element, number>>; // 属性耐性 (例: 0.2 = 20%)
}

/**
 * 敵の CombatEntity を生成するファクトリー関数
 */
export function createEnemyEntity(config: EnemyConfig): CombatEntity {
  return {
    id: config.id,
    name: config.name,
    type: "enemy",
    actionPoints: 0,
    isCurrentTurn: false,
    statusEffects: [],
    stats: {
      hp: config.maxHp,
      maxHp: config.maxHp,
      atk: 1000,
      def: config.def,
      spd: config.spd,
      ep: 0,
      maxEp: 0,
      energyRecoveryRate: 0,
      cr: 0,
      cd: 0,
      lv: config.level,
    },
  };
}

// ─────────────────────────────────────────────
// 敵のプリセットデータ（Lv.80想定）
// ─────────────────────────────────────────────

/** 1. 通常敵: ヴォイドレンジャー・レスサー */
export const VOID_RANGER_LESSER: EnemyConfig = {
  id: "enemy_void_ranger_01",
  name: "ヴォイドレンジャー・レスサー",
  enemyType: "normal",
  level: 80,
  maxHp: 35000,
  def: 1000,
  spd: 120,
  weaknesses: ["physical", "wind"],
  elementResistances: {
    physical: 0.0,
    wind: 0.0,
    fire: 0.2, // 弱点以外は基本的に耐性20%
    ice: 0.2,
    lightning: 0.2,
    quantum: 0.2,
    imaginary: 0.2,
  },
};

/** 2. 精鋭敵: 宇宙からの炎 */
export const BLAZE_OUT_OF_SPACE: EnemyConfig = {
  id: "enemy_blaze_01",
  name: "宇宙からの炎",
  enemyType: "elite",
  level: 80,
  maxHp: 250000,
  def: 1000,
  spd: 144,
  weaknesses: ["physical", "ice", "quantum"],
  elementResistances: {
    fire: 0.6, // 炎耐性 60%
    physical: 0.0,
    ice: 0.0,
    quantum: 0.0,
    lightning: 0.2,
    wind: 0.2,
    imaginary: 0.2,
  },
};

/** 3. ボス敵: カフカ */
export const BOSS_KAFKA: EnemyConfig = {
  id: "boss_kafka_01",
  name: "カフカ",
  enemyType: "boss",
  level: 80,
  maxHp: 800000,
  def: 1000,
  spd: 158,
  weaknesses: ["physical", "wind", "imaginary"],
  elementResistances: {
    lightning: 0.4, // 雷耐性 40%
    physical: 0.0,
    wind: 0.0,
    imaginary: 0.0,
    fire: 0.2,
    ice: 0.2,
    quantum: 0.2,
  },
};
