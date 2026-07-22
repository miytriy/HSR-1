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
export type EntityType = "character" | "enemy" | "summon" | "memosprite" | "countdown";

export interface CombatStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  ep: number;
  maxEp: number;
  cr: number;      // 会心率 (0.0 ~ 1.0)
  cd: number;      // 会心ダメージ (1.0 ~ 5.0+)
  lv: number;      // キャラクターレベル
}

export interface StatusEffectStack {
  effect: StatusEffect;
  stacks: number;
  turnsRemaining: number;
  appliedBy: {
    charLevel: number;
    breakEffect?: number;
  };
}

export interface SkillContext {
  ratio?: number;
  addDamage?: number;
  defDebuff?: number;
  defIgnore?: number;
  damageBonus?: number;
  resistancePenetration?: number;
  receiveDamageBonus?: number;
  elementBonus?: number;
  crit?: boolean;
  element?: Element;
  defenderResistance?: number;
}

export interface BreakContext extends SkillContext {
  breakpointDamageBase: number;
  breakSpecialEffect?: number;
  toughness?: number;
  enemyType?: EnemyType;
  defenderMaxHp?: number;
}

export interface DamageResult {
  base: number;
  crit: {
    coefficient: number;
    probability: number;
  };
  damageBonus: number;
  defense: number;
  resistance: number;
  receiveDamage: number;
  breakpoint: number;
  actual: number;
  expected: number;
}

export interface BreakpointResult {
  damage: DamageResult;
  statusEffect: StatusEffect | null;
  statusEffectStack?: StatusEffectStack;
}

export interface CombatEntity {
  id: string;
  name: string;
  type: EntityType;
  stats: CombatStats;
  actionPoints: number;        // 現在のアクションポイント (0 ~ 10000)
  isCurrentTurn: boolean;
  ownerId?: string;
  statusEffects: StatusEffectStack[];
  onCountdownExpire?: () => void;
}

export interface InterruptAction {
  id: string;
  entityId: string;
  name: string;
  action: () => void;
}
// --- 既存の型定義が上にある状態 ---

// EP計算や行動定義で新しく使う型を追加・統合
export type ActionType = "basic_attack" | "skill" | "ultimate" | "hit" | "kill" | "talent";

export interface EpGainContext {
  actionType: ActionType;
  baseEp: number;
  applyRecoveryRate?: boolean; // EP回復効率を適用するか（デフォルト: true）
}

// 既存の CombatStats がある場合は、ep や energyRecoveryRate をプロパティに追加/更新してください
export interface CombatStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  ep: number;                  // 現在のEP
  maxEp: number;               // 最大EP (例: フォフォは 140)
  energyRecoveryRate: number;  // EP回復効率 (0.194 = 19.4%)
  cr: number;                  // 会心率
  cd: number;                  // 会心ダメージ
  lv: number;                  // レベル
}

