import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';

describe('ui_base.css', () => {
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
