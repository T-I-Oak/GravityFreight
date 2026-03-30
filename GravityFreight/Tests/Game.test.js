import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../src/core/Game.js';

describe('Game Central Controller Logic', () => {
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

    it('should initialize all subsystems correctly on construction', () => {
        const game = new Game(canvas, ui);
        expect(game.economySystem).toBeDefined();
        expect(game.missionSystem).toBeDefined();
        expect(game.eventSystem).toBeDefined();
        expect(game.state).toBe('title');
    });

    it('should correctly handle home star initialization', () => {
        const game = new Game(canvas, ui, 5);
        expect(game.homeStar).toBeDefined();
        expect(game.homeStar.isHome).toBe(true);
        expect(game.bodies.length).toBeGreaterThanOrEqual(6); // 1 home + 5 generated
    });

    it('should update coin discount when lucky cargo is resolved', () => {
        const game = new Game(canvas, ui);
        game.currentCoinDiscount = 0; // Ensure initialized
        
        const luckyItem = { id: 'cargo_lucky', category: 'CARGO', coinDiscount: 0.1 };
        game.pendingItems = [{ itemData: luckyItem, originalBody: {} }];
        
        game.missionSystem.resolveItems('success', { id: 'SAFE' });
        
        expect(game.currentCoinDiscount).toBe(0.1);
    });
});
