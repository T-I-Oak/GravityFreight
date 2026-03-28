import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Game } from '../src/core/Game.js';

describe('EventSystem UI Handlers', () => {
    let canvas, ui, elementMap;

    beforeEach(() => {
        canvas = { width: 800, height: 600, addEventListener: vi.fn(), getContext: vi.fn(() => ({})) };
        ui = { status: {}, message: {}, credits: {} };
        elementMap = {};
        
        global.document = {
            getElementById: vi.fn((id) => {
                if (!elementMap[id]) {
                    elementMap[id] = { 
                        id, 
                        onclick: null, 
                        classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) },
                        style: {},
                        appendChild: vi.fn(),
                        innerHTML: '',
                        querySelector: vi.fn(() => ({}))
                    };
                }
                return elementMap[id];
            }),
            createElement: vi.fn(() => ({ appendChild: vi.fn(), innerHTML: '', style: {}, classList: { add: vi.fn() } })),
            querySelectorAll: vi.fn(() => [])
        };
        global.window = {
            innerWidth: 1024,
            innerHeight: 768,
            addEventListener: vi.fn(),
            requestAnimationFrame: vi.fn()
        };
    });

    it('should toggle minimized class when View Map is clicked', () => {
        const game = new Game(canvas, ui);
        
        const viewMapBtn = document.getElementById('result-view-map-btn');
        const backBtn = document.getElementById('back-to-result-btn');
        const overlay = document.getElementById('result-overlay');

        expect(viewMapBtn.onclick).toBeDefined();

        viewMapBtn.onclick(new Event('click'));
        expect(overlay.classList.add).toHaveBeenCalledWith('minimized');
        expect(backBtn.classList.remove).toHaveBeenCalledWith('hidden');

        backBtn.onclick(new Event('click'));
        expect(overlay.classList.remove).toHaveBeenCalledWith('minimized');
    });

    it('should calculate map rotation delta correctly', () => {
        const game = new Game(canvas, ui);
        game.lastRotationAngle = 0;
        game.mapRotation = 0;

        const currentAngle = Math.PI / 4;
        let delta = currentAngle - game.lastRotationAngle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        
        game.mapRotation += delta;
        expect(game.mapRotation).toBeCloseTo(Math.PI / 4);
    });
});
