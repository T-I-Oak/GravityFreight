import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../src/core/Game.js';

describe('EconomySystem Logic', () => {
    let canvas, ui, elementMap;

    beforeEach(() => {
        canvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
        ui = { status: {}, message: {}, credits: {} };
        elementMap = {};
        
        global.document = {
            getElementById: vi.fn((id) => {
                if (!elementMap[id]) {
                    elementMap[id] = { 
                        id, 
                        onclick: null, 
                        classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) },
                        style: {},
                        appendChild: vi.fn(),
                        innerHTML: '',
                        querySelector: vi.fn(() => ({}))
                    };
                }
                return elementMap[id];
            }),
            createElement: vi.fn(() => ({ appendChild: vi.fn(), innerHTML: '', style: {}, classList: { add: vi.fn() } })),
            querySelectorAll: vi.fn(() => [])
        };
        global.window = {
            innerWidth: 1024,
            innerHeight: 768,
            addEventListener: vi.fn(),
            requestAnimationFrame: vi.fn()
        };
    });

    describe('calculateValue', () => {
        it('should reflect item rarity and condition accurately', () => {
            const game = new Game(canvas, ui);
            const item = { id: 'test', category: 'MODULES', rarity: 5, charges: 5, maxCharges: 5, enhancementCount: 0 };
            
            // Base: 20 (COMMON), Condition: 1.0, Enhancement: 0% -> 20
            expect(game.economySystem.calculateValue(item)).toBe(20);

            // Condition: (2+1)/(5+1)=0.5 -> 20 * 0.5 = 10
            item.charges = 2;
            expect(game.economySystem.calculateValue(item)).toBe(10);
        });

        it('should apply enhancement bonus (+10% per count)', () => {
            const game = new Game(canvas, ui);
            const item = { id: 'test', category: 'MODULES', rarity: 15, charges: 10, maxCharges: 10, 
                           enhancementCount: 2 }; 
            
            // Base: 60 (RARE), Condition: 1.0, Enhancement: 1.2 -> 72
            expect(game.economySystem.calculateValue(item)).toBe(72);
        });
    });

    describe('Item Distribution (v1.0.5)', () => {
        it('should have 1 to 2 items on each star', () => {
            const game = new Game(canvas, ui, 50);
            const counts = new Set();
            game.bodies.forEach(body => {
                if (body.isHome) return;
                const len = body.items.length;
                counts.add(len);
                expect(len).toBeGreaterThanOrEqual(1);
                expect(len).toBeLessThanOrEqual(2);
            });
            expect(counts.has(1)).toBe(true);
            expect(counts.has(2)).toBe(true);
        });
    });
});
