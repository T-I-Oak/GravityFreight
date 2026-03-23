import { describe, it, expect, vi } from 'vitest';
import { Game } from '../src/Game.js';
import { Vector2 } from '../src/Physics.js';
import { RARITY, PARTS } from '../src/Data.js';

// DOM環境のモック
global.document = {
    getElementById: vi.fn(() => ({
        onclick: vi.fn(),
        appendChild: vi.fn(),
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
        innerHTML: '',
        style: {}
    })),
    createElement: vi.fn(() => ({
        onclick: vi.fn(),
        appendChild: vi.fn(),
        style: {},
        className: '',
        innerHTML: ''
    })),
    querySelectorAll: vi.fn(() => [])
};
global.window = {
    addEventListener: vi.fn(),
    innerWidth: 1024,
    innerHeight: 768
};

describe('Game Item Rarity Logic', () => {
    // 依存オブジェクトのモック
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn() };
    const mockUI = { status: {}, message: {} };

    it('Stage 1 should NOT spawn RARE items', () => {
        const game = new Game(mockCanvas, mockUI);
        game.stageLevel = 1;
        
        let spawnedItems = [];
        for(let i=0; i<100; i++) {
            const result = game.getWeightedRandomItem();
            if (result && result.item.rarity) {
                spawnedItems.push(result.item.rarity);
            }
        }
        
        expect(spawnedItems.includes(RARITY.COMMON)).toBe(true);
        expect(spawnedItems.includes(RARITY.UNCOMMON)).toBe(true);
        // THRESHOLD(15) - RARITY.RARE(15) = 0 なので出現しない
        expect(spawnedItems.includes(RARITY.RARE)).toBe(false);
    });

    it('Stage 3 should spawn RARE items', () => {
        const game = new Game(mockCanvas, mockUI);
        game.stageLevel = 3;
        
        let spawnedItems = [];
        for(let i=0; i<1000; i++) {
            const result = game.getWeightedRandomItem();
            if (result && result.item.rarity) {
                spawnedItems.push(result.item.rarity);
            }
        }
        
        // ステージ3ではTHRESHOLD(17)になるのでRAREの重みは2になり、出現するはず
        expect(spawnedItems.includes(RARITY.RARE)).toBe(true);
    });

    it('Cargo items do not naturally spawn', () => {
        const game = new Game(mockCanvas, mockUI);
        game.stageLevel = 10; // 閾値が非常に高い場合でも
        
        let spawnedCategories = [];
        for(let i=0; i<100; i++) {
            const result = game.getWeightedRandomItem();
            if (result) {
                spawnedCategories.push(result.category);
            }
        }
        
        // Cargoアイテム群はrarity属性を持たないため自然出現しないこと
        expect(spawnedCategories.includes('CARGO')).toBe(false);
    });

    it('All stars should be generated within boundaryRadius', () => {
        const game = new Game(mockCanvas, mockUI, 20); // 20個生成してチェック
        const centerX = mockCanvas.width / 2;
        const centerY = mockCanvas.height / 2;
        
        game.bodies.forEach(body => {
            const dist = body.position.sub(new Vector2(centerX, centerY)).length();
            // boundaryRadius(900) 以内に収まっていること
            // HomeStar(中心)以外をチェック
            if (body !== game.homeStar) {
                expect(dist).toBeLessThanOrEqual(game.boundaryRadius);
                expect(dist).toBeGreaterThanOrEqual(150); // 最低距離
            }
        });
    });

    describe('v0.4.2 New Features', () => {
        it('Initial state should have sector 1 and score 0', () => {
            const game = new Game(mockCanvas, mockUI);
            expect(game.sector).toBe(1);
            expect(game.score).toBe(0);
            expect(game.displayScore).toBe(0);
        });

        it('Camera offset should be initialized to zero', () => {
            const game = new Game(mockCanvas, mockUI);
            expect(game.cameraOffset.x).toBe(0);
            expect(game.cameraOffset.y).toBe(0);
        });

        it('Zoom should be initialized to 0.5', () => {
            const game = new Game(mockCanvas, mockUI);
            expect(game.zoom).toBe(0.5);
        });
    });
});
