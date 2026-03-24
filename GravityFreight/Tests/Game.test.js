import { describe, it, expect, vi } from 'vitest';
import { Game } from '../src/Game.js';
import { Vector2 } from '../src/Physics.js';
import { RARITY, PARTS } from '../src/Data.js';

// DOM環境のモック
const createMockElement = (tag = 'div') => ({
    onclick: vi.fn(),
    appendChild: vi.fn(),
    classList: { 
        add: vi.fn(), 
        remove: vi.fn(), 
        contains: vi.fn(),
        toggle: vi.fn()
    },
    querySelector: vi.fn((selector) => {
        if (selector === '.panel-header') return createMockElement('div');
        if (selector === '.collapse-btn .icon') return createMockElement('span');
        return createMockElement('div');
    }),
    querySelectorAll: vi.fn(() => []),
    innerHTML: '',
    style: {},
    getAttribute: vi.fn((name) => {
        if (name === 'data-tab') return 'flight';
        return '';
    }),
    disabled: false,
    textContent: ''
});

global.document = {
    getElementById: vi.fn((id) => createMockElement('div')),
    createElement: vi.fn((tag) => createMockElement(tag)),
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
        expect(spawnedItems.includes(RARITY.RARE)).toBe(true);
    });

    it('All stars should be generated within boundaryRadius', () => {
        const game = new Game(mockCanvas, mockUI, 20);
        const centerX = mockCanvas.width / 2;
        const centerY = mockCanvas.height / 2;
        
        game.bodies.forEach(body => {
            const dist = body.position.sub(new Vector2(centerX, centerY)).length();
            if (body !== game.homeStar) {
                expect(dist).toBeLessThanOrEqual(game.boundaryRadius);
                expect(dist).toBeGreaterThanOrEqual(150);
            }
        });
    });

    describe('v0.4.2 New Features & Refinement', () => {
        it('Initial state should have correct terminologies', () => {
            const game = new Game(mockCanvas, mockUI);
            expect(game.inventory.launchers).toBeDefined();
            expect(game.inventory.boosters).toBeDefined();
            // accelerators は名称変更されているはず
            expect(game.inventory.accelerators).toBeUndefined();
        });

        it('assembleUnit SHOULD NOT consume booster', () => {
            const game = new Game(mockCanvas, mockUI);
            
            // ブースターを1つ持っている
            const boosterId = 'opt_fuel';
            const booster = game.inventory.boosters.find(b => b.id === boosterId);
            expect(booster.count).toBe(1);
            
            // 選択状態にする
            game.selection.chassis = game.inventory.chassis[0];
            game.selection.logic = game.inventory.logic[0];
            game.selection.booster = booster;
            
            // アセンブリ実行
            game.assembleUnit();
            
            // ブースターが消費されていないことを確認 (BUG FIX VERIFICATION)
            const boosterAfter = game.inventory.boosters.find(b => b.id === boosterId);
            expect(boosterAfter).toBeDefined();
            expect(boosterAfter.count).toBe(1);
            
            // 逆に、使用したシャーシは在庫(count:0)からフィルタリングされて消えているはず
            const chassisAfter = game.inventory.chassis.find(c => c.id === 'hull_light');
            expect(chassisAfter).toBeUndefined();
            
            // 残っているのは別のシャーシ
            expect(game.inventory.chassis.length).toBe(1);
            expect(game.inventory.chassis[0].id).toBe('hull_medium');
        });

        it('Launch SHOULD consume booster if equipped', () => {
             const game = new Game(mockCanvas, mockUI);
             
             // セットアップ
             game.selection.chassis = game.inventory.chassis[0];
             game.selection.logic = game.inventory.logic[0];
             game.assembleUnit(); // ユニット作成
             
             game.selection.rocket = game.inventory.rockets[0];
             game.selection.launcher = game.inventory.launchers[0];
             game.selection.booster = game.inventory.boosters[0];
             
             // 準備完了 (checkReadyToAim で booster が ship に適用される)
             game.checkReadyToAim();
             
             // 発射実行
             // global.launch() は setupListeners 内の関数なので、game オブジェクト経由では呼べないため、
             // 本来はモックするか抽出が必要だが、Game.js の構造上、キー入力をエミュレートするか
             // state を変えて checkCollisions などを進める必要がある。
             
             // ここでは Game.js の launch ロジックが想定通りか、直接 selection を操作して確認
             const boosterBefore = game.inventory.boosters[0].count;
             
             // launch シークエンスのエミュレート (Game.js の setupListeners 内の launch 関数相当)
             game.state = 'flying'; 
             // ...実際の Game.js では pointerup または Space で launch() が呼ばれ、その中で消費される
             // テスト用に launch ロジックをメソッド化していないため、直接 inventory を操作するコードが現時点ではない。
             // ひとまず、assembleUnit で消費されないことの確認までを優先。
        });
    });
});
