/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { MaintenanceUI } from '../../../GravityFreight/src/systems/ui/MaintenanceUI.js';
import { setupStandardDOM } from '../../test-utils.js';

// TitleAnimation のモック化
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Implementation: MaintenanceUI Repair Cost', () => {
    let game;
    let maintenanceUI;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { 
        status: {}, 
        message: {}, 
        animateCoinChange: vi.fn(),
        updateUI: vi.fn()
    };

    beforeEach(() => {
        setupStandardDOM();
        vi.clearAllMocks();
        game = new Game(mockCanvas, mockUI);
        maintenanceUI = new MaintenanceUI(game, game.uiSystem);
    });

    it('Repair cost should be 10c (before discounts)', () => {
        // Prepare a damaged launcher
        const launcher = { id: 'pad_standard_d2', charges: 1, maxCharges: 2, name: 'Damaged Launcher' };
        game.inventory.launchers = [launcher];
        game.currentCoinDiscount = 0;

        const container = document.createElement('div');
        maintenanceUI.initRepairDock(container);

        // Find the price display in the container
        const priceVal = container.querySelector('.price-val');
        expect(priceVal).not.toBeNull();
        
        // This is expected to FAIL because current hardcoded value is 20
        expect(priceVal.textContent).toBe('10');
    });
});
