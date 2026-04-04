/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { setupStandardDOM } from '../../test-utils.js';
import { InventorySystem } from '../../../GravityFreight/src/systems/InventorySystem.js';
import { UISystem } from '../../../GravityFreight/src/systems/UISystem.js';
import { ITEM_REGISTRY } from '../../../GravityFreight/src/core/Data.js';

describe('InventorySystem.takeItem: instanceId identity', () => {
    it('should not double-select when taking from a stacked item', () => {
        setupStandardDOM();

        const game = {
            state: 'building',
            selection: {
                chassis: null,
                logic: null,
                launcher: null,
                rocket: null,
                modules: {},
                booster: null
            },
            checkReadyToAim: () => {},
            validateModules: () => {},
            incrementCollectedItems: vi.fn(),
            updateUI: () => {}
        };

        const uiSystem = new UISystem(game);
        const inv = new InventorySystem(game);

        const originalInstanceId = 'ID_A';
        const stack = {
            ...ITEM_REGISTRY['hull_light'],
            instanceId: originalInstanceId,
            count: 2,
            enhancements: {}
        };

        inv.inventory = {
            chassis: [stack],
            logic: [],
            launchers: [],
            rockets: [],
            modules: [],
            boosters: []
        };
        game.inventory = inv.inventory;

        // 選択は「インベントリ内の同一オブジェクト参照」を前提にする
        game.selection.chassis = stack;

        // 取り出し（=建造を模倣）
        const taken = inv.takeItem('chassis', originalInstanceId);
        expect(taken).not.toBeNull();
        expect(taken.instanceId).toBe(originalInstanceId);

        expect(inv.inventory.chassis).toHaveLength(1);
        const remaining = inv.inventory.chassis[0];
        expect(remaining.instanceId).not.toBe(originalInstanceId);
        expect(game.selection.chassis.instanceId).toBe(remaining.instanceId);

        // 解体・回収（同一IDを持つが、強化内容が異なるためスタックにマージされない）
        taken.enhancements = { precision: 1 };
        inv.addItem(taken);
        expect(inv.inventory.chassis).toHaveLength(2);

        const ids = inv.inventory.chassis.map(i => i.instanceId);
        expect(new Set(ids).size).toBe(2);

        uiSystem.renderList('chassis-list', inv.inventory.chassis, 'chassis', game.selection.chassis);
        const selectedEls = document.querySelectorAll('#chassis-list .part-item.selected');
        expect(selectedEls.length).toBe(1);
    });
});

