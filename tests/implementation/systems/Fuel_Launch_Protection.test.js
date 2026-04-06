/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { EventSystem } from '../../../GravityFreight/src/systems/EventSystem.js';
import { setupStandardDOM } from '../../test-utils.js';

// TitleAnimation のモック化
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Implementation: Fuel Launch Protection', () => {
    let game;
    let eventSystem;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { 
        status: {}, 
        message: {}, 
        animateCoinChange: vi.fn(),
        updateUI: vi.fn(),
        showStatus: vi.fn()
    };

    beforeEach(() => {
        setupStandardDOM();
        vi.clearAllMocks();
        game = new Game(mockCanvas, mockUI);
        eventSystem = new EventSystem(game);
        game.eventSystem = eventSystem; // Override
    });

    it('Should consume booster charges instead of launcher charges when fuel is equipped', () => {
        // Setup damaged launcher (1/2 charges)
        const launcher = { id: 'pad_standard_d2', category: 'launchers', charges: 1, maxCharges: 2, instanceId: 'l1', power: 10 };
        // Setup fuel (1/1 charges)
        const fuel = { id: 'opt_fuel', category: 'boosters', charges: 1, maxCharges: 1, instanceId: 'b1', preventsLauncherWear: true, powerMultiplier: 1.2 };
        
        game.inventory.launchers = [launcher];
        game.inventory.boosters = [fuel];
        
        game.selection.launcher = launcher;
        game.selection.rocket = { id: 'r1', mass: 10, totalPrecision: 100 };
        game.selection.booster = fuel;
        game.state = 'aiming';

        eventSystem.launch();

        // Launcher charges should NOT have decreased
        const finalLauncher = game.inventory.launchers.find(l => l.instanceId === 'l1');
        expect(finalLauncher.charges).toBe(1);

        // Booster should have been removed (as charges became 0)
        const finalFuel = game.inventory.boosters.find(b => b.instanceId === 'b1');
        expect(finalFuel).toBeUndefined();
    });

    it('Should consume booster charges and keep booster if charges > 0', () => {
        const launcher = { id: 'pad_standard_d2', category: 'launchers', charges: 1, maxCharges: 2, instanceId: 'l1', power: 10 };
        // Setup fuel pack (2/2 charges)
        const fuelPack = { id: 'opt_fuel_pack', category: 'boosters', charges: 2, maxCharges: 2, instanceId: 'b2', preventsLauncherWear: true, powerMultiplier: 1.2 };
        
        game.inventory.launchers = [launcher];
        game.inventory.boosters = [fuelPack];
        
        game.selection.launcher = launcher;
        game.selection.rocket = { id: 'r1', mass: 10, totalPrecision: 100 };
        game.selection.booster = fuelPack;
        game.state = 'aiming';

        eventSystem.launch();

        // Launcher charges should NOT have decreased
        const finalLauncher = game.inventory.launchers.find(l => l.instanceId === 'l1');
        expect(finalLauncher.charges).toBe(1);

        // Booster should remain in inventory with 1 charge
        const finalFuel = game.inventory.boosters.find(b => b.instanceId === 'b2');
        expect(finalFuel).not.toBeUndefined();
        expect(finalFuel.charges).toBe(1);
    });
});
