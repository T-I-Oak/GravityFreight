/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UISystem } from '../../../../GravityFreight/src/systems/UISystem.js';
import { setupStandardDOM } from '../../../test-utils.js';

describe('Implementation: systems/ui/StarInfoPanel.js', () => {
    let game;
    let ui;

    beforeEach(() => {
        setupStandardDOM();
        game = {
            state: 'flying',
            mousePos: { x: 100, y: 100 },
            canvas: { width: 800, height: 600 },
            hoveredStar: null,
            inventory: { chassis: [], logic: [], modules: [], boosters: [], launchers: [], rockets: [] },
            storySystem: { sessionUnlocked: [] },
            updateUI: vi.fn()
        };
        ui = new UISystem(game);
    });

    it('should show star info panel when hovering over a star with items', () => {
        const starPanel = document.getElementById('star-info-panel');
        game.hoveredStar = {
            isHome: false,
            isCollected: false,
            items: [
                { id: 'PARTS_A', category: 'CHASSIS', rarity: 'COMMON' }
            ]
        };
        
        ui.starInfoPanel.update();
        
        expect(starPanel.classList.contains('hidden')).toBe(false);
        expect(starPanel.style.left).not.toBe('');
        expect(document.getElementById('star-info-title').textContent).toBe('STAR ITEMS');
    });

    it('should hide star info panel when not hovering', () => {
        const starPanel = document.getElementById('star-info-panel');
        starPanel.classList.remove('hidden');
        game.hoveredStar = null;
        
        ui.starInfoPanel.update();
        
        expect(starPanel.classList.contains('hidden')).toBe(true);
    });
});
