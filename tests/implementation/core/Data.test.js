import { describe, it, expect } from 'vitest';
import { PARTS } from '../../../GravityFreight/src/core/Data.js';

describe('Item Data Integrity', () => {
    it('Chassis should have mass, slots, and precision', () => {
        PARTS.CHASSIS.forEach(item => {
            expect(item.mass, `Chassis ${item.id} should have mass`).toBeDefined();
            expect(item.mass).toBeGreaterThan(0);
            expect(item.slots, `Chassis ${item.id} should have slots`).toBeDefined();
            expect(item.precision, `Chassis ${item.id} should have precision`).toBeDefined();
        });
    });

    it('Logic should have mass and pickupRange, but NOT slots', () => {
        PARTS.LOGIC.forEach(item => {
            expect(item.mass, `Logic ${item.id} should have mass`).toBeDefined();
            expect(item.mass).toBeGreaterThan(0);
            expect(item.pickupRange, `Logic ${item.id} is missing pickupRange`).toBeDefined();
            expect(item.slots, `Logic ${item.id} should NOT have slots`).toBeUndefined();
        });
    });

    it('Module should have mass', () => {
        PARTS.MODULES.forEach(item => {
            expect(item.mass, `Module ${item.id} should have mass`).toBeDefined();
            expect(item.mass).toBeGreaterThan(0);
        });
    });

    it('Launcher should NOT have mass or slots', () => {
        PARTS.LAUNCHERS.forEach(item => {
            expect(item.mass, `Launcher ${item.id} should NOT have mass`).toBeUndefined();
            expect(item.slots, `Launcher ${item.id} should NOT have slots`).toBeUndefined();
        });
    });

    it('Booster should NOT have mass or slots', () => {
        PARTS.BOOSTERS.forEach(item => {
            expect(item.mass, `Booster ${item.id} should NOT have mass`).toBeUndefined();
            expect(item.slots, `Booster ${item.id} should NOT have slots`).toBeUndefined();
        });
    });

    it('Coin should NOT have mass', () => {
        PARTS.COIN.forEach(item => {
            expect(item.mass, `Coin ${item.id} should NOT have mass`).toBeUndefined();
        });
    });

    it('Cargo should NOT have mass', () => {
        PARTS.CARGO.forEach(item => {
            expect(item.mass, `Cargo ${item.id} should NOT have mass`).toBeUndefined();
        });
    });

    it('Chassis should have precision', () => {
        PARTS.CHASSIS.forEach(item => {
            expect(item.precision, `Chassis ${item.id} should have precision`).toBeDefined();
        });
    });

    it('Launcher should have power', () => {
        PARTS.LAUNCHERS.forEach(item => {
            expect(item.power, `Launcher ${item.id} should have power`).toBeDefined();
        });
    });
});
