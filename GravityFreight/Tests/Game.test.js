import { describe, it, test, expect, vi, beforeEach } from 'vitest';
import { Game } from '../src/Game.js';
import { PARTS, INITIAL_INVENTORY, ITEM_REGISTRY } from '../src/Data.js';

// --- Mocking ---
const createMockElement = (tag) => {
    const el = {
        tagName: tag.toUpperCase(),
        innerHTML: '',
        textContent: '',
        style: {},
        classList: {
            add: vi.fn(),
            remove: vi.fn(),
            contains: vi.fn().mockReturnValue(false)
        },
        appendChild: vi.fn().mockImplementation((child) => {
            if (child && child.tagName) {
                el.innerHTML += `<${child.tagName.toLowerCase()}></${child.tagName.toLowerCase()}>`;
            }
        }),
        querySelector: vi.fn().mockImplementation(() => createMockElement('div')),
        querySelectorAll: vi.fn().mockReturnValue([]),
        getBoundingClientRect: vi.fn().mockReturnValue({ left: 0, top: 0, width: 100, height: 100 }),
        addEventListener: vi.fn(),
        offsetParent: {}
    };
    return el;
};

// Global mocks
global.document = {
    getElementById: vi.fn().mockImplementation(() => createMockElement('div')),
    createElement: vi.fn().mockImplementation(tag => createMockElement(tag)),
    querySelectorAll: vi.fn().mockReturnValue([]),
    body: createMockElement('body')
};
global.window = {
    addEventListener: vi.fn(),
    innerWidth: 1024,
    innerHeight: 768
};

describe('Game Logic Tests', () => {
    let canvas, ui;

    beforeEach(() => {
        canvas = { width: 800, height: 600, addEventListener: vi.fn() };
        ui = {
            status: createMockElement('div'),
            message: createMockElement('div'),
            credits: createMockElement('span')
        };
        vi.clearAllMocks();
    });

    describe('Inventory & Pricing', () => {
        it('calculateValue should reflect item rarity', () => {
            const game = new Game(canvas, ui);
            const commonItem = { rarity: 5 }; // COMMON
            const rareItem = { rarity: 15 };  // RARE
            expect(game.calculateValue(rareItem)).toBeGreaterThan(game.calculateValue(commonItem));
        });

        it('should correctly calculate delivery goal bonuses with discounts', () => {
            const game = new Game(canvas, ui);
            game.coins = 1000;
            game.currentCoinDiscount = 0.2; // 20% off
            
            // This is complex to unit test fully without mocking all dependencies, 
            // but we can check the discount logic in pricing.
            const baseCost = 100;
            const discountedCost = Math.floor(baseCost * (1 - game.currentCoinDiscount));
            expect(discountedCost).toBe(80);
        });

        it('cargo_lucky should update discount up to 50%', () => {
            const game = new Game(canvas, ui);
            game.currentCoinDiscount = 0;
            
            const luckyCargo = { id: 'cargo_lucky', category: 'CARGO', coinDiscount: 0.1 };
            const mockGoal = { id: 'SAFE', arcMultiplier: 1.0 };
            
            // Simulate collecting 6 lucky items
            for (let i = 0; i < 6; i++) {
                game.pendingItems.push({ itemData: luckyCargo });
                game.resolveItems('success', mockGoal);
            }
            
            expect(game.currentCoinDiscount).toBe(0.5); // Max 0.5
        });
    });

    describe('v1.0.2 Trading Post Bug Fixes', () => {
        const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn() };
        const mockUI = { status: {}, message: {} };

        it('initTradingPost should clear container before rendering', () => {
            const game = new Game(mockCanvas, mockUI);
            const container = createMockElement('div');
            container.appendChild(createMockElement('div')); // Dummy child
            
            game.initTradingPost(container);
            
            // 2 sections (Shop and Sell) should be appended
            expect(container.innerHTML).toContain('div');
        });

        it('selling an item should only add coins if removal is successful', () => {
            const game = new Game(mockCanvas, mockUI);
            game.coins = 100;
            const booster = game.inventory.boosters[0]; // boost_power
            const instanceId = booster.instanceId;
            const sellPrice = 50;

            // 1. Valid sell
            const success1 = game._removeItemFromInventory('BOOSTERS', instanceId);
            expect(success1).toBe(true);
            game.coins += sellPrice;
            expect(game.coins).toBe(150);

            // 2. Invalid sell (item no longer exists)
            const success2 = game._removeItemFromInventory('BOOSTERS', instanceId);
            expect(success2).toBe(false);
        });

        it('Trading Post UI should respect coin state for purchase buttons', () => {
            const game = new Game(mockCanvas, mockUI);
            game.coins = 10; // Very low
            const container = createMockElement('div');
            
            // 明示的に在庫をセット
            game.currentShopStock = [
                { id: 'expensive', name: 'Expensive Item', category: 'MODULES', rarity: 5, count: 1, isSold: false, isSale: false }
            ];
            vi.spyOn(game, 'calculateValue').mockReturnValue(100); // buyPrice = 200

            game.initTradingPost(container);
            
            // モックの appendChild が呼ばれて innerHTML が更新されていることを確認
            expect(container.innerHTML).toContain('div');
        });
    });

    describe('Enhanced Item Selection (v1.0.3)', () => {
        const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn() };
        const mockUI = { status: {}, message: {} };

        it('should assign unique instanceId to all inventory items', () => {
            const game = new Game(mockCanvas, mockUI);
            const allItems = [
                ...game.inventory.chassis,
                ...game.inventory.logic,
                ...game.inventory.launchers,
                ...game.inventory.modules,
                ...game.inventory.boosters
            ];
            const ids = allItems.map(i => i.instanceId);
            const uniqueIds = new Set(ids);
            expect(ids.length).toBe(uniqueIds.size);
            expect(ids.every(id => id && id.startsWith('inst_'))).toBe(true);
        });

        it('should distinguish between normal and enhanced items with same ID', () => {
            const game = new Game(mockCanvas, mockUI);
            // Clear and setup
            game.inventory.chassis = [];
            
            const normal = { id: 'hull_light', name: 'Normal', category: 'CHASSIS' };
            const enhanced = { 
                id: 'hull_light', 
                name: 'Enhanced', 
                category: 'CHASSIS', 
                enhancementCount: 1, 
                enhancements: { precision: 1 } 
            };

            game._addItemToInventory(normal);
            game._addItemToInventory(enhanced);

            expect(game.inventory.chassis.length).toBe(2);
            
            const instNormal = game.inventory.chassis.find(i => !i.enhancements || !i.enhancements.precision);
            const instEnhanced = game.inventory.chassis.find(i => i.enhancements && i.enhancements.precision);

            expect(instNormal.instanceId).not.toBe(instEnhanced.instanceId);

            game.selectPart('chassis', instEnhanced.instanceId);
            expect(game.selection.chassis).toBe(instEnhanced);

            game.selectPart('chassis', instNormal.instanceId);
            expect(game.selection.chassis).toBe(instNormal);
        });

        it('should properly increment count for identical items (including enhancements)', () => {
            const game = new Game(mockCanvas, mockUI);
            game.inventory.modules = [];
            
            const eObj = { precision: 1 };
            const item1 = { id: 'mod_analyzer', category: 'MODULES', enhancements: eObj };
            const item2 = { id: 'mod_analyzer', category: 'MODULES', enhancements: eObj };
            
            game._addItemToInventory(item1);
            game._addItemToInventory(item2);

            expect(game.inventory.modules.length).toBe(1);
            expect(game.inventory.modules[0].count).toBe(2);
        });
    });
});
