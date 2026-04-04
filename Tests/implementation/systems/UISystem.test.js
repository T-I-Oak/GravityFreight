/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupStandardDOM } from '../../test-utils.js';
import { UISystem } from '../../../GravityFreight/src/systems/UISystem.js';
import { Game } from '../../../GravityFreight/src/core/Game.js';
import { ITEM_REGISTRY } from '../../../GravityFreight/src/core/Data.js';

// TitleAnimation のモック化
vi.mock('../../../GravityFreight/src/utils/TitleAnimation.js', () => ({
    TitleAnimation: class {
        constructor() {}
        start() {}
        stop() {}
    }
}));

describe('Implementation: UISystem Rendering & Internal Logic', () => {
    let game;
    let uiSystem;
    const mockCanvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
    const mockUI = { status: {}, message: {} };

    beforeEach(() => {
        setupStandardDOM();
        
        game = new Game(mockCanvas, mockUI);
        uiSystem = game.uiSystem;
    });

    describe('Card Rendering (generateCardHTML)', () => {
        it('should render enhanced stats with premium star icons (✦)', () => {
            const item = {
                ...ITEM_REGISTRY['hull_light'],
                precisionMultiplier: 1.5,
                enhancements: { precision: 1 }
            };
            
            const html = uiSystem.generateCardHTML(item);
            expect(html).toContain('stat-tag');
            expect(html).toContain('enhanced-border');
            expect(html).toContain('✦');
        });

        it('should render durability segments for launchers', () => {
            const item = {
                ...ITEM_REGISTRY['pad_standard_d2'],
                maxCharges: 2,
                charges: 2,
                enhancements: { charges: 1 }
            };
            
            const html = uiSystem.generateCardHTML(item, { showInventory: true });
            expect(html).toContain('enhanced-frame');
            expect(html).toContain('enhanced-border'); // Componentized gold style
        });
    });

    describe('Animations & Tooltips', () => {
        it('should trigger pulse animation on coin change', () => {
            const creditsEl = document.getElementById('event-player-credits');
            creditsEl.style.display = 'block'; // Simulate visible
            // JSDOM has no offsetParent support, mocking visibility
            Object.defineProperty(creditsEl, 'offsetParent', { get: () => ({}) });

            uiSystem.animateCoinChange(100);
            expect(creditsEl.classList.contains('pulse')).toBe(true);
        });
    });

    describe('Heavy Style Resets', () => {
        it('should apply class-based reset in title state', () => {
            game.state = 'title';
            const missionHud = document.getElementById('mission-hud');
            // 一旦手動で表示状態にする
            missionHud.classList.remove('hidden');
            
            uiSystem.updateUI();

            expect(missionHud.classList.contains('hidden')).toBe(true);
        });

        it('should restore visibility class in building state', () => {
            game.state = 'title';
            uiSystem.updateUI();
            
            game.state = 'building';
            uiSystem.updateUI();

            const missionHud = document.getElementById('mission-hud');
            expect(missionHud.classList.contains('hidden')).toBe(false);
        });
    });
});
