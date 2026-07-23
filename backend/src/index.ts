import { BattleEngine } from "./engine/battleEngine";
import { normalDamage } from "./utils/damageCalculation";
import { addEpToEntity } from "./utils/epCalculator";
import { createEnemyEntity, BOSS_KAFKA } from "./enemies/enemyPresets";
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

// 2. 敵ユニットの生成（敵プリセットからボス「カフカ」を呼び出し！）
const enemy = createEnemyEntity(BOSS_KAFKA);

// 3. バトルエンジンの初期化（フォフォ vs カフカ）
const engine = new BattleEngine([huohuo, enemy]);

console.log("=== 戦闘シミュレーション開始 ===");
console.log(`対戦カード: ${huohuo.name} (Lv.${huohuo.stats.lv}) VS ${enemy.name} (Lv.${enemy.stats.lv})`);

// 4. 戦闘スキル使用によるEP獲得テスト
const epResult = addEpToEntity(huohuo.stats, {
  actionType: "skill",
  baseEp: 30, // スキル使用で基礎EP30を獲得
});

console.log(`\n[行動] ${huohuo.name} が戦闘スキルを使用！`);
console.log(`獲得実EP: ${epResult.addedEp.toFixed(2)} (現在のEP: ${huohuo.stats.ep.toFixed(2)} / ${huohuo.stats.maxEp})`);

// 5. ダメージ計算のテスト
const dmgResult = normalDamage(huohuo.stats, enemy.stats, {
  ratio: 1.0,
  elementBonus: 0.10,
});

console.log(`\n[ダメージ計算] ${huohuo.name} が ${enemy.name} に攻撃！`);
console.log(`与えたダメージ: ${dmgResult.actual}`);

// 6. 1ステップ（行動順・タイムラインの進行）
console.log("\n[タイムライン進行]");
engine.step();
