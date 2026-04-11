/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { Vector2 } from '../../../GravityFreight/src/utils/Physics.js';
import { FACILITY_INFO } from '../../../GravityFreight/src/core/Data.js';
import { setupStandardDOM } from '../../test-utils.js';

// TitleAnimation のモック化
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Implementation: MissionSystem Logic', () => {
    let game;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        setupStandardDOM();
        vi.clearAllMocks();
        game = new Game(mockCanvas, mockUI);
    });

    it('initStage should create home star at center', () => {
        game.missionSystem.initStage(5);
        expect(game.homeStar.position.x).toBe(400);
        expect(game.homeStar.position.y).toBe(300);
    });

    it('collectItems should update pendingItems and ship log', () => {
        const body = { 
            position: new Vector2(100, 100), 
            items: [{ id: 'test_item', category: 'MODULES' }],
            isCollected: false 
        };
        game.ship = { collectedItems: [] };
        
        game.missionSystem.collectItems(body);
        
        expect(game.pendingItems.length).toBe(1);
        expect(body.items.length).toBe(0);
        expect(game.ship.collectedItems.length).toBe(1);
    });

    it('isGameOver: should return true when no resources left', () => {
        game.inventory.rockets = [];
        game.inventory.chassis = [];
        game.inventory.logic = [];
        game.inventory.launchers = [];
        
        expect(game.missionSystem.isGameOver()).toBe(true);
    });

    it('isGameOver: should return false if at least one usable launcher exists', () => {
        game.inventory.rockets = [];
        game.inventory.chassis = [{ count: 1 }];
        game.inventory.logic = [{ count: 1 }];
        game.inventory.launchers = [{ charges: 1 }];
        
        expect(game.missionSystem.isGameOver()).toBe(false);
    });

    it('should increment game.returnBonus by 0.1 on returned status', () => {
        game.returnBonus = 0.1;
        game.missionSystem.resolveItems('returned');
        expect(game.returnBonus).toBeCloseTo(0.2);
    });

    it('Facility branches should use mapping from FACILITY_INFO', () => {
        game.storySystem.unlockNext = vi.fn();

        const testGoals = [
            { id: 'TRADING_POST', type: 'TRADING_POST' },
            { id: 'REPAIR_DOCK', type: 'REPAIR_DOCK' },
            { id: 'BLACK_MARKET', type: 'BLACK_MARKET' }
        ];

        testGoals.forEach(goal => {
            game.lastHitGoal = goal;
            game.pendingItems = [{ itemData: { category: 'CARGO', deliveryGoalId: goal.id, id: 'test_cargo' } }];
            
            // 配送処理実行
            game.missionSystem.resolveItems('success', goal);
            
            const expectedInitial = FACILITY_INFO[goal.id].id; // 'T', 'R', or 'B'
            expect(game.storySystem.unlockNext).toHaveBeenCalledWith(expectedInitial);
        });
    });
});
