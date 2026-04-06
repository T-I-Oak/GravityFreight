import { describe, it, expect } from 'vitest';
import { ITEM_REGISTRY } from '../../../GravityFreight/src/core/Data.js';

describe('Implementation: core/Data.js', () => {
    it('opt_fuel (High Reactant Fuel) should have 1 maxCharges', () => {
        const item = ITEM_REGISTRY['opt_fuel'];
        expect(item).not.toBeUndefined();
        
        // This is expected to FAIL because current charges isn't defined
        expect(item.maxCharges).toBe(1);
    });

    it('opt_fuel (High Reactant Fuel) should have the correct description', () => {
        const item = ITEM_REGISTRY['opt_fuel'];
        const targetDesc = '発射台の燃料の代わりに使用できる1回分の強化燃料。';
        
        // This is expected to FAIL because current description is different
        expect(item.description).toBe(targetDesc);
    });

    it('opt_fuel_pack should have the correct description', () => {
        const item = ITEM_REGISTRY['opt_fuel_pack'];
        const targetDesc = '発射台の燃料の代わりに使用できる2回分の強化燃料。';
        
        // This is expected to FAIL because current description is different
        expect(item.description).toBe(targetDesc);
    });
});
