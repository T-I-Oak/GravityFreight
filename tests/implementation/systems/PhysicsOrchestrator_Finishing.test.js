/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { PhysicsOrchestrator } from '../../../GravityFreight/src/systems/PhysicsOrchestrator.js';
import { setupStandardDOM } from '../../test-utils.js';
import { Vector2, Body } from '../../../GravityFreight/src/utils/Physics.js';

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

describe('PhysicsOrchestrator - Finishing State', () => {
    let game;
    let system;

    beforeEach(() => {
        setupStandardDOM();
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 600;
        game = new Game(canvas, {});
        system = game.physicsOrchestrator;
        
        // Setup ship
        game.ship = new Body(new Vector2(400, 300), 10);
        game.ship.trail = [new Vector2(390, 300), new Vector2(395, 300)];
        game.ship.equippedModules = []; // Required for collision evasion logic
        game.selection.rocket = { mass: 10 };
    });

    it('should transition to finishing state when colliding with goal', () => {
        game.state = 'flying';
        const goal = { id: 'TRADING_POST', x: 400, y: 0, angle: -Math.PI/2, width: 0.5, score: 2000, coins: 20, label: 'TP' };
        game.goals = [goal];
        
        // Position at goal boundary
        game.ship.position = new Vector2(game.canvas.width/2, game.canvas.height/2 - 901); // Hit boundary/goal
        
        // This should trigger finishing
        system.checkCollisions(new Vector2(game.canvas.width/2, game.canvas.height/2 - 850));
        
        expect(game.state).toBe('finishing');
        expect(game.finishResult).toBe('cleared');
        expect(game.stateTimer).toBeGreaterThan(0);
    });

    it('should update trail but not position in finishing state', () => {
        game.state = 'finishing';
        game.simulatedTime = 0.01;
        const initialPos = new Vector2(game.ship.position.x, game.ship.position.y);
        const initialTrailLength = game.ship.trail.length;
        
        system.step(0.002);
        
        // Position stays same
        expect(game.ship.position.x).toBe(initialPos.x);
        expect(game.ship.position.y).toBe(initialPos.y);
        
        // Trail gets a new point or shifts
        // system.handleFinishing is called. simulatedTime % 0.01 < dt
        // 0.01 % 0.01 is 0. 0 < 0.002. So push happens.
        expect(game.ship.trail.length).toBeGreaterThanOrEqual(initialTrailLength);
        expect(game.ship.trail[game.ship.trail.length - 1].x).toBe(initialPos.x);
    });

    it('should not increment score in finishing state', () => {
        game.state = 'finishing';
        game.score = 1000;
        
        system.step(0.002);
        
        expect(game.score).toBe(1000); // Should be frozen
    });

    it('should transition to result state when finishing timer expires', () => {
        game.state = 'finishing';
        game.finishResult = 'cleared';
        game.stateTimer = 0.01;
        
        system.updateStateTimer(0.02);
        
        // 'cleared' currently transitions to 'cleared' then eventually 'result'?
        // Let's check updateStateTimer logic I just implemented:
        // if (result === 'cleared' || result === 'returned') { game.setState(result); }
        expect(game.state).toBe('cleared');
        
        // Next timer update should transition to 'result'
        game.stateTimer = 0;
        system.updateStateTimer(0.01);
        expect(game.state).toBe('result');
    });
});
