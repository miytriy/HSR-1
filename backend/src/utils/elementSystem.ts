/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  属性・状態異常システム
 *
 *  構成:
 *    1. 属性タイプ定義
 *    2. 弱点撃破ダメージ基礎値計算（属性別）
 *    3. 状態異常定義と計算ロジック
 *    4. 状態異常の持続・付加ダメージ
 *
 *  属性: 物理・炎・氷・雷・風・量子・虚数（7種）
 *  状態異常: 裂創・燃焼・凍結・感電・風化・もつれ・禁錮（7種）
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── 属性・状態異常 列挙型 ──

export type Element = "physical" | "fire" | "ice" | "lightning" | "wind" | "quantum" | "imaginary";

export type StatusEffect = 
  | "bleed"          // 裂創（物理）
  | "burn"           // 燃焼（炎）
  | "freeze"         // 凍結（氷）
  | "shock"          // 感電（雷）
  | "decay"          // 風化（風）
  | "entanglement"   // もつれ（量子）
  | "imprisonment";  // 禁錮（虚数）

export type EnemyType = "normal" | "elite" | "boss";

// ── 定数 ──

/**
 * 属性別の弱点撃破ダメージ基礎値係数
 * ダメージ = 係数 × キャラLv毎の固有値 × 靭性係数
 */
export const BREAKPOINT_DAMAGE_MULTIPLIERS: Record<Element, number> = {
  physical: 2.0,
  fire: 2.0,
  ice: 1.0,
  lightning: 1.0,
  wind: 1.5,
  quantum: 0.5,
  imaginary: 0.5,
};

/**
 * 属性別の状態異常タイプ
 */
export const ELEMENT_STATUS_MAP: Record<Element, StatusEffect> = {
  physical: "bleed",
  fire: "burn",
  ice: "freeze",
  lightning: "shock",
  wind: "decay",
  quantum: "entanglement",
  imaginary: "imprisonment",
};

// ── 状態異常の定義 ──

export interface StatusEffectDefinition {
  name: string;
  element: Element;
  duration: number;              // ターン数
  baseFormula: {
    type: "max_hp" | "level_based" | "stack_based" | "none";
    ratio?: number;              // 係数
    bossPenalty?: number;         // ボス時のペナルティ
    defenseScaling?: boolean;     // 靭性係数を適用するか
  };
  effects: {
    desc: string;
    delayPercentage?: number;     // 行動遅延（%）
    defenseDebuff?: number;       // 防御デバフ
    speedDebuff?: number;         // 速度デバフ
  };
}

export const STATUS_EFFECT_DEFINITIONS: Record<StatusEffect, StatusEffectDefinition> = {
  // 物理: 裂創（2ターン持続）
  bleed: {
    name: "裂創",
    element: "physical",
    duration: 2,
    baseFormula: {
      type: "max_hp",
      ratio: 0.16,               // 通常敵: 0.16×敵の最大HP
      bossPenalty: 0.07,         // ボス: 0.07×敵の最大HP
      defenseScaling: true,       // 上限: 2×Lv毎×靭性係数
    },
    effects: {
      desc: "持続ダメージは 2×キャラLv毎の固有値×靭性係数 が上限",
    },
  },

  // 炎: 燃焼（2ターン持続）
  burn: {
    name: "燃焼",
    element: "fire",
    duration: 2,
    baseFormula: {
      type: "level_based",
      ratio: 1.0,                // 1×Lv毎の固有値
      defenseScaling: false,
    },
    effects: {
      desc: "追加効果なし",
    },
  },

  // 氷: 凍結（1ターン持続）
  freeze: {
    name: "凍結",
    element: "ice",
    duration: 1,
    baseFormula: {
      type: "level_based",
      ratio: 1.0,                // 1×Lv毎の固有値
      defenseScaling: false,
    },
    effects: {
      desc: "凍結解除時、対象の現在のターンをスキップし、次のターンを50%進める",
    },
  },

  // 雷: 感電（2ターン持続）
  shock: {
    name: "感電",
    element: "lightning",
    duration: 2,
    baseFormula: {
      type: "level_based",
      ratio: 2.0,                // 2×Lv毎の固有値
      defenseScaling: false,
    },
    effects: {
      desc: "追加効果なし",
    },
  },

  // 風: 風化（2ターン持続、スタック制）
  decay: {
    name: "風化",
    element: "wind",
    duration: 2,
    baseFormula: {
      type: "stack_based",
      ratio: 1.0,                // 1×スタック数×Lv毎の固有値
      defenseScaling: false,
    },
    effects: {
      desc: "通常敵に1スタック、精鋭/ボスに3スタック付与（最大5）",
    },
  },

  // 量子: もつれ（1ターン持続、スタック制）
  entanglement: {
    name: "もつれ",
    element: "quantum",
    duration: 1,
    baseFormula: {
      type: "stack_based",
      ratio: 0.6,                // 0.6×スタック数×Lv毎の固有値×靭性係数
      defenseScaling: true,
    },
    effects: {
      delayPercentage: 20,       // 行動順20%遅延（撃破特効で強化）
      desc: "行動順を20%×(1+撃破特効)遅延。ヒット時に1スタック付与（最大5）",
    },
  },

  // 虚数: 禁錮（1ターン持続）
  imprisonment: {
    name: "禁錮",
    element: "imaginary",
    duration: 1,
    baseFormula: {
      type: "none",              // ダメージなし
    },
    effects: {
      delayPercentage: 30,       // 行動順30%遅延（撃破特効で強化）
      speedDebuff: -0.10,        // 速度-10%
      desc: "行動順を30%×(1+撃破特効)遅延。速度-10%",
    },
  },
};

