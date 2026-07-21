import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('flight_result.css', () => {
    it('animates staggered flight result item reports', () => {
        const css = readFileSync('css/flight_result.css', 'utf-8');

        expect(css).toContain('#flight-result-screen .acquired-items-list.state-staggered-list .state-staggered-item');
        expect(css).toContain('animation-delay: calc(var(--item-appear-index, 0) * 70ms);');
    });

    it('keeps the replay protect count outside the flexible table row', () => {
        const css = readFileSync('css/flight_result.css', 'utf-8');

        expect(css).toContain('grid-template-rows: auto auto auto minmax(0, 1fr) auto;');
    });

    it('uses the archive new-badge layout in the result replay protect table', () => {
        const css = readFileSync('css/flight_result.css', 'utf-8');

        expect(css).toContain('#flight-result-screen .replay-protect-table .date-cell');
        expect(css).toContain('display: flex;');
        expect(css).toContain('#flight-result-screen .replay-protect-table .date-cell .date-label');
        expect(css).toContain('flex: 1 1 auto;');
        expect(css).toContain('#flight-result-screen .replay-protect-table .date-cell .Badge.state-new');
        expect(css).toContain('margin-left: auto;');
        expect(css).toContain('#flight-result-screen .replay-protect-table .Badge.state-new');
        expect(css).toContain('background: var(--color-theme-main);');
        expect(css).toContain('font-size: 8px;');
    });
});
