import { describe, it, expect } from 'vitest';
import PricingService from '../../../../src/systems/logic/PricingService.js';

describe('PricingService', () => {
    it('caps combined discounts when calculating final prices', () => {
        const pricingService = new PricingService();

        expect(pricingService.calculateFinalPrice(100, 0.2, 0.3)).toBe(50);
        expect(pricingService.calculateFinalPrice(100, 0.4, 0.3)).toBe(50);
        expect(pricingService.calculateFinalPrice(99, 0.1, 0)).toBe(89);
    });

    it('calculates one-step repair and dismantle costs through the shared discount rule', () => {
        const pricingService = new PricingService();
        const damagedLauncher = {
            charges: 1,
            maxCharges: 4
        };
        const fullLauncher = {
            charges: 4,
            maxCharges: 4
        };

        expect(pricingService.calculateRepairCost(damagedLauncher, 0.2)).toBe(8);
        expect(pricingService.calculateRepairCost(fullLauncher, 0.2)).toBe(8);
        expect(pricingService.calculateDismantleCost(0, 0.2)).toBe(40);
        expect(pricingService.calculateDismantleCost(2, 0.2)).toBe(120);
    });
});
