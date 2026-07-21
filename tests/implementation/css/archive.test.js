import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const ARCHIVE_CSS_FILES = [
    'css/archive.css',
    'css/archive_layout.css',
    'css/archive_achievements.css',
    'css/archive_analytics.css',
    'css/archive_tables.css',
    'css/archive_replay_protect.css',
    'css/archive_responsive.css'
];

function readArchiveCss() {
    return ARCHIVE_CSS_FILES.map(file => readFileSync(file, 'utf-8')).join('\n');
}

describe('archive.css', () => {
    it('keeps the archive overlay hidden until records are opened', () => {
        const css = readArchiveCss();

        expect(css).toContain('#archive-screen-overlay[hidden],');
        expect(css).toContain('#archive-screen-overlay.state-hidden');
        expect(css).toContain('display: none;');
    });

    it('hides inactive ranking tables inside the single ranking well', () => {
        const css = readArchiveCss();

        expect(css).toContain('#archive-screen .archive-ranking-panel[hidden]');
        expect(css).toContain('display: none;');
    });

    it('emphasizes active ranking header and data cells with the same base style', () => {
        const css = readArchiveCss();

        expect(css).toContain('#archive-screen .ArchiveTable.table-header th.state-active,');
        expect(css).toContain('#archive-screen .ArchiveTable.table-body td.state-active');
        expect(css).toContain('background: color-mix(in srgb, currentColor 12%, transparent);');
    });

    it('makes the selected replay row visibly distinct', () => {
        const css = readArchiveCss();

        expect(css).toContain('#archive-screen #tab-replays .ArchiveTable.table-body tr.state-active td');
        expect(css).toContain('background: color-mix(in srgb, var(--color-theme-main), transparent 82%);');
        expect(css).toContain('box-shadow: inset 4px 0 0 var(--color-theme-main);');
    });

    it('keeps new badges visible by truncating the date label first', () => {
        const css = readArchiveCss();

        expect(css).not.toContain('#archive-screen .ArchiveTable td.col-date,');
        expect(css).toContain('#archive-screen .ArchiveTable .date-cell,');
        expect(css).toContain('#archive-screen-overlay .replay-protect-table .date-cell');
        expect(css).toContain('width: 100%;');
        expect(css).toContain('#archive-screen .ArchiveTable .date-cell .date-label,');
        expect(css).toContain('flex: 1 1 auto;');
        expect(css).toContain('#archive-screen .ArchiveTable .date-cell .Badge.state-new,');
        expect(css).toContain('#archive-screen-overlay .Badge.state-new');
        expect(css).toContain('background: var(--color-theme-main);');
        expect(css).toContain('font-size: 8px;');
        expect(css).toContain('margin-left: auto;');
    });

    it('uses the shared two-column achievement card grid', () => {
        const css = readArchiveCss();

        expect(css).toContain('#archive-screen .achievement-showcase');
        expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
        expect(css).toContain('.theme-printing .AchievementCard');
        expect(css).toContain('width: 100%;');
        expect(css).toContain('min-width: 0;');
        expect(css).toContain('@media screen and (max-width: 800px)');
        expect(css).toContain('grid-template-columns: 1fr;');
    });

    it('uses a scrollable story card grid in the archive story tab', () => {
        const css = readArchiveCss();

        expect(css).toContain('#archive-screen #tab-story');
        expect(css).toContain('#archive-screen .archive-story-grid');
        expect(css).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
        expect(css).toContain('#archive-screen .archive-story-grid .archive-story-card');
        expect(css).toContain('#archive-screen .archive-story-grid .archive-story-card.state-disabled');
        expect(css).toContain('#archive-screen .archive-story-grid .archive-story-card.state-disabled .Icon.mail');
        expect(css).toContain('overflow-y: auto;');
    });

    it('wraps archive header tabs on narrow screens instead of overflowing horizontally', () => {
        const css = readArchiveCss();

        expect(css).toContain('#archive-screen .TabGroup');
        expect(css).toContain('flex-wrap: wrap;');
        expect(css).toContain('#archive-screen .panel-header > .TabGroup');
        expect(css).toContain('flex: 0 1 auto;');
        expect(css).toContain('width: 100%;');
    });
});
