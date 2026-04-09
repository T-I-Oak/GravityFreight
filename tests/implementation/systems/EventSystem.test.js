/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { EventSystem } from '../../../GravityFreight/src/systems/EventSystem.js';
import { setupStandardDOM } from '../../test-utils.js';
import { Vector2 } from '../../../GravityFreight/src/utils/Physics.js';

// TitleAnimation のモック化
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Implementation: systems/EventSystem.js', () => {
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

        game.launchSystem.launch();

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

        game.launchSystem.launch();

        // Launcher charges should NOT have decreased
        const finalLauncher = game.inventory.launchers.find(l => l.instanceId === 'l1');
        expect(finalLauncher.charges).toBe(1);

        // Booster should remain in inventory with 1 charge
        const finalFuel = game.inventory.boosters.find(b => b.instanceId === 'b2');
        expect(finalFuel).not.toBeUndefined();
        expect(finalFuel.charges).toBe(1);
    });

    it('should reset returnBonus in closeEvent (sector completed)', () => {
        game.returnBonus = 0.4;
        game.facilityEventSystem.closeEvent();
        expect(game.returnBonus).toBe(0);
    });

    it('should apply returnBonus to launch velocity', () => {
        game.state = 'aiming';
        game.returnBonus = 0.2; // +20%
        game.selection.rocket = { mass: 10, gravityMultiplier: 1.0 };
        game.selection.launcher = { power: 1000 };
        game.selection.booster = null;
        
        // Mock current ship rotation (default is -PI/2) and mass
        game.ship = { rotation: -Math.PI / 2, mass: 10 };
        
        // Calculate expected velocity: power(1000) * massFactor(1.0) * (1 + bonus(0.2)) = 1200
        // Direction is up (0, -1)
        game.launchSystem.launch();
        
        expect(game.ship.velocity.y).toBeCloseTo(-1200);
    });

    describe('checkReadyToAim: Pickup Range (Sync with Parts & Modules)', () => {
        beforeEach(() => {
            // checkReadyToAim uses these during ship initialization
            game.canvas = { width: 800, height: 600 };
            game.homeStar = { position: new Vector2(400, 300), radius: 25 };
            game.selection = {
                rocket: null,
                launcher: { power: 1000, charges: 5, precision: 100, precisionMultiplier: 1.0 },
                booster: null
            };
            game.inventory = { chassis: [], logic: [], launchers: [], rockets: [], modules: [], boosters: [] };
            game.returnBonus = 0;
        });

        it('should calculate correct radius (range * mult) for various logic parts', () => {
            const cases = [
                { id: 'sensor_short', r: 40, m: 1.5, expected: 60 },
                { id: 'sensor_normal', r: 40, m: 1.0, expected: 40 },
                { id: 'sensor_long', r: 40, m: 0.5, expected: 20 }
            ];

            cases.forEach(c => {
                game.selection.rocket = {
                    id: 'assembled_rocket',
                    pickupRange: c.r,
                    pickupMultiplier: c.m,
                    totalPrecision: 400,
                    precisionMultiplier: 1.0,
                    modules: {}
                };
                
                game.launchSystem.checkReadyToAim();
                expect(game.ship.pickupRange * game.ship.pickupMultiplier).toBe(c.expected);
            });
        });

        it('should combine multipliers from rocket and booster correctly', () => {
            game.selection.rocket = {
                id: 'assembled_rocket',
                pickupRange: 40,
                pickupMultiplier: 3.0, // e.g. 1.5 logic * 2.0 module
                totalPrecision: 400,
                precisionMultiplier: 1.0,
                modules: {
                    'mod_sensor': { id: 'mod_sensor', pickupMultiplier: 2.0, count: 1, maxCharges: 5 }
                }
            };
            game.selection.booster = { id: 'boost_magnet', pickupMultiplier: 1.2 };
            
            game.launchSystem.checkReadyToAim();
            
            // Expected: 40 * (3.0 * 1.2) = 144
            expect(game.ship.pickupRange * game.ship.pickupMultiplier).toBeCloseTo(144);
        });
    });
});
