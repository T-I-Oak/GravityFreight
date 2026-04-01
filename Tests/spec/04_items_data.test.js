import { describe, it, expect } from 'vitest';
import { INITIAL_INVENTORY, INITIAL_COINS, CATEGORY_COLORS } from '../../GravityFreight/src/core/Data.js';

describe('Spec: Items & Data (Chapter 4)', () => {
    describe('4.4 Initial Setup Data', () => {
        it('should provide initial parts: 2 chassis, 2 logic, 2 launchers, 1 module, 2 boosters', () => {
            expect(INITIAL_INVENTORY.chassis.length).toBe(2);
            expect(INITIAL_INVENTORY.chassis.some(i => i.id === 'hull_light')).toBe(true);
            expect(INITIAL_INVENTORY.chassis.some(i => i.id === 'hull_medium')).toBe(true);
            
            expect(INITIAL_INVENTORY.logic.length).toBe(2);
            expect(INITIAL_INVENTORY.launchers.length).toBe(2);
            expect(INITIAL_INVENTORY.modules.length).toBe(1);
            expect(INITIAL_INVENTORY.boosters.length).toBe(2);
        });

        it('should start with 0 coins', () => {
            expect(INITIAL_COINS).toBe(0);
        });
    });

    describe('4.4 Item Category Colors', () => {
        it('should have correct color definitions', () => {
            expect(CATEGORY_COLORS.CHASSIS).toBe('#ffab40');
            expect(CATEGORY_COLORS.LOGIC).toBe('#00bcd4');
            expect(CATEGORY_COLORS.LAUNCHERS).toBe('#4caf50');
            expect(CATEGORY_COLORS.MODULES).toBe('#9c27b0');
            expect(CATEGORY_COLORS.ROCKETS).toBe('#c0c0c0');
            expect(CATEGORY_COLORS.COIN).toBe('#ffd700');
            expect(CATEGORY_COLORS.CARGO).toBe('#00e5ff');
        });
    });
});