// ── インターフェース ──

export interface StatusEffectStack {
  effect: StatusEffect;
  stacks: number;                // スタック数（デフォルト1、風化/もつれは複数）
  turnsRemaining: number;        // 残りターン数
  appliedBy: {
    charLevel: number;
    breakEffect?: number;        // 撃破特効
  };
}

export interface ElementalContext {
  element: Element;
  defenderElement?: Element;     // 敵の属性（耐性用）
  defenderResistance?: number;   // 敵の属性耐性（0.0 ~ 1.0）
  penetration?: number;          // 耐性貫通（0.0 ~ 1.0）
}

export interface BreakpointElementContext extends ElementalContext {
  charLevel: number;
  toughness: number;             // 靭性係数
  breakSpecialEffect?: number;   // 撃破特効
}

// ═══════════════════════════════════════════════════════════════════════════
//  弱点撃破ダメージ基礎値計算（属性別）
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 属性別の弱点撃破ダメージ基礎値を計算
 *
 * 基本: 属性係数 × キャラLv毎の固有値 × 靭性係数
 *
 * @param element 属性
 * @param charLevel キャラクターレベル
 * @param uniqueValuePerLevel Lvごとの固有値（例: ATKの一部）
 * @param toughness 靭性係数（0.9 ~ 1.0）
 * @returns 弱点撃破ダメージ基礎値
 */
export function calcBreakpointDamageBase(
  element: Element,
  charLevel: number,
  uniqueValuePerLevel: number,
  toughness: number = 1.0
): number {
  const multiplier = BREAKPOINT_DAMAGE_MULTIPLIERS[element];
  return multiplier * charLevel * uniqueValuePerLevel * toughness;
}

// ═══════════════════════════════════════════════════════════════════════════
//  状態異常ダメージ基礎値計算
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 状態異常の持続/付加ダメージ基礎値を計算
 *
 * @param effect 状態異常タイプ
 * @param attackerLevel 付与者のレベル
 * @param defenderMaxHp 敵の最大HP（裂創用）
 * @param stacks スタック数（風化・もつれ用）
 * @param enemyType 敵のタイプ（ボス時の係数調整用）
 * @param toughness 靭性係数（裂創・もつれ用）
 * @returns 状態異常ダメージ基礎値
 */
export function calcStatusEffectDamageBase(
  effect: StatusEffect,
  attackerLevel: number,
  defenderMaxHp: number = 0,
  stacks: number = 1,
  enemyType: EnemyType = "normal",
  toughness: number = 1.0
): number {
  const def = STATUS_EFFECT_DEFINITIONS[effect];
  const formula = def.baseFormula;

  let base = 0;

  switch (formula.type) {
    case "max_hp":
      // 裂創: 通常0.16×最大HP、ボス0.07×最大HP
      const ratio = enemyType === "boss" ? (formula.bossPenalty ?? 0.07) : (formula.ratio ?? 0.16);
      base = defenderMaxHp * ratio;
      // 上限: 2×Lv毎×靭性係数
      if (formula.defenseScaling) {
        const cap = 2 * attackerLevel * toughness;
        base = Math.min(base, cap);
      }
      break;

    case "level_based":
      // 燃焼・凍結・感電: ratio×Lv毎の固有値
      // ここでは簡略版: ratio × attackerLevel（実装時はLv毎の固有値を引数で受け取る想定）
      base = (formula.ratio ?? 1.0) * attackerLevel;
      break;

    case "stack_based":
      // 風化・もつれ: ratio×スタック数×Lv毎の固有値
      base = (formula.ratio ?? 1.0) * stacks * attackerLevel;
      if (formula.defenseScaling) {
        base *= toughness;  // もつれは靭性係数を適用
      }
      break;

    case "none":
      // 禁錮: ダメージなし
      base = 0;
      break;
  }

  return Math.floor(base);
}

