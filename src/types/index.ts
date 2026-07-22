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

