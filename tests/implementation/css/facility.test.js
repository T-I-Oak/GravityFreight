import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('facility.css', () => {
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
});
