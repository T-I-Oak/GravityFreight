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
        game.audioSystem = {
            playReturn: vi.fn(),
            playCrash: vi.fn(),
            playTick: vi.fn(),
            updateFlightSound: vi.fn()
        };
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

    it('Impact Cushion should NOT bounce on Home Star (allow landing)', () => {
        // オブジェクト参照の整合性を保証
        const homeStar = game.homeStar;
        homeStar.position = new Vector2(400, 300);
        homeStar.radius = 50;
        homeStar.isHome = true;
        game.bodies = [homeStar];
        
        const mockCushion = { id: 'mod_cushion', charges: 1, maxCharges: 3 };
        game.ship = {
            position: new Vector2(400, 330), // 半径50の中（中心300から距離30）に配置
            velocity: new Vector2(0, 50),
            mass: 10,
            isSafeToReturn: true,
            equippedModules: [mockCushion],
            trail: []
        };
        
        // 1. まず findBodyCollision が正しく homeStar を検知するか確認
        const hitBody = game.physicsOrchestrator.findBodyCollision(game.ship.position, game.ship.position, true);
        expect(hitBody).toBe(homeStar);
        
        // 2. 衝突処理（回避モジュールのバイパス）を検証
        // スパイだけでなく、確実に値を書き換えるモック実装を入れる
        const spy = vi.spyOn(game, 'resolveItems').mockImplementation((res) => {
            game.flightResults.status = res;
        });
        
        game.physicsOrchestrator.checkCollisions(game.ship.position);
        
        // 結果を確認
        expect(spy).toHaveBeenCalledWith('returned');
        expect(game.flightResults.status).toBe('returned');
        expect(mockCushion.charges).toBe(1); // 母星ではバウンドしない（減らない）
    });

    it('Impact Cushion should still work (bounce and consume charge) on regular stars', () => {
        // 通常の星のセットアップ
        const regularStar = { position: new Vector2(200, 200), radius: 30, isHome: false };
        game.bodies = [regularStar];
        
        const mockCushion = { id: 'mod_cushion', charges: 1, maxCharges: 3 };
        game.ship = {
            position: new Vector2(200, 231), // 半径30 + マージン(2.5) 以内に入って衝突
            velocity: new Vector2(0, -50), // 星に向かって進む
            mass: 10,
            isSafeToReturn: true,
            equippedModules: [mockCushion],
            trail: []
        };
        
        // 衝突判定と回避実行
        game.physicsOrchestrator.checkCollisions(game.ship.position);
        
        // 結果を確認: 
        // 1. 状態が finishing にならず、航行が継続している（バウンド成功）
        // 2. クッションの耐久値が減っている
        expect(game.state).not.toBe('finishing');
        expect(mockCushion.charges).toBe(0); // バウンドして消費された
    });
});
