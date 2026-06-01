import { describe, expect, it } from 'vitest';
import {
    PARTS,
    createItemViewData,
    createMockItem,
    createRocketItemViewData
} from '../../../src/mockup/mock_data.js';

describe('mock_data view data helpers', () => {
    it('should create ItemViewData from an Item instance method', () => {
        const viewData = createItemViewData(PARTS.launcher[0], { charges: 1 });

        expect(viewData.id).toBe(PARTS.launcher[0].id);
        expect(viewData.stats).toBeDefined();
        expect(viewData.stats.charges.value).toBe(1);
        expect(viewData.stats.maxCharges.value).toBe(PARTS.launcher[0].maxCharges);
    });

    it('should expose a mock Item instance for state setup', () => {
        const item = createMockItem(PARTS.module[0], { slots: 3 });

        expect(item.getViewData().stats.slots.value).toBe(3);
    });

    it('should create RocketItem view data with nested module view data', () => {
        const viewData = createRocketItemViewData({
            chassis: PARTS.chassis[0],
            logic: PARTS.logic[0],
            modules: [
                { source: PARTS.module[0] },
                { source: PARTS.module[0] }
            ]
        });

        expect(viewData.category).toBe('rocket');
        expect(viewData.stats.slots.value).toBeGreaterThan(0);
        expect(viewData.modules).toHaveLength(1);
        expect(viewData.modules[0].count).toBe(2);
    });
});
