import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';

describe('ui_base.css', () => {
    it('defines shared mobile UI scale tokens for narrow screens', () => {
        const css = readFileSync('css/design_tokens.css', 'utf-8');

        expect(css).toContain('--ui-scale: 1;');
        expect(css).toContain('--mobile-ui-scale-standard: 0.74;');
        expect(css).toContain('--mobile-ui-scale-compact: 0.62;');
        expect(css).toContain('--ui-scale: var(--mobile-ui-scale-standard);');
        expect(css).toContain('--ui-scale: var(--mobile-ui-scale-compact);');
    });

    it('does not use transform scale for responsive UI sizing', () => {
        const cssFiles = readdirSync('css').filter(file => file.endsWith('.css'));
        const responsiveScaleTransforms = cssFiles.flatMap(file => {
            const css = readFileSync(`css/${file}`, 'utf-8');
            return [...css.matchAll(/transform:\s*scale\(var\(--[^)]+\)\)/g)]
                .map(match => ({ file, declaration: match[0] }));
        });

        expect(responsiveScaleTransforms).toEqual([]);
    });

    it('uses dynamic viewport height for mobile Safari chrome instead of only fixed 100vh', () => {
        const baseCss = readFileSync('css/ui_base.css', 'utf-8');
        const layoutCss = readFileSync('css/ui_layout.css', 'utf-8');

        expect(baseCss).toContain('height: 100vh;');
        expect(baseCss).toContain('height: 100dvh;');
        expect(layoutCss).toContain('height: 100vh;');
        expect(layoutCss).toContain('height: 100dvh;');
    });

    it('keeps hidden state elements hidden without important overrides', () => {
        const css = readFileSync('css/ui_base.css', 'utf-8');

        expect(css).toContain('.state-hidden.state-hidden,');
        expect(css).toContain('[hidden][hidden]');
        expect(css).toContain('#title-screen.state-hidden');
        expect(css).toContain('#play-scene-container.state-hidden');
        expect(css).toContain('#play-hud.state-hidden');
        expect(css).toContain('#inventory-panel.state-hidden');
        expect(css).toContain('display: none;');
        expect(css).not.toContain('display: none !important;');
    });
});

describe('ui_primitives.css', () => {
    it('keeps coin category styling separate from numeric coin styling', () => {
        const css = readFileSync('css/ui_primitives.css', 'utf-8');

        expect(css).toContain('.num-coin');
        expect(css).toContain('.num-coin { color: var(--color-num-coin); }');
        expect(css).not.toContain('.coin { color: var(--color-num-coin); }');
        expect(css).not.toContain('.sector, .coin, .score');
    });
});

describe('production CSS z-index rules', () => {
    it('uses layer tokens instead of large direct z-index values', () => {
        const cssFiles = readdirSync('css').filter(file => file.endsWith('.css'));
        const largeDirectZIndexes = cssFiles.flatMap(file => {
            const css = readFileSync(`css/${file}`, 'utf-8');
            return [...css.matchAll(/z-index:\s*(\d+)/g)]
                .map(match => ({ file, value: Number(match[1]) }))
                .filter(entry => entry.value >= 100);
        });

        expect(largeDirectZIndexes).toEqual([]);
    });
});
