/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../GravityFreight/src/core/Game.js';
import { setupStandardDOM } from '../test-utils.js';

// TitleAnimation のモック化 (Canvasエラー防止)
vi.mock('../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
        destroy() {}
        resize() {}
    }
}));

describe('Spec 09: Return Bonus', () => {
    let game;
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        setupStandardDOM();
        vi.clearAllMocks();
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        game = new Game(canvas, mockUI);
    });

    it('should increment returnBonus factor on each Mother Star return', () => {
        // 初期状態はボーナスなし (x1.0)
        expect(game.returnBonus).toBe(0);

        // 1回目の母星帰還
        game.missionSystem.resolveItems('returned');
        expect(game.returnBonus).toBeCloseTo(0.1);

        // 2回目の母星帰還
        game.missionSystem.resolveItems('returned');
        expect(game.returnBonus).toBeCloseTo(0.2);
    });

    it('should maintain returnBonus after Crashed or Lost results', () => {
        game.returnBonus = 0.2;

        // 衝突 (Crashed)
        game.missionSystem.resolveItems('crashed');
        expect(game.returnBonus).toBe(0.2);

        // 遭難 (Lost)
        game.missionSystem.resolveItems('lost');
        expect(game.returnBonus).toBe(0.2);
    });

    it('should reset returnBonus to zero when successfully completing a sector', () => {
        game.returnBonus = 0.3;
        
        // ミッション成功 (次セクターへ進出)
        // closeEvent はセクターの切り替えを想定
        game.facilityEventSystem.closeEvent();
        
        expect(game.returnBonus).toBe(0);
    });

    it('should synchronize prediction points with the current returnBonus', () => {
        game.state = 'aiming';
        game.selection.rocket = { mass: 10, totalPrecision: 100 };
        game.selection.launcher = { power: 1000 };
        
        // ボーナスがない場合の予測地点の最初の座標
        const pointsNoBonus = game.physicsOrchestrator.getPredictionPoints();
        
        // ボーナス付与 (+100% などの極端な値)
        game.returnBonus = 1.0;
        const pointsWithBonus = game.physicsOrchestrator.getPredictionPoints();
        
        // パワーが変わるので、2点目以降の座標が異なるはず（初速が変わるため）
        expect(pointsWithBonus[1].y).not.toBe(pointsNoBonus[1].y);
    });
});
