import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('facility.css', () => {
    it('keeps facility screen as an overlay while the play scene remains mounted', () => {
        const css = readFileSync('css/facility.css', 'utf-8');
        const screenRule = css.match(/#facility-screen \{[\s\S]*?\}/)?.[0] ?? '';
        const panelRule = css.match(/#facility-screen \.Panel \{[\s\S]*?\}/)?.[0] ?? '';

        expect(screenRule).toContain('position: fixed;');
        expect(screenRule).toContain('inset: 0;');
        expect(screenRule).toContain('z-index: calc(var(--z-panel) - 10);');
        expect(screenRule).toContain('pointer-events: none;');
        expect(panelRule).toContain('pointer-events: auto;');
    });

    it('centers discount badge text vertically', () => {
        const css = readFileSync('css/facility.css', 'utf-8');
        const badgeRule = css.match(/#facility-screen \.Badge\.discount \{[\s\S]*?\}/)?.[0] ?? '';

        expect(badgeRule).toContain('display: inline-flex;');
        expect(badgeRule).toContain('align-items: center;');
        expect(badgeRule).not.toContain('align-items: baseline;');
    });

    it('animates staggered facility item lists', () => {
        const css = readFileSync('css/facility.css', 'utf-8');

        expect(css).toContain('#facility-screen .item-list.state-staggered-list .state-staggered-item');
        expect(css).toContain('animation-delay: calc(var(--item-appear-index, 0) * 70ms);');
    });

    it('keeps each trade item paired with its price and action controls on responsive layouts', () => {
        const css = readFileSync('css/facility.css', 'utf-8');
        const entryRule = css.match(/#facility-screen \.trade-entry \{[\s\S]*?\}/)?.[0] ?? '';
        const actionRule = css.match(/#facility-screen \.trade-action-area \{[\s\S]*?\}/)?.[0] ?? '';

        expect(css.match(/#facility-screen \.trade-item-area \{/g)).toHaveLength(1);
        expect(css.match(/#facility-screen \.trade-action-area \{/g)).toHaveLength(1);
        expect(css.match(/#facility-screen \.trade-action-group \{/g)).toHaveLength(1);
        expect(css.match(/#facility-screen \.trade-price \{/g)).toHaveLength(1);
        expect(entryRule).toContain('display: grid;');
        expect(entryRule).toContain('grid-template-columns: minmax(0, 1fr) calc(132px * var(--ui-scale));');
        expect(entryRule).toContain('align-items: stretch;');
        expect(actionRule).toContain('width: calc(132px * var(--ui-scale));');
        expect(actionRule).toContain('justify-content: flex-start;');
        expect(actionRule).toContain('gap: calc(2px * var(--ui-scale));');
    });
});
