/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ダメージ計算エンジン
 *
 *  構成:
 *    1. 基礎ダメージ計算 (normalDamage)
 *    2. 付加ダメージ計算 (additionalDamage)
 *    3. 持続ダメージ計算 (dotDamage)
 *    4. 弱点撃破ダメージ計算 (breakpointDamage)
 *    5. 係数群 (会心・与ダメ・防御・属性耐性・被ダメ・撃破)
 *
 *  使用例:
 *    const attacker = { atk: 2000, cr: 0.8, cd: 3.0, ... };
 *    const defender = { def: 400, lv: 80, elementResist: 0.2, ... };
 *    const skillRatio = 1.2;  // 軌跡倍率
 *
 *    const dmg = normalDamage(attacker, defender, skillRatio, 80);
 *    console.log(`期待値ダメージ: ${dmg.expected}`);
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── タイプ定義 ──

export interface CombatStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  maxEp: number;
  cr: number;      // 会心率 (0.0 ~ 1.0)
  cd: number;      // 会心ダメージ (1.0 ~ 5.0+)
  lv: number;      // キャラクターレベル
}

export interface SkillContext {
  ratio?: number;                      // 軌跡倍率 (e.g., 0.8, 1.2)
  addDamage?: number;                  // ダメージ加算
  defDebuff?: number;                  // 防御デバフ (0.0 ~ 1.0)
  defIgnore?: number;                  // 防御無視 (0.0 ~ 1.0)
  damageBonus?: number;                // その他の与ダメージバフ (0.0 ~ 1.0)
  resistancePenetration?: number;      // 耐性貫通 (0.0 ~ 1.0)
  receiveDamageBonus?: number;         // 被ダメージボーナス (0.0 ~ 1.0)
  elementBonus?: number;               // 属性別与ダメージ (0.0 ~ 1.0)
  crit?: boolean;                      // 強制会心 (true時は必ず会心)
}

export interface BreakContext extends SkillContext {
  breakpointDamageBase: number;        // 弱点撃破ダメージ基礎値
  breakSpecialEffect?: number;         // 撃破特効 (0.0 ~ 1.0)
}

export interface DamageResult {
  base: number;                        // ダメージ基礎値
  crit: {
    coefficient: number;               // 会心系数 (1 or 1+cd)
    probability: number;               // 会心率
  };
  damageBonus: number;                 // 与ダメージ係数
  defense: number;                     // 防御係数
  resistance: number;                  // 属性耐性係数
  receiveDamage: number;               // 被ダメージ係数
  breakpoint: number;                  // 撃破係数 (0.9 or 1.0)
  actual: number;                      // 実ダメージ (会心時)
  expected: number;                    // 期待値ダメージ
}

// ════════════════════════════════════════════════════════════════════════════
//  係数計算関数群
// ════════════════════════════════════════════════════════════════════════════

/**
 * 会心係数を計算
 * @param cr 会心率 (0.0 ~ 1.0)
 * @param cd 会心ダメージ
 * @param isCrit 会心が発生したか（true時は 1 + cd、false時は 1）
 * @returns 会心係数 と 確率情報
 */
export function calcCritCoefficient(cr: number, cd: number, isCrit?: boolean) {
  const critCoeff = isCrit ? 1 + cd : 1;
  const expectedCoeff = 1 + cr * cd;

  return {
    actual: critCoeff,        // 1 or (1+cd)
    expected: expectedCoeff,  // 期待値用
    probability: cr,
  };
}

/**
 * 与ダメージ係数を計算
 * @param elementBonus 属性別与ダメージ
 * @param damageBonus その他の与ダメージバフ
 * @returns 与ダメージ係数 (1 + ...)
 */
export function calcDamageBonusCoefficient(
  elementBonus: number = 0,
  damageBonus: number = 0
): number {
  return 1 + elementBonus + damageBonus;
}

/**
 * 防御係数を計算（デフ無視とデフデバフを反映）
 *
 * 敵防御力 = (200 + 10 × 敵Lv) × (1 - 防御デバフ% - 防御無視%)
 * 防御係数 = (20 + 攻撃者Lv) / {敵防御力 + (20 + 攻撃者Lv)}
 *
 * @param attackerLv 攻撃キャラのレベル
 * @param defenderLv 敵のレベル
 * @param defenderDef 敵の基礎防御力
 * @param defDebuff 防御デバフ (0.0 ~ 1.0)
 * @param defIgnore 防御無視 (0.0 ~ 1.0)
 * @returns 防御係数 (0 ~ 1)
 */
