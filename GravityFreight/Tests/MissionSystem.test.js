import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../src/core/Game.js';
import { Vector2 } from '../src/utils/Physics.js';

describe('Mission & Stage Logic', () => {
    let game, canvas, ui, elementMap;

    beforeEach(() => {
        canvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
        ui = { status: {}, message: {} };
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
                        textContent: '',
                        getContext: vi.fn(() => ({
                            clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), 
                            stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), save: vi.fn(), restore: vi.fn(), 
                            translate: vi.fn(), rotate: vi.fn(), closePath: vi.fn(), setTransform: vi.fn()
                        }))
                    };
                }
                return elementMap[id];
            }),
            createElement: vi.fn(() => ({ 
                appendChild: vi.fn(), 
                innerHTML: '', 
                style: {}, 
                classList: { add: vi.fn() },
                getContext: vi.fn(() => ({
                    clearRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), 
                    stroke: vi.fn(), fill: vi.fn(), arc: vi.fn(), save: vi.fn(), restore: vi.fn(), 
                    translate: vi.fn(), rotate: vi.fn(), closePath: vi.fn(), setTransform: vi.fn()
                }))
            })),
            querySelectorAll: vi.fn(() => [])
        };
        global.window = {
            innerWidth: 1024,
            innerHeight: 768,
            addEventListener: vi.fn(),
            requestAnimationFrame: vi.fn(),
            removeEventListener: vi.fn()
        };
        global.requestAnimationFrame = global.window.requestAnimationFrame;
        global.cancelAnimationFrame = vi.fn();
        vi.clearAllMocks();
        game = new Game(canvas, ui);
    });

    it('initStage should create home star and goals', () => {
        game.initStage(5);
        expect(game.homeStar).toBeDefined();
        expect(game.homeStar.isHome).toBe(true);
        expect(game.goals.length).toBe(3);
        expect(game.bodies.length).toBeGreaterThan(5); // Home + 5 stars (some might fail placement but mostly >5)
    });

    it('collectItems should move items to pendingItems', () => {
        const body = { 
            position: new Vector2(100, 100), 
            items: [{ id: 'test_item', category: 'MODULES' }],
            isCollected: false 
        };
        game.ship = { collectedItems: [] };
        
        game.collectItems(body);
        
        expect(game.pendingItems.length).toBe(1);
        expect(body.items.length).toBe(0);
        expect(game.ship.collectedItems.length).toBe(1);
    });

    it('resolveItems should distribute items to inventory on success', () => {
        const item = { id: 'hull_light', category: 'CHASSIS' };
        game.pendingItems = [{ itemData: item }];
        
        game.resolveItems('success');
        
        expect(game.inventory.chassis.some(i => i.id === 'hull_light')).toBe(true);
        expect(game.pendingItems.length).toBe(0);
    });

    it('isGameOver should detect failure when no rockets and no parts', () => {
        game.inventory.rockets = [];
        game.inventory.chassis = [];
        game.inventory.logic = [];
        game.inventory.launchers = [];
        
        expect(game.missionSystem.isGameOver()).toBe(true);
    });

    it('checkGameOver should transition to gameover state when resources are exhausted', () => {
        game.inventory.rockets = [];
        game.inventory.chassis = [];
        game.inventory.logic = [];
        game.inventory.launchers = [];
        
        game.missionSystem.checkGameOver();
        expect(game.state).toBe('gameover');
    });
});
