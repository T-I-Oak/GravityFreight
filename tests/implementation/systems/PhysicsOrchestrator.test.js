/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { PhysicsOrchestrator } from '../../../GravityFreight/src/systems/PhysicsOrchestrator.js';
import { setupStandardDOM } from '../../test-utils.js';
import { Vector2 } from '../../../GravityFreight/src/utils/Physics.js';

// TitleAnimation のモック化 (描画エラー防止)
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
        destroy() {}
        resize() {}
    }
}));

describe('PhysicsOrchestrator', () => {
    let game;
    let system;

    beforeEach(() => {
        setupStandardDOM();
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        game = new Game(canvas, {});
        system = game.physicsOrchestrator;
        game.homeStar = { position: new Vector2(400, 300), radius: 50 };
    });

    it('should synchronize prediction points with returnBonus', () => {
        game.state = 'aiming';
        game.selection.rocket = { mass: 10, totalPrecision: 10, gravityMultiplier: 1.0 };
        game.selection.launcher = { power: 1000 };
        
        // 1. ボーナスなしの状態での予測地点
        game.returnBonus = 0;
        const points1 = system.getPredictionPoints();
        
        // 2. ボーナスあり (+100% = 2倍)
        game.returnBonus = 1.0;
        const points2 = system.getPredictionPoints();
        
        // 初速が違うため、2点目（インデックス1）の座標が異なるはず
        expect(points2[1].y).not.toBe(points1[1].y);
        
        // 上方向 (-PI/2) への発射なので、y座標がより負の方向へ進んでいるはず
        expect(points2[1].y).toBeLessThan(points1[1].y);
    });
});
