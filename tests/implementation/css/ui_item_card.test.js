import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('ui_item_card.css', () => {
    it('allows real item cards to be scaled by their owning context', () => {
        const css = readFileSync('css/ui_item_card.css', 'utf-8');

        expect(css).toContain('--item-card-scale: var(--ui-scale);');
        expect(css).toContain('--card-padding-y: calc(8px * var(--item-card-scale));');
        expect(css).toContain('--card-padding-x: calc(12px * var(--item-card-scale));');
        expect(css).toContain('font-size: calc(13px * var(--item-card-scale));');
        expect(css).toContain('font-size: calc(11px * var(--item-card-scale));');
        expect(css).toContain('font-size: calc(9px * var(--item-card-scale));');
    });

    it('scales property display spacing with the item card scale', () => {
        const css = readFileSync('css/ui_item_card.css', 'utf-8');

        expect(css).toContain('margin-top: calc(4px * var(--item-card-scale));');
        expect(css).toContain('padding-top: calc(4px * var(--item-card-scale));');
        expect(css).toContain('gap: calc(12px * var(--item-card-scale));');
        expect(css).toContain('gap: calc(4px * var(--item-card-scale));');
        expect(css).toContain('padding: calc(1px * var(--item-card-scale)) calc(8px * var(--item-card-scale));');
        expect(css).toContain('padding: calc(2px * var(--item-card-scale)) calc(6px * var(--item-card-scale));');
        expect(css).toContain('margin-right: calc(1px * var(--item-card-scale));');
    });

    it('keeps item card property structure out of theme styles', () => {
        const neonCss = readFileSync('css/ui_style_neon.css', 'utf-8');

        expect(neonCss).not.toContain('.theme-neon .item-card-prop-group');
        expect(neonCss).not.toContain('.theme-neon .item-card-prop-value');
        expect(neonCss).not.toContain('font-size: 11px;');
    });
});
