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

    it('Impact Cushion should NOT work and ship should crash when charges are 0', () => {
        // 通常の星のセットアップ
        const regularStar = { position: new Vector2(200, 200), radius: 30, isHome: false };
        game.bodies = [regularStar];
        
        // 耐久値 0 のクッション
        const mockCushion = { id: 'mod_cushion', charges: 0, maxCharges: 3 };
        game.ship = {
            position: new Vector2(200, 231), // 衝突圏内
            velocity: new Vector2(0, -50),
            mass: 10,
            isSafeToReturn: true,
            equippedModules: [mockCushion],
            trail: []
        };
        
        // 衝突判定を実行
        game.physicsOrchestrator.checkCollisions(game.ship.position);
        
        // 結果を確認: 
        // 1. 回避が発動せず、ゲーム状態が finishing になっている（衝突）
        // 2. 耐久値は 0 のまま
        expect(game.state).toBe('finishing');
        expect(game.finishResult).toBe('crashed');
        expect(mockCushion.charges).toBe(0);
    });
    describe('Gravity Scaling (v0.35)', () => {
        it('should calculate gravity constant correctly based on sector', () => {
            // Sector 1: Baseline (100%)
            game.sector = 1;
            expect(system.getCurrentGravityConstant()).toBe(4000);

            // Sector 2: +2% (4080)
            game.sector = 2;
            expect(system.getCurrentGravityConstant()).toBe(4080);

            // Sector 6: +10% (4400)
            game.sector = 6;
            expect(system.getCurrentGravityConstant()).toBe(4400);
        });

        it('getPredictionPoints should use scaled gravity by default', () => {
            game.state = 'aiming';
            game.selection.rocket = { mass: 10, totalPrecision: 100, gravityMultiplier: 1.0, modules: [] };
            game.selection.launcher = { power: 1000 };
            game.homeStar = { position: new Vector2(400, 300), radius: 25 };
            game.bodies = [{ position: new Vector2(450, 200), mass: 2000, radius: 20, gravityMultiplier: 1.0 }];

            // Sector 1
            game.sector = 1;
            const points1 = system.getPredictionPoints();

            // Sector 11 (+20% gravity)
            game.sector = 11;
            const points11 = system.getPredictionPoints();

            // 点が存在することを確認
            expect(points1.length).toBeGreaterThan(5);
            expect(points11.length).toBeGreaterThan(5);

            // 重力が強いため、x=450の方に引き寄せられ、座標に差異が出るはず
            expect(points11[5].x).not.toBe(points1[5].x);
            expect(points11[5].x).toBeGreaterThan(points1[5].x);
        });
    });
});
