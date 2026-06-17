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
            ]
        });

        expect(html).toContain('ANALYTIC ARCHIVE');
        expect(html).toContain('MAX SECTOR');
        expect(html).toContain('graph-line score state-active');
        expect(html).toContain('avg-line sector');
        expect(html).toContain('archive-ranking-well');
        expect(html).toContain('8');
        expect(html).toContain('9,000');
        expect(html).toContain('2026.06.17 10:30');
        expect(html).toContain('★');
        expect(html).toContain('data-replay-id="flight_1"');
        expect(html).toContain('Pilot');
        expect(html).toContain('width: 50%;');
    });

    it('renders the trend graph from recent result data instead of the mockup path', () => {
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
        expect(html).toContain('d="M0,63 L42,15 L84,91"');
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

        expect(html).toContain('d="M0,110 L42,110"');
        expect(html).toContain('y1="110" x2="800" y2="110"');
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
});
