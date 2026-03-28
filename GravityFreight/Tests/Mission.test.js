import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../src/core/Game.js';
import { Vector2 } from '../src/utils/Physics.js';

// DOM環境のモック
const createMockElement = (tag = 'div') => ({
    tagName: tag.toUpperCase(),
    onclick: vi.fn(),
    appendChild: vi.fn(),
    classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(), toggle: vi.fn() },
    querySelector: vi.fn(() => createMockElement('div')),
    querySelectorAll: vi.fn(() => []),
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
    requestAnimationFrame: vi.fn()
};

describe('Mission & Stage Logic', () => {
    let game;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        vi.clearAllMocks();
        game = new Game(mockCanvas, mockUI);
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
        
        expect(game.isGameOver()).toBe(true);
    });
});
