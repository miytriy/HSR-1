import express from 'express';
import type { CombatEntity } from './types';
import { BattleEngine } from './engine/battleEngine';
import { normalDamage, breakpointDamage } from './utils/damageCalculation';
import { addEpToEntity } from './utils/epCalculator';
import { createEnemyEntity, BOSS_KAFKA } from './enemies/enemyPresets';

const app = express();
app.use(express.json());

// ホームエンドポイント
app.get('/', (req, res) => {
  res.json({
    message: 'HSR-1 Battle Engine Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      simulate: 'POST /api/battle/simulate',
      damage: 'POST /api/damage/calculate',
    }
  });
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// バトルシミュレーション API
app.post('/api/battle/simulate', (req, res) => {
  try {
    // テスト用キャラクター: フォフォ
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
        energyRecoveryRate: 0.194,
        cr: 0.05,
        cd: 0.50,
        lv: 80,
      },
    };

    // 敵: カフカ
    const enemy = createEnemyEntity(BOSS_KAFKA);

    // バトルエンジン初期化
    const engine = new BattleEngine([huohuo, enemy]);

    // ダメージ計算テスト
    const dmgResult = normalDamage(huohuo.stats, enemy.stats, {
      ratio: 1.0,
      elementBonus: 0.10,
    });

    res.json({
      success: true,
      battle: {
        player: huohuo.name,
        opponent: enemy.name,
        playerLevel: huohuo.stats.lv,
        opponentLevel: enemy.stats.lv,
      },
      damage: {
        actual: dmgResult.actual,
        expected: dmgResult.expected,
        base: dmgResult.base,
        crit: dmgResult.crit,
      },
      message: `${huohuo.name}が${enemy.name}に${dmgResult.actual}のダメージを与えた！`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ダメージ計算 API
app.post('/api/damage/calculate', (req, res) => {
  try {
    const { attackerStats, defenderStats, skillContext } = req.body;

    if (!attackerStats || !defenderStats) {
      return res.status(400).json({
        success: false,
        error: 'attackerStats and defenderStats are required',
      });
    }

    const result = normalDamage(attackerStats, defenderStats, skillContext || {});

    res.json({
      success: true,
      damage: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// エラーハンドリング
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
});
