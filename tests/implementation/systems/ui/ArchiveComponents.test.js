import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ArchiveComponents } from '../../../../src/systems/ui/ArchiveComponents.js';
import {
    expectNoDuplicateIds,
    expectRequiredClassesInMockupAndActual
} from '../../mockup/mockupClassContract.js';

describe('ArchiveComponents', () => {
    it('renders analytic archive sections from view data', () => {
        const html = ArchiveComponents.generateHTML({
            kpis: {
                totalCompletedSectors: 8,
                lifetimeContracts: 3,
                totalCollectedItems: 21,
                achievementRate: 50
            },
            rankings: {
                score: [
                    { rank: 1, score: 9000, reachedSector: 4, collectedItemCount: 12, createdAt: '2026.06.17 10:30' }
                ],
                sector: [],
                collected: []
            },
            recentResults: [
                { score: 100, reachedSector: 1, collectedItemCount: 2 },
                { score: 300, reachedSector: 3, collectedItemCount: 5 },
                { score: 200, reachedSector: 2, collectedItemCount: 4 }
            ],
            replays: [
                { id: 'flight_1', no: '01', favorite: true, reachedSector: 4, score: 7000, createdAt: '2026.06.17 11:00' }
            ],
            achievements: [
                {
                    title: 'Pilot',
                    method: 'Total Launches',
                    stats: '5 / 10',
                    progressRate: 0.5,
                    achievedTier: 2
                }
            ],
            stories: [
                { id: 'T', title: 'Read Story', isRead: true, className: 'trading-post', icon: 'T' },
                { id: 'TR', title: '???', isRead: false, className: 'repair-dock', icon: 'R' }
            ]
        });

        expect(html).toContain('ANALYTIC ARCHIVE');
        expect(html).toContain('TOTAL CLEAR SECTORS');
        expect(html).toContain('graph-line score state-active');
        expect(html).toContain('avg-line sector');
        expect(html).toContain('archive-ranking-well');
        expect(html).toContain('8');
        expect(html).toContain('9,000');
        expect(html).toContain('2026.06.17 10:30');
        expect(html).toContain('★');
        expect(html).toContain('data-replay-id="flight_1"');
        expect(html).toContain('Pilot');
        expect(html).toContain('data-tab="story"');
        expect(html).toContain('STORY ARCHIVE');
        expect(html).toContain('data-story-id="T"');
        expect(html).toContain('Read Story');
        expect(html).toContain('???');
        expect(html).not.toContain('data-story-id="TR"');
        expect(html).toContain('class="Icon mail"');
        expect(html).not.toContain('facility-icon');
        expect(html).not.toContain('>T</i>');
        expect(html).not.toContain('>✉</i>');
        expect(html).toContain('width: 50%;');
    });

    it('renders the trend graph from recent result data with vertically offset series bands', () => {
        const html = ArchiveComponents.generateHTML({
            kpis: {},
            rankings: { score: [] },
            recentResults: [
                { score: 100, reachedSector: 1, collectedItemCount: 1 },
                { score: 500, reachedSector: 2, collectedItemCount: 3 },
                { score: 250, reachedSector: 5, collectedItemCount: 2 }
            ],
            replays: [],
            achievements: []
        });

        expect(html).toContain('graph-line score state-active');
        expect(html).toContain('class="graph-line score state-active" data-graph-series="score" fill="none" d="M0,53 L42,15 L84,76"');
        expect(html).toContain('class="graph-line item-count" data-graph-series="collected" fill="none" d="M0,50 L42,25 L84,75"');
        expect(html).toContain('class="graph-line sector" data-graph-series="sector" fill="none" d="M0,34 L42,80 L84,95"');
        expect(html).not.toContain('M0,60 L40,50 L80,55');
    });

    it('renders zero-value trend points at the bottom of the fixed twenty-slot graph', () => {
        const html = ArchiveComponents.generateHTML({
            kpis: {},
            rankings: { score: [] },
            recentResults: [
                { score: 0, reachedSector: 0, collectedItemCount: 0 },
                { score: 0, reachedSector: 0, collectedItemCount: 0 }
            ],
            replays: [],
            achievements: []
        });

        expect(html).toContain('class="graph-line score state-active" data-graph-series="score" fill="none" d="M0,91 L42,91"');
        expect(html).toContain('class="graph-line item-count" data-graph-series="collected" fill="none" d="M0,101 L42,101"');
        expect(html).toContain('class="graph-line sector" data-graph-series="sector" fill="none" d="M0,110 L42,110"');
        expect(html).toContain('class="avg-line score" x1="0" y1="91" x2="800" y2="91"');
    });

    it('keeps required archive classes shared with the archive mockup', () => {
        const html = ArchiveComponents.generateHTML({
            kpis: {
                totalCompletedSectors: 8,
                lifetimeContracts: 3,
                totalCollectedItems: 21,
                achievementRate: 50
            },
            rankings: {
                score: [
                    { rank: 1, score: 9000, reachedSector: 4, collectedItemCount: 12, createdAt: '2026.06.17 10:30' }
                ]
            },
            replays: [
                { id: 'flight_1', no: '01', favorite: true, reachedSector: 4, score: 7000, createdAt: '2026.06.17 11:00' },
                { id: 'flight_2', no: '02', favorite: false, reachedSector: 2, score: 3000, createdAt: '2026.06.17 12:00' }
            ],
            achievements: [
                {
                    title: 'Pilot',
                    method: 'Total Launches',
                    stats: '5 / 10',
                    progressRate: 0.5,
                    achievedTier: 2
                },
                {
                    title: 'Locked',
                    method: 'Total Score',
                    stats: '0 / 100',
                    progressRate: 0,
                    achievedTier: null
                }
            ],
            stories: [
                { id: 'T', title: 'Read Story', isRead: true, className: 'trading-post', icon: 'T' },
                { id: 'TR', title: '???', isRead: false, className: 'repair-dock', icon: 'R' }
            ]
        });

        expectRequiredClassesInMockupAndActual({
            mockupPath: 'src/mockup/archive_screen_mockup.html',
            actualHtml: html,
            requiredClasses: [
                'Panel',
                'color-theme-main',
                'archive',
                'panel-header',
                'SplitRow',
                'SplitColumn',
                'TabGroup',
                'Button',
                'ColumnSet',
                'Column',
                'aside',
                'main',
                'kpi-container',
                'Well',
                'tab-content',
                'section',
                'section-header',
                'section-title',
                'ArchiveTable',
                'table-header',
                'table-body',
                'archive-table-scroll-area',
                'achievement-showcase',
                'archive-story-grid',
                'archive-story-card',
                'AchievementCard',
                'panel-footer',
                'button-large',
                'state-secondary',
                'archive-close-button'
            ]
        });
    });

    it('detects duplicate ids in the generated archive markup', () => {
        const html = ArchiveComponents.generateHTML({ kpis: {}, rankings: {}, replays: [], achievements: [] });

        expectNoDuplicateIds(html);
    });

    it('detects duplicate ids in the approved archive mockup', () => {
        const mockupHtml = readFileSync('src/mockup/archive_screen_mockup.html', 'utf8');

        expectNoDuplicateIds(mockupHtml);
    });

    it('keeps archive mockup sidebar labels aligned with the generated archive screen', () => {
        const mockupHtml = readFileSync('src/mockup/archive_screen_mockup.html', 'utf8');
        const actualHtml = ArchiveComponents.generateHTML({
            kpis: {
                totalCompletedSectors: 1,
                lifetimeContracts: 1,
                totalCollectedItems: 1,
                achievementRate: 0
            },
            rankings: {},
            replays: [],
            achievements: []
        });

        expect(mockupHtml).toContain('TOTAL CLEAR SECTORS');
        expect(actualHtml).toContain('TOTAL CLEAR SECTORS');
        expect(mockupHtml).not.toContain('MAX SECTOR');
    });

    it('uses one ranking well and marks the active ranking column', () => {
        const html = ArchiveComponents.generateHTML({
            kpis: {},
            rankings: {
                score: [{ rank: 1, score: 1000, reachedSector: 1, collectedItemCount: 1, createdAt: '2026.06.17 10:00' }],
                sector: [{ rank: 1, score: 2000, reachedSector: 3, collectedItemCount: 1, createdAt: '2026.06.17 11:00' }],
                collected: [{ rank: 1, score: 3000, reachedSector: 2, collectedItemCount: 9, createdAt: '2026.06.17 12:00' }]
            },
            replays: [],
            achievements: []
        });

        document.body.innerHTML = html;

        expect(document.querySelectorAll('.archive-ranking-well')).toHaveLength(1);
        expect(document.querySelectorAll('.archive-ranking-well > [data-ranking-panel]')).toHaveLength(3);
        expect(document.querySelector('[data-ranking-panel="score"] th.col-score').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-ranking-panel="score"] td.col-score').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-ranking-panel="sector"] th.col-sector').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-ranking-panel="sector"] td.col-sector').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-ranking-panel="collected"] th.col-count').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-ranking-panel="collected"] td.col-count').classList.contains('state-active')).toBe(true);
    });

    it('marks latest game ranking and replay records as new', () => {
        const html = ArchiveComponents.generateHTML({
            kpis: {},
            rankings: {
                score: [
                    { rank: 1, score: 1000, reachedSector: 1, collectedItemCount: 1, createdAt: '2026.06.17 10:00', isNew: true },
                    { rank: 2, score: 900, reachedSector: 1, collectedItemCount: 1, createdAt: '2026.06.16 10:00', isNew: false }
                ],
                sector: [],
                collected: []
            },
            replays: [
                { id: 'flight_1', no: '01', favorite: false, reachedSector: 1, score: 1000, createdAt: '2026.06.17 10:00', isNew: true }
            ],
            achievements: []
        });

        document.body.innerHTML = html;

        expect(document.querySelectorAll('#tab-analytics .ArchiveTable tr.state-new')).toHaveLength(1);
        expect(document.querySelector('#tab-analytics .ArchiveTable tr.state-new .date-cell')).not.toBeNull();
        expect(document.querySelector('#tab-analytics .ArchiveTable tr.state-new .Badge.state-new').textContent).toBe('NEW');
        expect(document.querySelector('#tab-analytics .ArchiveTable tr.state-new .date-label').textContent).toBe('2026.06.17 10:00');
        expect(document.querySelectorAll('#tab-replays .ArchiveTable tr.state-new')).toHaveLength(1);
        expect(document.querySelector('#tab-replays .ArchiveTable tr.state-new .date-cell')).not.toBeNull();
        expect(document.querySelector('#tab-replays .ArchiveTable tr.state-new .Badge.state-new').textContent).toBe('NEW');
        expect(document.querySelector('#tab-replays .ArchiveTable tr.state-new .date-label').textContent).toBe('2026.06.17 10:00');
    });

    it('renders achievement tier seals with roman numerals without assuming three tiers', () => {
        const html = ArchiveComponents.generateHTML({
            kpis: {},
            rankings: {},
            replays: [],
            achievements: [
                {
                    title: 'Deep Archive',
                    method: 'Read Stories',
                    stats: '8 / 12',
                    progressRate: 0.75,
                    achievedTier: 4
                }
            ]
        });

        expect(html).toContain('log-bg-seal-group tier-4');
        expect(html).toContain('<span class="seal-num">IV</span>');
        expect(html).not.toContain('<span class="seal-num">4</span>');
    });
});
