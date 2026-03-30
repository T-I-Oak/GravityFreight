import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../src/core/Game.js';
import { AssemblySystem } from '../src/systems/AssemblySystem.js';
import { EconomySystem } from '../src/systems/EconomySystem.js';

describe('Enhancement and Dismantle Logic', () => {
    let canvas, ui, game, assemblySystem, economySystem;

    beforeEach(() => {
        canvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
        ui = { status: {}, message: {}, credits: {} };
        
        global.window = {
            innerWidth: 1024,
            innerHeight: 768,
            addEventListener: vi.fn(),
            requestAnimationFrame: vi.fn()
        };
        
        // Mocking DOM
        global.document = {
            getElementById: vi.fn(() => ({ 
                appendChild: vi.fn(), 
                innerHTML: '', 
                classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(() => false), toggle: vi.fn() },
                style: {},
                textContent: '',
                querySelector: vi.fn(() => ({ textContent: '' }))
            })),
            createElement: vi.fn(() => ({ 
                appendChild: vi.fn(), 
                innerHTML: '', 
                style: {}, 
                classList: { add: vi.fn() },
                querySelector: vi.fn(() => ({ textContent: '' }))
            })),
            querySelectorAll: vi.fn(() => [])
        };

        game = new Game(canvas, ui);
        assemblySystem = new AssemblySystem(game);
        economySystem = new EconomySystem(game);
    });

    it('should NOT add charges to passive modules during assembly', () => {
        const passiveModule = { id: 'mod_analyzer', instanceId: 'm1', name: 'Orbit Analyst', precisionMultiplier: 1.5 };
        game.inventory.modules = [passiveModule];
        game.selection.chassis = { id: 'h1', instanceId: 'c1', name: 'Chassis', slots: 2 };
        game.selection.logic = { id: 'l1', instanceId: 'lo1', name: 'Logic' };
        game.selection.modules = { 'm1': 1 };

        assemblySystem.assembleRocket();
        const rocket = game.inventory.rockets[0];
        const equippedModule = rocket.modules['m1'];

        // Passive module should NOT have charges or maxCharges initialized to 0
        expect(equippedModule.maxCharges).toBeUndefined();
        expect(equippedModule.charges).toBeUndefined();
    });

    it('should correctly filter enhancement options based on item properties', () => {
        const passiveItem = { id: 'mod_analyzer', name: 'Orbit Analyst', precisionMultiplier: 1.5 };
        
        // Repeatedly enhance to ensure 'charges' or 'gravity' are NEVER picked if not present
        for (let i = 0; i < 20; i++) {
            economySystem.enhanceItem(passiveItem);
            expect(passiveItem.maxCharges).toBeUndefined();
            expect(passiveItem.gravityMultiplier).toBeUndefined();
        }

        // Specifically check universal enhancements (Slots, Precision, Pickup)
        expect(passiveItem.enhancements.slots || passiveItem.enhancements.precision || passiveItem.enhancements.pickup).toBeDefined();
    });

    it('should include charges in enhancement options ONLY IF maxCharges > 0', () => {
        const activeModule = { id: 'mod_star_breaker', name: 'Star Breaker', maxCharges: 2, charges: 2 };
        
        let hitsCharges = false;
        for (let i = 0; i < 50; i++) {
            economySystem.enhanceItem(activeModule);
            if (activeModule.enhancements.charges > 0) hitsCharges = true;
        }
        expect(hitsCharges).toBe(true);
        expect(activeModule.maxCharges).toBeGreaterThan(2);
    });

    it('should REPAIR without incrementing enhancementCount if current charges < max', () => {
        const damagedModule = { 
            id: 'mod_star_breaker', 
            name: 'Star Breaker', 
            maxCharges: 2, 
            charges: 1, 
            enhancementCount: 0,
            enhancements: {}
        };
        
        // Mocking random to pick 'charges' (which index is it? 0:precision, 1:pickup, 2:slots, 3:charges)
        // options will be ['precision', 'pickup', 'slots', 'charges']
        vi.spyOn(Math, 'random').mockReturnValue(0.99); // Should pick 'charges'

        economySystem.enhanceItem(damagedModule);
        
        expect(damagedModule.charges).toBe(2);
        expect(damagedModule.maxCharges).toBe(2);
        expect(damagedModule.enhancementCount || 0).toBe(0); // Should NOT increment
        
        vi.spyOn(Math, 'random').mockRestore();
    });

    it('should ENHANCE and increment enhancementCount if current charges == max', () => {
        const fullModule = { 
            id: 'mod_star_breaker', 
            name: 'Star Breaker', 
            maxCharges: 2, 
            charges: 2, 
            enhancementCount: 0,
            enhancements: {}
        };
        
        vi.spyOn(Math, 'random').mockReturnValue(0.99); // Should pick 'charges'

        economySystem.enhanceItem(fullModule);
        
        expect(fullModule.maxCharges).toBe(3);
        expect(fullModule.charges).toBe(3);
        expect(fullModule.enhancementCount).toBe(1); // Should increment
        
        vi.spyOn(Math, 'random').mockRestore();
    });
});
