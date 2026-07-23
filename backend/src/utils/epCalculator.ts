import type { CombatStats, EpGainContext } from "../types";

/**
 * 獲得実EPの計算
 * 実EP = 基礎EP * (1 + EP回復効率%)
 */
export function calcActualEp(
  baseEp: number, 
  energyRecoveryRate: number, 
  applyRecoveryRate: boolean = true
): number {
  if (!applyRecoveryRate) return baseEp;
  return baseEp * (1 + energyRecoveryRate);
}

/**
 * 必殺技に必要な要求EP回復効率%を逆算
 * 要求EP効率% = (最大EP / 基礎EPの合計) - 1
 */
export function calcRequiredEnergyRecoveryRate(
  maxEp: number, 
  totalBaseEp: number
): number {
  if (totalBaseEp <= 0) return Infinity;
  return Math.max(0, (maxEp / totalBaseEp) - 1);
}

/**
 * キャラクターにEPを加算し、実獲得量と満タン（必殺技可能）判定を返す
 */
export function addEpToEntity(
  stats: CombatStats, 
  context: EpGainContext
): { addedEp: number; isFull: boolean } {
  const actualEp = calcActualEp(
    context.baseEp, 
    stats.energyRecoveryRate, 
    context.applyRecoveryRate ?? true
  );
  
  stats.ep = Math.min(stats.maxEp, stats.ep + actualEp);
  
  return {
    addedEp: actualEp,
    isFull: stats.ep >= stats.maxEp,
  };
}