export function calcDefenseCoefficient(
  attackerLv: number,
  defenderLv: number,
  defenderDef: number,
  defDebuff: number = 0,
  defIgnore: number = 0
): number {
  // 敵の有効防御力
  const baseEnemyDefense = 200 + 10 * defenderLv;
  const effectiveDefDebuff = Math.min(defDebuff + defIgnore, 0.95); // 最大95%
  const enemyDef = baseEnemyDefense * (1 - effectiveDefDebuff);

  const attackerDefTerm = 20 + attackerLv;
  return attackerDefTerm / (enemyDef + attackerDefTerm);
}

/**
 * 属性耐性係数を計算
 *
 * 属性耐性係数 = 1 - 敵の属性耐性% + 攻撃キャラの耐性貫通%
 *
 * @param defenderResistance 敵の属性耐性 (0.0 ~ 1.0)
 * @param resistancePenetration 耐性貫通 (0.0 ~ 1.0)
 * @returns 属性耐性係数
 */
export function calcResistanceCoefficient(
  defenderResistance: number = 0,
  resistancePenetration: number = 0
): number {
  return Math.max(0.1, 1 - defenderResistance + resistancePenetration);
}

/**
 * 被ダメージ係数を計算
 *
 * @param receiveDamageBonus 被ダメージボーナス (0.0 ~ 1.0+)
 * @returns 被ダメージ係数 (1 + ...)
 */
export function calcReceiveDamageCoefficient(
  receiveDamageBonus: number = 0
): number {
  return 1 + receiveDamageBonus;
}

/**
 * 撃破係数を計算
 *
 * @param isBreakpoint 弱点撃破状態か (true=1.0, false=0.9)
 * @returns 撃破係数
 */
export function calcBreakpointCoefficient(isBreakpoint: boolean = false): number {
  return isBreakpoint ? 1.0 : 0.9;
}

// ════════════════════════════════════════════════════════════════════════════
//  ダメージ基礎値計算
// ════════════════════════════════════════════════════════════════════════════

/**
 * ダメージ基礎値を計算
 *
 * ダメージ基礎値 = 参照ステータス × 軌跡倍率 + ダメージ加算
 *
 * @param referenceStats 参照ステータス値 (通常はATK)
 * @param ratio 軌跡倍率 (e.g., 0.8, 1.2)
 * @param addDamage ダメージ加算値
 * @returns ダメージ基礎値
 */
export function calcDamageBase(
  referenceStats: number,
  ratio: number = 1.0,
  addDamage: number = 0
): number {
  return referenceStats * ratio + addDamage;
}

// ════════════════════════════════════════════════════════════════════════════
//  通常ダメージ計算
// ════════════════════════════════════════════════════════════════════════════

/**
 * 通常ダメージを計算
 *
 * ダメージ = ダメージ基礎値 × 会心係数 × 与ダメージ係数 × 防御係数 ×
 *           属性耐性係数 × 被ダメージ係数 × 撃破係数
 *
 * @param attacker 攻撃者のステータス
 * @param defender 防御者のステータス
 * @param skillContext スキルのコンテキスト
 * @returns ダメージ結果
 */
