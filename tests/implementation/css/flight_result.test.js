import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('flight_result.css', () => {
    it('animates staggered flight result item reports', () => {
        const css = readFileSync('css/flight_result.css', 'utf-8');

        expect(css).toContain('#flight-result-screen .acquired-items-list.state-staggered-list .state-staggered-item');
        expect(css).toContain('animation-delay: calc(var(--item-appear-index, 0) * 70ms);');
    });
});
