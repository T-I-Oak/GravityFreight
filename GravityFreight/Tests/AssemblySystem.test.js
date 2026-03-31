import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../src/core/Game.js';
import { PARTS, ITEM_REGISTRY } from '../src/core/Data.js';

// DOM環境のモック
const createMockElement = (tag = 'div') => ({
    tagName: tag.toUpperCase(),
    onclick: vi.fn(),
    appendChild: vi.fn(),
    classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(), toggle: vi.fn() },
    querySelector: vi.fn(() => createMockElement('div')),
    querySelectorAll: vi.fn(() => []),
    getContext: vi.fn(() => ({
        clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), 
        stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), save: vi.fn(), restore: vi.fn(), 
        translate: vi.fn(), rotate: vi.fn(), closePath: vi.fn(), setTransform: vi.fn()
    })),
    innerHTML: '',
    style: {},
    textContent: ''
});

global.document = {
    getElementById: vi.fn((id) => createMockElement(id)),
    createElement: vi.fn((tag) => createMockElement(tag)),
    body: createMockElement('body'),
    querySelectorAll: vi.fn(() => [])
};
global.window = {
    addEventListener: vi.fn(),
    innerWidth: 1024,
    innerHeight: 768,
    requestAnimationFrame: vi.fn(),
    removeEventListener: vi.fn()
};
global.requestAnimationFrame = global.window.requestAnimationFrame;
global.cancelAnimationFrame = vi.fn();

describe('Assembly Logic', () => {
    let game;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        vi.clearAllMocks();
        game = new Game(mockCanvas, mockUI);
    });

    it('assembleRocket should calculate total stats correctly', () => {
        // Setup selection
        game.selection.chassis = { ...ITEM_REGISTRY['hull_light'], instanceId: 'c1' }; // mass 3, slots 1
        game.selection.logic = { ...ITEM_REGISTRY['sensor_normal'], instanceId: 'l1' }; // mass 1, precisionMult 1.5, pickupRange 40
        game.selection.modules = {
            'm1': 1 // mod_analyzer: precisionMult 1.5
        };
        game.inventory.modules = [{ ...ITEM_REGISTRY['mod_analyzer'], instanceId: 'm1', count: 1 }];

        game.assembleRocket();

        const rocket = game.inventory.rockets[0];
        expect(rocket).toBeDefined();
        // Mass: 3 (chassis) + 1 (logic) + 1 (module) = 5
        expect(rocket.mass).toBe(5);
        // PrecisionMultiplier: 1.0 (chassis) * 1.5 (logic) * 1.5 (module) = 2.25
        expect(rocket.precisionMultiplier).toBeCloseTo(2.25);
    });

    it('validateModules should remove overflowing modules', () => {
        game.selection.chassis = { id: 'hull_light', mass: 1, slots: 1, instanceId: 'c1' };
        game.selection.modules = {
            'm1': 1,
            'm2': 1
        };
        game.inventory.modules = [
            { id: 'm1', slots: 0, instanceId: 'm1', count: 1 },
            { id: 'm2', slots: 0, instanceId: 'm2', count: 1 }
        ];

        game.validateModules();

        // Slots = 1. Used = 2. Overflow = 1.
        // Should remove one module.
        const usedCount = Object.values(game.selection.modules).reduce((a, b) => a + b, 0);
        expect(usedCount).toBe(1);
    });

    it('checkReadyToAim should initialize ship stats with booster', () => {
        const rocket = {
            mass: 10,
            precisionMultiplier: 2.0,
            pickupRange: 50,
            pickupMultiplier: 1.0,
            gravityMultiplier: 1.0,
            arcMultiplier: 1.0,
            totalPrecision: 100, // Dummy
            instanceId: 'r1',
            modules: {}
        };
        game.inventory.rockets = [rocket];
        game.selection.rocket = rocket;
        game.selection.launcher = { power: 1000, precisionMultiplier: 1.0, instanceId: 'lnc1' };
        game.selection.booster = { powerMultiplier: 1.5, mass: 2, arcMultiplier: 1.2, instanceId: 'b1' };

        game.checkReadyToAim();

        expect(game.state).toBe('aiming');
        // Ship mass: 10 (rocket) + 2 (booster) = 12
        expect(game.ship.mass).toBe(12);
        // Arc multiplier: 1.0 (rocket) * 1.2 (booster) = 1.2
        expect(game.ship.arcMultiplier).toBeCloseTo(1.2);
    });
    
    it('assembleRocket should consume parts from inventory', () => {
        game.selection.chassis = { ...ITEM_REGISTRY['hull_light'], instanceId: 'c1' };
        game.selection.logic = { ...ITEM_REGISTRY['sensor_normal'], instanceId: 'l1' };
        game.selection.modules = { 'm1': 1 };
        game.inventory.chassis = [game.selection.chassis];
        game.inventory.logic = [game.selection.logic];
        game.inventory.modules = [{ ...ITEM_REGISTRY['mod_analyzer'], instanceId: 'm1', count: 1 }];

        game.assembleRocket();

        expect(game.inventory.chassis.length).toBe(0);
        expect(game.inventory.logic.length).toBe(0);
        expect(game.inventory.modules.length).toBe(0);
        expect(game.inventory.rockets.length).toBe(1);
    });

    it('InventorySystem should handle singular category names', () => {
        const item = { id: 'lnc_basic', instanceId: 'lnc1' };
        game.inventory.launchers = [item];
        
        game.selectPart('launcher', 'lnc1');
        
        expect(game.selection.launcher).toEqual(item);
    });
});
