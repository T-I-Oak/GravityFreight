import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

describe('archive.css', () => {
    it('keeps the archive overlay hidden until records are opened', () => {
        const css = readFileSync('css/archive.css', 'utf-8');

        expect(css).toContain('#archive-screen-overlay[hidden],');
        expect(css).toContain('#archive-screen-overlay.state-hidden');
        expect(css).toContain('display: none;');
    });

    it('hides inactive ranking tables inside the single ranking well', () => {
        const css = readFileSync('css/archive.css', 'utf-8');

        expect(css).toContain('#archive-screen .archive-ranking-panel[hidden]');
        expect(css).toContain('display: none;');
    });

    it('emphasizes active ranking header and data cells with the same base style', () => {
        const css = readFileSync('css/archive.css', 'utf-8');

        expect(css).toContain('#archive-screen .ArchiveTable.table-header th.state-active,');
        expect(css).toContain('#archive-screen .ArchiveTable.table-body td.state-active');
        expect(css).toContain('background: color-mix(in srgb, currentColor 12%, transparent);');
    });

    it('makes the selected replay row visibly distinct', () => {
        const css = readFileSync('css/archive.css', 'utf-8');

        expect(css).toContain('#archive-screen #tab-replays .ArchiveTable.table-body tr.state-active td');
        expect(css).toContain('background: color-mix(in srgb, var(--color-theme-main), transparent 82%);');
        expect(css).toContain('box-shadow: inset 4px 0 0 var(--color-theme-main);');
    });
});
