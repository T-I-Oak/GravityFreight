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

    it('allows result header title and replay badges to wrap by available width', () => {
        const css = readFileSync('css/flight_result.css', 'utf-8');
        const headerRule = css.match(/#flight-result-screen \.flight-result-header \{[\s\S]*?\}/)?.[0] ?? '';
        const titleRule = css.match(/#flight-result-screen \.flight-result-header \.panel-title \{[\s\S]*?\}/)?.[0] ?? '';
        const statusRule = css.match(/#flight-result-screen \.flight-result-header \.flight-report-status \{[\s\S]*?\}/)?.[0] ?? '';
        const badgeRule = css.match(/\.flight-report-status \.Badge \{[\s\S]*?\}/)?.[0] ?? '';

        expect(headerRule).toContain('display: flex;');
        expect(headerRule).toContain('justify-content: space-between;');
        expect(headerRule).toContain('flex-wrap: wrap;');
        expect(headerRule).toContain('gap: var(--space-unit) var(--space-double);');
        expect(titleRule).toContain('flex: 1 1 18ch;');
        expect(titleRule).toContain('min-width: min(100%, 18ch);');
        expect(css).toContain('.flight-report-status');
        expect(statusRule).toContain('flex: 0 1 auto;');
        expect(statusRule).toContain('flex-wrap: wrap;');
        expect(css).toContain('.flight-report-status .Badge');
        expect(badgeRule).toContain('white-space: nowrap;');
    });

    it('does not rely on a viewport breakpoint to stack the result header', () => {
        const css = readFileSync('css/flight_result.css', 'utf-8');

        expect(css).not.toContain('#flight-result-screen .panel-header.SplitRow');
        expect(css).not.toContain('#flight-result-screen .panel-header.SplitRow .flight-report-status');
    });
});
