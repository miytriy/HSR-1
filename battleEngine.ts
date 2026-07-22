import type { CombatEntity, InterruptAction, EntityType } from "./types";

export const MAX_ACTION_POINTS = 10000;

export class BattleEngine {
  private entities: CombatEntity[] = [];
  private interruptQueue: InterruptAction[] = [];
  private currentRound: number = 1;
  private remainingAVInRound: number = 150; // 1ラウンド目は 150 AV

  constructor(entities: CombatEntity[] = []) {
    this.entities = entities;
  }

  /** 残り行動値（AV）の計算 */
  public calcAV(entity: CombatEntity): number {
    if (entity.stats.spd <= 0) return Infinity;
    const remainingAP = MAX_ACTION_POINTS - Math.min(entity.actionPoints, MAX_ACTION_POINTS);
    return remainingAP / entity.stats.spd;
  }

  /** 加速・減速 (速度変化) */
  public applySpeedChange(entity: CombatEntity, newSpd: number): void {
    // 表示用切り捨て前のアクチュアル数値として設定
    entity.stats.spd = Math.max(1, newSpd);
  }

  /** 行動順変化 (早める/遅延) */
  public applyActionAdvance(entity: CombatEntity, percentage: number): void {
    const deltaAP = MAX_ACTION_POINTS * percentage;
    entity.actionPoints = Math.min(MAX_ACTION_POINTS, entity.actionPoints + deltaAP);
  }

  /** 割り込み行動の登録（必殺技等） */
  public addInterrupt(interrupt: InterruptAction): void {
    this.interruptQueue.push(interrupt);
  }

  /** ターン巡回の進行 */
  public step(): void {
    // 1. 割り込み行動が存在する場合優先実行
    if (this.interruptQueue.length > 0) {
      const interrupt = this.interruptQueue.shift()!;
      console.log(`[割り込み実行] ${interrupt.name}`);
      interrupt.action();
      return;
    }

    // 2. 最短AVのユニットを特定
    const sorted = [...this.entities]
      .map(e => ({ entity: e, av: this.calcAV(e) }))
      .sort((a, b) => a.av - b.av);

    if (sorted.length === 0) return;
    const next = sorted[0];
    const advanceAV = next.av;

    // 3. 全ユニットの時間進行とラウンド消費
    if (advanceAV > 0) {
      this.advanceRoundTime(advanceAV);
      for (const e of this.entities) {
        if (!e.isCurrentTurn) e.actionPoints += advanceAV * e.stats.spd;
      }
    }

    // 4. ターンの実行フェーズ
    const actor = next.entity;
    this.runTurnLifecycle(actor);
  }

  /** ターン開始〜行動〜終了のライフサイクル */
  private runTurnLifecycle(entity: CombatEntity): void {
    entity.isCurrentTurn = true;

    if (entity.type === "countdown") {
      console.log(`[カウントダウン終了] ${entity.name}`);
      entity.onCountdownExpire?.();
      entity.isCurrentTurn = false;
      return;
    }

    // ── フェーズ1: ターン開始 ──
    console.log(`--- [ターン開始] ${entity.name} ---`);

    // ── フェーズ2: 行動処理 ──
    entity.actionPoints = 0; // 行動開始時にAPリセット
    console.log(`[行動実行] ${entity.name}`);

    // ── フェーズ3: ターン終了 ──
    console.log(`--- [ターン終了] ${entity.name} ---`);
    entity.isCurrentTurn = false;
  }

  /** ラウンド切り替わり管理 */
  private advanceRoundTime(consumedAV: number): void {
    let remaining = consumedAV;
    while (remaining > 0) {
      if (remaining < this.remainingAVInRound) {
        this.remainingAVInRound -= remaining;
        remaining = 0;
      } else {
        remaining -= this.remainingAVInRound;
        this.currentRound++;
        this.remainingAVInRound = 100; // 2ラウンド目以降は 100 AV
        console.log(`\n==== [第 ${this.currentRound} ラウンド開始] ====`);
      }
    }
  }
}
