/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { setupStandardDOM } from '../../test-utils.js';

// TitleAnimation のモック化
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Implementation: EconomySystem Enhancement', () => {
    let game;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        setupStandardDOM();
        vi.clearAllMocks();
        game = new Game(mockCanvas, mockUI);
    });

    it('enhanceItem should update stats based on choice', () => {
        const item = { id: 'hull_light', slots: 1, name: 'Light Chassis' };
        
        // Mock Math.random to pick 'slots' (index 2 in ['precision', 'pickup', 'slots'])
        vi.spyOn(Math, 'random').mockReturnValue(0.8); 
        
        game.economySystem.enhanceItem(item);
        
        expect(item.slots).toBe(2);
        expect(item.enhancements.slots).toBe(1);
        expect(item.enhancementCount).toBe(1);
    });

    it('enhanceItem should update precisionMultiplier', () => {
        const item = { id: 'hull_light', precisionMultiplier: 1.0, name: 'Light Chassis' };
        
        // Mock Math.random to pick 'precision' (index 0 in ['precision', 'pickup', 'slots'])
        vi.spyOn(Math, 'random').mockReturnValue(0.0); 
        
        game.economySystem.enhanceItem(item);
        
        expect(item.precisionMultiplier).toBe(1.2);
    });

    it('enhanceItem should repair charges if not at max', () => {
        const item = { id: 'pad_standard_d2', charges: 1, maxCharges: 2, name: 'Launcher' };
        
        // Mock Math.random to pick 'charges'
        // options for launcher are ['precision', 'pickup', 'slots', 'charges']
        vi.spyOn(Math, 'random').mockReturnValue(0.9); // Should pick charges
        
        game.economySystem.enhanceItem(item);
        
        expect(item.charges).toBe(2);
        expect(item.enhancementCount).toBeUndefined(); // Repair only
    });
});
