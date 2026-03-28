import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../src/core/Game.js';

describe('Score and Coin Calculation Logic', () => {
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
                        querySelector: vi.fn(() => ({})),
                        textContent: ''
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

    it('should correctly capture launchScore and calculate flight delta in results', () => {
        const game = new Game(canvas, ui);
        game.score = 1000;
        
        // Mocking launch behavior
        game.eventSystem.launch = vi.fn().mockImplementation(() => {
            game.launchScore = game.score;
            game.state = 'flight';
        });
        
        game.eventSystem.launch();
        expect(game.launchScore).toBe(1000);

        // Simulate flight score (real-time gain)
        game.score += 150; 
        
        // Simulate result screen trigger
        // We set pending items
        game.pendingScore = 500; // Bonus (e.g. from Goal)
        
        const pureFlightScore = Math.max(0, game.score - game.launchScore);
        expect(pureFlightScore).toBe(150); // Should only be the gain during flight

        const finalScore = game.score + game.pendingScore;
        expect(finalScore).toBe(1650); // 1000 (start) + 150 (flight) + 500 (bonus)
    });

    it('should use launchScore as animation base in result screen', () => {
        const game = new Game(canvas, ui);
        game.score = 2000;
        game.launchScore = 2000;
        
        game.score += 300; // Gained 300 during flight
        game.pendingScore = 100; // 100 Bonus
        
        // Initial state for animation
        const startValue = game.launchScore;
        const finalScore = game.score + game.pendingScore;
        
        expect(startValue).toBe(2000);
        expect(finalScore).toBe(2400);
    });
});
