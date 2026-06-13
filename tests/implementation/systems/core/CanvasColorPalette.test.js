import { describe, expect, it, vi } from 'vitest';
import CanvasColorPalette from '../../../../src/systems/core/CanvasColorPalette.js';

function createPalette(values) {
    const style = {
        getPropertyValue: vi.fn(token => values[token] || '')
    };

    return {
        style,
        palette: new CanvasColorPalette({
            root: {},
            computedStyleProvider: vi.fn(() => style)
        })
    };
}

describe('CanvasColorPalette', () => {
    it('resolves canvas world colors from CSS custom properties', () => {
        const { palette, style } = createPalette({
            '--color-world-boundary': 'boundary-token',
            '--color-world-prediction': 'prediction-token',
            '--color-world-trail': 'trail-token',
            '--color-world-scanner': 'scanner-token',
            '--color-world-rocket': 'rocket-token',
            '--color-world-home-star': 'home-token',
            '--color-world-normal-star': 'normal-token',
            '--color-world-repulsive-star': 'repulsive-token',
            '--color-category-chassis': 'chassis-token',
            '--color-category-logic': 'logic-token',
            '--color-category-module': 'module-token',
            '--color-category-rockets': 'rocket-category-token',
            '--color-category-launchers': 'launcher-token',
            '--color-category-boosters': 'booster-token',
            '--color-category-coin': 'coin-token',
            '--color-category-cargo': 'cargo-token',
            '--color-facility-trading-post': 'trading-token',
            '--color-facility-repair-dock': 'repair-token',
            '--color-facility-black-market': 'market-token'
        });

        const colors = palette.createWorldColors();

        expect(colors.boundary).toBe('boundary-token');
        expect(colors.categories.launcher).toBe('launcher-token');
        expect(colors.categories.cargo).toBe('cargo-token');
        expect(colors.facilities.REPAIR_DOCK).toBe('repair-token');
        expect(style.getPropertyValue).toHaveBeenCalledWith('--color-category-launchers');
    });

    it('creates star particle rgba from the CSS RGB token', () => {
        const { palette } = createPalette({
            '--color-world-star-particle-rgb': '10, 20, 30'
        });

        expect(palette.createStarParticleColor(0.5)).toBe('rgba(10, 20, 30, 0.5)');
    });

    it('throws when a required CSS color token is missing', () => {
        const { palette } = createPalette({});

        expect(() => palette.get('worldBg')).toThrow('[CanvasColorPalette] CSS color token is not defined: --color-world-bg');
    });
});