// ═══════════════════════════════════════════════════════════════════════════
//  状態異常スタック・管理ロジック
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 状態異常を適用（新規または既存スタックに追加）
 *
 * @param currentEffects 現在の状態異常一覧
 * @param newEffect 新しく適用する状態異常
 * @param charLevel 付与者のレベル
 * @param enemyType 敵のタイプ（付与スタック数決定用）
 * @param breakEffect 撃破特効（オプション）
 * @returns 更新された状態異常リスト
 */
export function applyStatusEffect(
  currentEffects: StatusEffectStack[],
  newEffect: StatusEffect,
  charLevel: number,
  enemyType: EnemyType = "normal",
  breakEffect: number = 0
): StatusEffectStack[] {
  const def = STATUS_EFFECT_DEFINITIONS[newEffect];
  const existing = currentEffects.find(e => e.effect === newEffect);

  // スタック数の決定（風化・もつれなど）
  let stacksToAdd = 1;
  if (newEffect === "decay") {
    stacksToAdd = enemyType === "boss" ? 3 : 1;
  }
  // もつれはヒット時に1スタック（呼び出し元で制御）

  if (existing) {
    // 既に状態異常がある場合、スタック追加（最大5）
    existing.stacks = Math.min(existing.stacks + stacksToAdd, 5);
    existing.turnsRemaining = def.duration;
    existing.appliedBy.breakEffect = breakEffect;
  } else {
    // 新規追加
    currentEffects.push({
      effect: newEffect,
      stacks: stacksToAdd,
      turnsRemaining: def.duration,
      appliedBy: { charLevel, breakEffect },
    });
  }

  return currentEffects;
}

/**
 * 状態異常の行動遅延を計算
 *
 * @param effect 状態異常
 * @param breakEffect 撃破特効
 * @returns 行動遅延の割合（0.0 ~ 1.0）
 */
export function calcStatusEffectDelay(
  effect: StatusEffect,
  breakEffect: number = 0
): number {
  const def = STATUS_EFFECT_DEFINITIONS[effect];
  if (!def.effects.delayPercentage) return 0;
  return def.effects.delayPercentage / 100 * (1 + breakEffect);
}

/**
 * 状態異常の防御デバフを取得
 */
export function getStatusEffectDefenseDebuff(effect: StatusEffect): number {
  const def = STATUS_EFFECT_DEFINITIONS[effect];
  return def.effects.defenseDebuff ?? 0;
}

/**
 * 状態異常の速度デバフを取得
 */
export function getStatusEffectSpeedDebuff(effect: StatusEffect): number {
  const def = STATUS_EFFECT_DEFINITIONS[effect];
  return def.effects.speedDebuff ?? 0;
}

// ═══════════════════════════════════════════════════════════════════════════
//  属性耐性係数計算（damageCalculation.tsと統合用）
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 属性耐性係数を計算（elementalContext対応版）
 *
 * 属性耐性係数 = 1 - 敵の属性耐性% + 耐性貫通%
 *
 * @param defenderResistance 敵の属性耐性
 * @param penetration 耐性貫通
 * @returns 属性耐性係数（最小0.1）
 */
export function calcElementalResistanceCoefficient(
  defenderResistance: number = 0,
  penetration: number = 0
): number {
  return Math.max(0.1, 1 - defenderResistance + penetration);
}

// ═══════════════════════════════════════════════════════════════════════════
//  ユーティリティ・デバッグ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 属性名を日本語で取得
 */
export function getElementName(element: Element): string {
  const names: Record<Element, string> = {
    physical: "物理",
    fire: "炎",
    ice: "氷",
    lightning: "雷",
    wind: "風",
    quantum: "量子",
    imaginary: "虚数",
  };
  return names[element];
}

/**
 * 状態異常の説明を取得
 */
export function getStatusEffectInfo(effect: StatusEffect): string {
  const def = STATUS_EFFECT_DEFINITIONS[effect];
  return `${def.name}(${def.duration}T): ${def.effects.desc}`;
}

/**
 * 状態異常一覧を整形表示
 */
export function formatStatusEffects(effects: StatusEffectStack[]): string {
  if (effects.length === 0) return "状態異常なし";
  return effects
    .map(
      e =>
        `${STATUS_EFFECT_DEFINITIONS[e.effect].name}` +
        (e.stacks > 1 ? `(${e.stacks}stack)` : "") +
        `[${e.turnsRemaining}T]`
    )
    .join(", ");
}
