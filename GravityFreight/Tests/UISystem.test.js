import { describe, it, expect, vi, beforeEach } from 'vitest';

// DOM環境のモック（インポート前に必要になる可能性があるため先頭で定義）
const createMockElement = (tag = 'div') => ({
    tagName: tag.toUpperCase(),
    onclick: vi.fn(),
    appendChild: vi.fn(),
    remove: vi.fn(),
    classList: { 
        add: vi.fn(), 
        remove: vi.fn(), 
        contains: vi.fn(),
        toggle: vi.fn()
    },
    querySelector: vi.fn((selector) => createMockElement('div')),
    querySelectorAll: vi.fn(() => []),
    getBoundingClientRect: vi.fn(() => ({ left: 100, top: 100, width: 50, height: 20 })),
    innerHTML: '',
    style: {},
    textContent: '',
    offsetParent: {}
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

import { Game } from '../src/core/Game.js';
import { ITEM_REGISTRY } from '../src/core/Data.js';

describe('UI Logic & Component Rendering', () => {
    let game;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        // 各テスト前にモックの中身をリセット
        vi.clearAllMocks();
        game = new Game(mockCanvas, mockUI);
    });

    describe('generateCardHTML', () => {
        it('should render enhanced stats with correct CSS classes and premium star icons (✦)', () => {
            const item = {
                ...ITEM_REGISTRY['hull_light'],
                precisionMultiplier: 1.5,
                enhancements: { precision: 1 }
            };
            
            const html = game.generateCardHTML(item);
            
            // タグ形式のステータスが含まれているか
            expect(html).toContain('stat-tag');
            // 強化クラスが含まれているか
            expect(html).toContain('enhanced-border');
            // オリジナルの水色の星 (✦) と色が指定されているか
            expect(html).toContain('color:#00d4ff');
            expect(html).toContain('✦');
        });

        it('should render gold durability segments and enhanced-frame for enhanced charges', () => {
            const item = {
                ...ITEM_REGISTRY['launcher_basic'],
                maxCharges: 3,
                charges: 3,
                enhancements: { charges: 1 }
            };
            
            const html = game.generateCardHTML(item, { showInventory: true });
            
            // ゴールドカラー (#ffd700) が含まれているか
            expect(html).toContain('#ffd700');
            // 強化フレームクラスが含まれているか
            expect(html).toContain('enhanced-frame');
        });

        it('should hide internal separators in item cards', () => {
            const item = ITEM_REGISTRY['sensor_short'];
            const html = game.generateCardHTML(item);
            
            // 内部の主要要素（part-stats や rocket-details）に border-top が直接設定されていないことを確認
            expect(html).not.toContain('class="part-stats" style="border-top:');
            expect(html).not.toContain('class="rocket-details" style="border-top:');
        });

        it('should render rocket details with module badges and gauges', () => {
            const rocket = {
                name: 'Test Rocket',
                category: 'ROCKETS',
                modules: { 
                    'mod_capacity_inst': { id: 'mod_capacity', name: 'スロット拡張基板', count: 2 }
                }
            };
            
            const html = game.generateCardHTML(rocket);
            
            expect(html).toContain('rocket-details');
            expect(html).toContain('[x 2]'); // 数量バッジ
            expect(html).toContain('rocket-module-row');
        });
    });

    describe('showResult', () => {
        it('should append separate indented cards for bonus items', () => {
            // itemsList のモックコンテナを作成
            const itemsList = createMockElement('div');
            vi.spyOn(document, 'getElementById').mockImplementation((id) => {
                if (id === 'result-items-list') return itemsList;
                return createMockElement(id);
            });

            const cargo = {
                id: 'cargo_safe',
                category: 'CARGO',
                name: 'Supplies',
                isDelivery: true,
                isMatch: true,
                bonusItems: [{ id: 'bonus_item', name: 'Bonus Engine', category: 'MODULES' }]
            };
            
            game.flightResults.items = [cargo];
            game.flightResults.status = 'success';
            
            game.uiSystem.showResult('success');
            
            // 1. Cargo本体 2. Bonusアイテム の計2回 appendChild が呼ばれるはず
            expect(itemsList.appendChild).toHaveBeenCalledTimes(2);
            
            // 2枚目のカード（ボーナス）にインデント（margin-left: 16px）が適用されているか
            const bonusCardHtml = itemsList.appendChild.mock.calls[1][0].innerHTML;
            expect(bonusCardHtml).toContain('margin-left: 16px');
        });
    });

    describe('animateCoinChange', () => {
        it('should create a popup element when coins change', () => {
            game.animateCoinChange(100);
            
            // document.createElement('div') が呼ばれたか
            expect(document.createElement).toHaveBeenCalledWith('div');
            // document.body.appendChild が呼ばれたか
            expect(document.body.appendChild).toHaveBeenCalled();
            
            // ポップアップの内容確認
            const lastCall = document.body.appendChild.mock.calls.length - 1;
            const popup = document.body.appendChild.mock.calls[lastCall][0];
            expect(popup.textContent).toBe('+100');
            expect(popup.classList.add).not.toHaveBeenCalled(); // className 経由で設定
        });
    });
});
