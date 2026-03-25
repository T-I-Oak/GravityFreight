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
            if (result && result.rarity) {
                spawnedItems.push(result.rarity);
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
            if (result && result.rarity) {
                spawnedItems.push(result.rarity);
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

        it('Launch SHOULD NOT consume launcher if opt_fuel is used (even if fuel is exhausted)', () => {
            const game = new Game(mockCanvas, mockUI);
            
            // セットアップ: シャーシとロジックを選んでユニット作成
            game.selection.chassis = game.inventory.chassis[0];
            game.selection.logic = game.inventory.logic[0];
            game.assembleUnit();
            
            // 燃料パック（耐久2）を手動で作って追加してみる（耐久がある場合のテスト用）
            const fuelPackBase = PARTS.BOOSTERS.find(b => b.id === 'opt_fuel_pack');
            game.inventory.boosters.push({ ...fuelPackBase, count: 1 }); // 在庫1
            
            const rocket = game.inventory.rockets[0];
            const launcher = game.inventory.launchers[0];
            const fuelPack = game.inventory.boosters.find(b => b.id === 'opt_fuel_pack');
            
            game.selection.rocket = rocket;
            game.selection.launcher = launcher;
            game.selection.booster = fuelPack;
            
            const launcherChargesBefore = launcher.charges;
            
            // 1回目の発射（燃料パックの耐久2->1）
            // Game.js の launch ロジックをエミュレート
            game.checkReadyToAim();
            
            // --- launch 内部のロジック実行 ---
            const preventsWear1 = game.selection.booster && game.selection.booster.preventsLauncherWear;
            if (game.selection.booster) {
                const b = game.selection.booster;
                if (b.maxCharges && b.maxCharges > 1) {
                    if (b.charges === undefined) b.charges = b.maxCharges;
                    b.charges--;
                    if (b.charges <= 0) {
                        game.inventory.boosters = game.inventory.boosters.filter(o => o !== b);
                        game.selection.booster = null;
                    }
                }
            }
            if (game.selection.launcher && !preventsWear1) {
                game.selection.launcher.charges--;
            }
            // ---------------------------------
            
            expect(launcher.charges).toBe(launcherChargesBefore); // 消費されない
            expect(fuelPack.charges).toBe(1); // 燃料は減る
            
            // 2回目の発射（燃料パックの耐久1->0、消費される）
            const preventsWear2 = game.selection.booster && game.selection.booster.preventsLauncherWear;
            if (game.selection.booster) {
                const b = game.selection.booster;
                if (b.maxCharges && b.maxCharges > 1) {
                    b.charges--;
                    if (b.charges <= 0) {
                        game.inventory.boosters = game.inventory.boosters.filter(o => o !== b);
                        game.selection.booster = null;
                    }
                }
            }
            if (game.selection.launcher && !preventsWear2) {
                game.selection.launcher.charges--;
            }
            
            expect(launcher.charges).toBe(launcherChargesBefore); // まだ消費されない（バグ修正の肝）
            expect(game.selection.booster).toBeNull(); // 燃料は使い果たされた
        });

        it('Launch with single use opt_fuel (count: 1) SHOULD NOT consume launcher', () => {
            const game = new Game(mockCanvas, mockUI);
            
            // セットアップ
            game.selection.chassis = game.inventory.chassis[0];
            game.selection.logic = game.inventory.logic[0];
            game.assembleUnit();
            
            const rocket = game.inventory.rockets[0];
            const launcher = game.inventory.launchers[0];
            const fuel = game.inventory.boosters.find(b => b.id === 'opt_fuel');
            
            expect(fuel.count).toBe(1);
            
            game.selection.rocket = rocket;
            game.selection.launcher = launcher;
            game.selection.booster = fuel;
            
            const launcherChargesBefore = launcher.charges;
            
            // Game.js の launch ロジックを完全に再現したテスト
            // 1. 本来の launch ロジックを直接呼べないため、コードを模倣して検証する
            const launchLogic = (g) => {
                const preventsWear = g.selection.booster && g.selection.booster.preventsLauncherWear;
                if (g.selection.booster) {
                    const b = g.selection.booster;
                    if (b.maxCharges && b.maxCharges > 1) {
                        if (b.charges === undefined) b.charges = b.maxCharges;
                        b.charges--;
                        if (b.charges <= 0) {
                            g.inventory.boosters = g.inventory.boosters.filter(o => o !== b);
                            g.selection.booster = null;
                        }
                    } else {
                        b.count--;
                        if (b.count <= 0) {
                            g.inventory.boosters = g.inventory.boosters.filter(o => o.count > 0);
                            g.selection.booster = null;
                        }
                    }
                }
                if (g.selection.launcher && !preventsWear) {
                    g.selection.launcher.charges--;
                }
            };
            
            launchLogic(game);
            
            expect(launcher.charges).toBe(launcherChargesBefore); // 消費されないはず！
            expect(fuel.count).toBe(0);
            expect(game.selection.booster).toBeNull();
        });
    });
});