export function normalDamage(
  attacker: CombatStats,
  defender: CombatStats,
  skillContext: SkillContext = {}
): DamageResult {
  const {
    ratio = 1.0,
    addDamage = 0,
    defDebuff = 0,
    defIgnore = 0,
    damageBonus = 0,
    resistancePenetration = 0,
    receiveDamageBonus = 0,
    elementBonus = 0,
    crit: forceCrit = false,
  } = skillContext;

  // 1. ダメージ基礎値
  const damageBase = calcDamageBase(attacker.atk, ratio, addDamage);

  // 2. 会心係数（実ダメージ用・期待値用）
  const critCoeff = calcCritCoefficient(attacker.cr, attacker.cd, forceCrit);

  // 3. 与ダメージ係数
  const damageCoeff = calcDamageBonusCoefficient(elementBonus, damageBonus);

  // 4. 防御係数
  const defenseCoeff = calcDefenseCoefficient(
    attacker.lv,
    defender.lv,
    defender.def,
    defDebuff,
    defIgnore
  );

  // 5. 属性耐性係数
  const resistanceCoeff = calcResistanceCoefficient(
    0, // defender の属性耐性は context で渡す想定
    resistancePenetration
  );

  // 6. 被ダメージ係数
  const receiveDamageCoeff = calcReceiveDamageCoefficient(receiveDamageBonus);

  // 7. 撃破係数（通常ダメージは 0.9 固定）
  const breakpointCoeff = 0.9;

  // ダメージ計算
  const actualDamage = Math.floor(
    damageBase *
    critCoeff.actual *
    damageCoeff *
    defenseCoeff *
    resistanceCoeff *
    receiveDamageCoeff *
    breakpointCoeff
  );

  const expectedDamage = Math.floor(
    damageBase *
    critCoeff.expected *
    damageCoeff *
    defenseCoeff *
    resistanceCoeff *
    receiveDamageCoeff *
    breakpointCoeff
  );

  return {
    base: damageBase,
    crit: {
      coefficient: critCoeff.actual,
      probability: attacker.cr,
    },
    damageBonus: damageCoeff,
    defense: defenseCoeff,
    resistance: resistanceCoeff,
    receiveDamage: receiveDamageCoeff,
    breakpoint: breakpointCoeff,
    actual: actualDamage,
    expected: expectedDamage,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  付加ダメージ計算
// ════════════════════════════════════════════════════════════════════════════

/**
 * 付加ダメージを計算（凍結・もつれなど）
 *
 * 通常ダメージと同じ計算式だが、靭性を削ることはできない。
 * 会心が発生する。
 *
 * @param attacker 攻撃者のステータス
 * @param defender 防御者のステータス
 * @param skillContext スキルのコンテキスト
 * @returns ダメージ結果
 */
export function additionalDamage(
  attacker: CombatStats,
  defender: CombatStats,
  skillContext: SkillContext = {}
): DamageResult {
  // 付加ダメージは会心発生時=0.9、非会心時も0.9（弱点撃破状態ではない想定）
  const result = normalDamage(attacker, defender, skillContext);
  // breakpoint係数は0.9で既に計算済み
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
//  持続ダメージ計算（DoT: Damage over Time）
// ════════════════════════════════════════════════════════════════════════════

/**
 * 持続ダメージを計算（燃焼・裂創など）
 *
 * 会心が発生しない。
 * ダメージ基礎値と与ダメージ係数はダメージ発生時のステータスが参照される。
 *
 * @param attacker 攻撃者のステータス（付与時）
 * @param defender 防御者のステータス（ダメージ発生時）
 * @param skillContext スキルのコンテキスト
 * @returns ダメージ結果（会心なし）
 */
export function dotDamage(
  attacker: CombatStats,
  defender: CombatStats,
  skillContext: SkillContext = {}
): DamageResult {
  const {
    ratio = 1.0,
    addDamage = 0,
    defDebuff = 0,
    defIgnore = 0,
    damageBonus = 0,
    resistancePenetration = 0,
    receiveDamageBonus = 0,
    elementBonus = 0,
  } = skillContext;

  // 1. ダメージ基礎値（ダメージ発生時のステータスで計算）
  const damageBase = calcDamageBase(attacker.atk, ratio, addDamage);

  // 2. 会心係数（持続ダメージは会心なし）
  const critCoeff = 1.0;

  // 3. 与ダメージ係数
  const damageCoeff = calcDamageBonusCoefficient(elementBonus, damageBonus);

  // 4. 防御係数
  const defenseCoeff = calcDefenseCoefficient(
    attacker.lv,
    defender.lv,
    defender.def,
    defDebuff,
    defIgnore
  );

  // 5. 属性耐性係数
  const resistanceCoeff = calcResistanceCoefficient(0, resistancePenetration);

  // 6. 被ダメージ係数
  const receiveDamageCoeff = calcReceiveDamageCoefficient(receiveDamageBonus);

  // 7. 撃破係数（持続ダメージは 0.9）
  const breakpointCoeff = 0.9;

  const actualDamage = Math.floor(
    damageBase *
    critCoeff *
    damageCoeff *
    defenseCoeff *
    resistanceCoeff *
    receiveDamageCoeff *
    breakpointCoeff
  );

  return {
    base: damageBase,
    crit: {
      coefficient: critCoeff,
      probability: 0,
    },
    damageBonus: damageCoeff,
    defense: defenseCoeff,
    resistance: resistanceCoeff,
    receiveDamage: receiveDamageCoeff,
    breakpoint: breakpointCoeff,
    actual: actualDamage,
    expected: actualDamage, // 会心がないので期待値=実値
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  弱点撃破ダメージ計算
// ════════════════════════════════════════════════════════════════════════════

/**
 * 弱点撃破ダメージを計算
 *
 * 弱点撃破ダメージ = 弱点撃破ダメージ基礎値 × (1 + 撃破特効) × 防御係数 ×
 *                  属性耐性係数 × 被ダメージ係数 × 撃破係数
 *
 * 撃破係数は 1.0（弱点撃破状態）を使用。
 *
 * @param breakContext 弱点撃破のコンテキスト
 * @param attacker 攻撃者のステータス
 * @param defender 防御者のステータス
 * @returns ダメージ結果
 */
export function breakpointDamage(
  attacker: CombatStats,
  defender: CombatStats,
  breakContext: BreakContext = {}
): DamageResult {
  const {
    breakpointDamageBase,
    breakSpecialEffect = 0,
    defDebuff = 0,
    defIgnore = 0,
    resistancePenetration = 0,
    receiveDamageBonus = 0,
    elementBonus = 0,
  } = breakContext;

  // 1. 弱点撃破ダメージ基礎値 × (1 + 撃破特効)
  const damageBase = breakpointDamageBase * (1 + breakSpecialEffect);

  // 2. 会心係数なし
  const critCoeff = 1.0;

  // 3. 与ダメージ係数（elementBonusのみ）
  const damageCoeff = 1 + elementBonus;

  // 4. 防御係数
  const defenseCoeff = calcDefenseCoefficient(
    attacker.lv,
    defender.lv,
    defender.def,
    defDebuff,
    defIgnore
  );

  // 5. 属性耐性係数
  const resistanceCoeff = calcResistanceCoefficient(0, resistancePenetration);

  // 6. 被ダメージ係数
  const receiveDamageCoeff = calcReceiveDamageCoefficient(receiveDamageBonus);

  // 7. 撃破係数（弱点撃破は 1.0）
  const breakpointCoeff = 1.0;

  const actualDamage = Math.floor(
    damageBase *
    critCoeff *
    damageCoeff *
    defenseCoeff *
    resistanceCoeff *
    receiveDamageCoeff *
    breakpointCoeff
  );

  return {
    base: damageBase,
    crit: {
      coefficient: critCoeff,
      probability: 0,
    },
    damageBonus: damageCoeff,
    defense: defenseCoeff,
    resistance: resistanceCoeff,
    receiveDamage: receiveDamageCoeff,
    breakpoint: breakpointCoeff,
    actual: actualDamage,
    expected: actualDamage,
  };
}

// ════════════════════════════════════════════════════════════════════════════
//  デバッグ・テスト用ユーティリティ
// ════════════════════════════════════════════════════════════════════════════

/**
 * ダメージ結果を整形表示
 */
export function formatDamageResult(result: DamageResult, label: string = ""): string {
  const lines = [
    label && `【${label}】`,
    `  基礎値: ${result.base.toFixed(1)}`,
    `  会心係数: ${result.crit.coefficient.toFixed(3)} (確率: ${(result.crit.probability * 100).toFixed(1)}%)`,
    `  与ダメ係数: ${result.damageBonus.toFixed(3)}`,
    `  防御係数: ${result.defense.toFixed(3)}`,
    `  耐性係数: ${result.resistance.toFixed(3)}`,
    `  被ダメ係数: ${result.receiveDamage.toFixed(3)}`,
    `  撃破係数: ${result.breakpoint.toFixed(3)}`,
    `  実ダメージ: ${result.actual}`,
    `  期待値: ${result.expected}`,
  ].filter(Boolean);

  return lines.join("\n");
}

/**
 * ダメージ計算をシミュレーション表示
 */
export function simulateDamage(
  attacker: CombatStats,
  defender: CombatStats,
  skillContext: SkillContext = {}
) {
  const normal = normalDamage(attacker, defender, skillContext);
  console.log(formatDamageResult(normal, "通常ダメージ"));
  console.log("");
}
