import { BattleEngine } from "./engine/battleEngine";
import { normalDamage } from "./utils/damageCalculation";
import { addEpToEntity } from "./utils/epCalculator";
import type { CombatEntity } from "./types";

// 1. テスト用キャラクター（例：フォフォ）の作成
const huohuo: CombatEntity = {
  id: "char_huohuo",
  name: "フォフォ",
  type: "character",
  actionPoints: 0,
  isCurrentTurn: false,
  statusEffects: [],
  stats: {
    hp: 3500,
    maxHp: 3500,
    atk: 1200,
    def: 1000,
    spd: 120,
    ep: 0,
    maxEp: 140,
    energyRecoveryRate: 0.194, // EP縄 (19.4%)
    cr: 0.05,
    cd: 0.50,
    lv: 80,
  },
};

// 2. テスト用敵ユニットの作成
const enemy: CombatEntity = {
  id: "enemy_01",
  name: "ヴォイドレンジャー",
  type: "enemy",
  actionPoints: 0,
  isCurrentTurn: false,
  statusEffects: [],
  stats: {
    hp: 50000,
    maxHp: 50000,
    atk: 800,
    def: 1000,
    spd: 100,
    ep: 0,
    maxEp: 0,
    energyRecoveryRate: 0,
    cr: 0,
    cd: 0,
    lv: 80,
  },
};

// 3. バトルエンジンの初期化
const engine = new BattleEngine([huohuo, enemy]);

console.log("=== 戦闘シミュレーション開始 ===");

// 4. 戦闘スキル使用によるEP獲得テスト
const epResult = addEpToEntity(huohuo.stats, {
  actionType: "skill",
  baseEp: 30, // スキル使用で基礎EP30を獲得
});

console.log(`${huohuo.name} がスキルを使用！`);
console.log(`獲得実EP: ${epResult.addedEp.toFixed(2)} (現在のEP: ${huohuo.stats.ep.toFixed(2)} / ${huohuo.stats.maxEp})`);

// 5. ダメージ計算のテスト
const dmgResult = normalDamage(huohuo.stats, enemy.stats, {
  ratio: 1.0,
  elementBonus: 0.10,
});

console.log(`${huohuo.name} の攻撃ダメージ: ${dmgResult.actual}`);

// 6. 1ステップ（時間の進行）の実行
engine.step();
