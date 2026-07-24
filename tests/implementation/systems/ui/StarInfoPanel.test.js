import { beforeEach, describe, expect, it } from 'vitest';
import StarInfoPanel from '../../../../src/systems/ui/StarInfoPanel.js';

function setupPanel() {
    document.body.innerHTML = `
        <div id="star-info-panel" class="Panel StarInfoPanel state-hidden" hidden>
            <h3 id="star-info-title"></h3>
            <div id="star-info-list"></div>
        </div>
    `;
    const panel = document.querySelector('#star-info-panel');
    Object.defineProperty(panel, 'offsetWidth', { configurable: true, value: 280 });
    Object.defineProperty(panel, 'offsetHeight', { configurable: true, value: 160 });
    return panel;
}

function item() {
    return {
        id: 'coin_100',
        uid: 'coin_100_1',
        category: 'coin',
        equals: candidate => candidate.id === 'coin_100',
        getViewData: () => ({
            id: 'coin_100',
            uid: 'coin_100_1',
            name: '100c Coin',
            category: 'coin',
            stats: {}
        })
    };
}

describe('StarInfoPanel', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('clamps popup position using the rendered canvas size instead of internal pixel size', () => {
        const panel = setupPanel();
        const canvas = {
            width: 800,
            height: 1200,
            getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                width: 400,
                height: 600
            })
        };
        const view = new StarInfoPanel({ document });

        view.show({ isHome: false, items: [item()] }, { x: 390, y: 590 }, canvas);

        expect(panel.style.left).toBe('90px');
        expect(panel.style.top).toBe('410px');
        expect(parseFloat(panel.style.left) + panel.offsetWidth).toBeLessThanOrEqual(400);
        expect(parseFloat(panel.style.top) + panel.offsetHeight).toBeLessThanOrEqual(600);
    });

    it('measures the popup after it is visible so hidden layout does not bypass clamping', () => {
        const panel = setupPanel();
        Object.defineProperty(panel, 'offsetWidth', {
            configurable: true,
            get: () => (panel.hidden || panel.classList.contains('state-hidden') ? 0 : 280)
        });
        Object.defineProperty(panel, 'offsetHeight', {
            configurable: true,
            get: () => (panel.hidden || panel.classList.contains('state-hidden') ? 0 : 160)
        });
        const canvas = {
            getBoundingClientRect: () => ({
                left: 0,
                top: 0,
                width: 400,
                height: 600
            })
        };
        const view = new StarInfoPanel({ document });

        view.show({ isHome: false, items: [item()] }, { x: 390, y: 590 }, canvas);

        expect(panel.hidden).toBe(false);
        expect(panel.classList.contains('state-hidden')).toBe(false);
        expect(parseFloat(panel.style.left) + panel.offsetWidth).toBeLessThanOrEqual(400);
        expect(parseFloat(panel.style.top) + panel.offsetHeight).toBeLessThanOrEqual(600);
    });
});
