import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArchiveDialogView from '../../../../src/systems/ui/ArchiveDialogView.js';
import { ArchiveComponents } from '../../../../src/systems/ui/ArchiveComponents.js';
import ReplayProtectFlow from '../../../../src/systems/ui/ReplayProtectFlow.js';

describe('ArchiveDialogView', () => {
    let operationBinder;

    beforeEach(() => {
        document.body.innerHTML = `
            <button id="archive-btn"></button>
            <div id="archive-screen-overlay" hidden class="theme-matte state-hidden"></div>
        `;
        operationBinder = vi.fn((element, handler) => {
            element.addEventListener('click', event => handler(element, event));
        });
    });

    function createReplayProtectFlow(handler, recordsProvider) {
        const flow = new ReplayProtectFlow({
            document,
            operationBinder,
            gameDataRepository: {
                getUiText: vi.fn(key => ({
                    'flightResult.favoriteLimit.title': 'PROTECT LIMIT REACHED',
                    'flightResult.favoriteLimit.message': 'Select a protected replay to unprotect.',
                    'flightResult.favoriteLimit.archiveMessage': 'Release another protected record first.',
                    'flightResult.favoriteLimit.count': '{count}/{max} protected',
                    'flightResult.favoriteLimit.sector': 'SECTOR',
                    'flightResult.favoriteLimit.score': 'SCORE',
                    'flightResult.favoriteLimit.protectColumn': 'PROTECT',
                    'flightResult.favoriteLimit.noColumn': 'NO.',
                    'flightResult.favoriteLimit.dateColumn': 'DATE TIME',
                    'flightResult.favoriteLimit.currentRecord': 'CURRENT',
                    'flightResult.favoriteLimit.currentDate': 'CURRENT FLIGHT',
                    'flightResult.favoriteLimit.ok': 'OK',
                    'flightResult.favoriteLimit.cancel': 'CANCEL'
                })[key])
            }
        });
        flow.setCommitHandler(handler);
        flow.setRecordsProvider(recordsProvider);
        return flow;
    }

    it('binds the title records button and renders archive HTML', () => {
        const view = new ArchiveDialogView({ document, operationBinder });
        const openHandler = vi.fn();

        view.initialize();
        view.setOpenHandler(openHandler);
        document.querySelector('#archive-btn').click();
        view.show({ kpis: {}, rankings: {}, replays: [], achievements: [] }, {
            generateHTML: () => '<article id="archive-screen"><footer class="panel-footer"><button class="Button state-secondary archive-close-button">CLOSE</button></footer></article>'
        });

        expect(openHandler).toHaveBeenCalledTimes(1);
        expect(document.querySelector('#archive-screen-overlay').hidden).toBe(false);
        expect(document.querySelector('#archive-screen').textContent).toContain('CLOSE');
    });

    it('closes the archive overlay from the generated close button', () => {
        const view = new ArchiveDialogView({ document, operationBinder });

        view.show({ kpis: {}, rankings: {}, replays: [], achievements: [] }, {
            generateHTML: () => '<article id="archive-screen"><footer class="panel-footer"><button class="Button state-secondary archive-close-button">CLOSE</button></footer></article>'
        });
        document.querySelector('.archive-close-button').click();

        expect(document.querySelector('#archive-screen-overlay').hidden).toBe(true);
        expect(document.querySelector('#archive-screen-overlay').classList.contains('state-hidden')).toBe(true);
    });

    it('switches personal best ranking panels', () => {
        const view = new ArchiveDialogView({ document, operationBinder });

        view.show({
            kpis: {},
            rankings: {
                score: [{ rank: 1, score: 1000, reachedSector: 1, collectedItemCount: 1, createdAt: '2026.06.17 10:00' }],
                sector: [{ rank: 1, score: 2000, reachedSector: 4, collectedItemCount: 2, createdAt: '2026.06.17 11:00' }],
                collected: [{ rank: 1, score: 3000, reachedSector: 2, collectedItemCount: 9, createdAt: '2026.06.17 12:00' }]
            },
            recentResults: [
                { score: 1000, reachedSector: 1, collectedItemCount: 1 },
                { score: 2000, reachedSector: 4, collectedItemCount: 9 }
            ],
            replays: [],
            achievements: []
        }, ArchiveComponents);

        expect(document.querySelector('[data-ranking-panel="score"]').hidden).toBe(false);
        expect(document.querySelector('[data-ranking-panel="sector"]').hidden).toBe(true);
        expect(document.querySelector('.graph-line.score').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('.graph-line.sector').classList.contains('state-active')).toBe(false);

        document.querySelector('[data-ranking="sector"]').click();

        expect(document.querySelector('[data-ranking="score"]').classList.contains('state-inactive')).toBe(true);
        expect(document.querySelector('[data-ranking="sector"]').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-ranking-panel="score"]').hidden).toBe(true);
        expect(document.querySelector('[data-ranking-panel="sector"]').hidden).toBe(false);
        expect(document.querySelector('.graph-line.score').classList.contains('state-active')).toBe(false);
        expect(document.querySelector('.graph-line.sector').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('.legend.score').classList.contains('state-active')).toBe(false);
        expect(document.querySelector('.legend.sector').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-ranking-panel="sector"]').textContent).toContain('2,000');
    });

    it('selects a replay row and starts replay from the selected record id', () => {
        const view = new ArchiveDialogView({ document, operationBinder });
        const replayStartHandler = vi.fn();

        view.setReplayStartHandler(replayStartHandler);
        view.show({
            kpis: {},
            rankings: {},
            recentResults: [],
            replays: [
                { id: 'flight_1', no: '01', favorite: true, reachedSector: 4, score: 7000, createdAt: '2026.06.17 11:00' },
                { id: 'flight_2', no: '02', favorite: false, reachedSector: 2, score: 3000, createdAt: '2026.06.17 12:00' }
            ],
            achievements: []
        }, ArchiveComponents);

        const playButton = document.querySelector('#btn-play-replay');
        expect(playButton.disabled).toBe(true);

        document.querySelector('[data-replay-id="flight_2"]').click();

        expect(playButton.disabled).toBe(false);
        expect(document.querySelector('[data-replay-id="flight_2"]').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-replay-id="flight_1"]').classList.contains('state-inactive')).toBe(true);

        playButton.click();

        expect(replayStartHandler).toHaveBeenCalledWith('flight_2');
    });

    it('toggles replay favorite state without selecting the replay row', () => {
        const records = [
            { id: 'flight_1', no: '01', favorite: true, reachedSector: 4, score: 7000, createdAt: '2026.06.17 11:00' },
            { id: 'flight_2', no: '02', favorite: false, reachedSector: 2, score: 3000, createdAt: '2026.06.17 12:00' }
        ];
        const favoriteHandler = vi.fn(request => ({ id: request.recordId, favorite: request.favorite }));
        const view = new ArchiveDialogView({
            document,
            operationBinder,
            replayProtectFlow: createReplayProtectFlow(favoriteHandler, () => records)
        });

        view.show({
            kpis: {},
            rankings: {},
            recentResults: [],
            replays: records,
            achievements: []
        }, ArchiveComponents);

        document.querySelector('[data-replay-favorite="flight_2"]').click();

        expect(favoriteHandler).toHaveBeenCalledWith(expect.objectContaining({
            source: 'archive',
            recordId: 'flight_2',
            favorite: true
        }));
        expect(document.querySelector('[data-replay-favorite="flight_2"]').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-replay-id="flight_2"]').classList.contains('state-active')).toBe(false);
    });

    it('keeps the sixth archive protect operation off and shows an inline limit message', () => {
        const records = [
            { id: 'flight_1', no: '01', favorite: true, reachedSector: 4, score: 7000, createdAt: '2026.06.17 11:00' },
            { id: 'flight_2', no: '02', favorite: true, reachedSector: 3, score: 6000, createdAt: '2026.06.17 12:00' },
            { id: 'flight_3', no: '03', favorite: true, reachedSector: 2, score: 5000, createdAt: '2026.06.17 13:00' },
            { id: 'flight_4', no: '04', favorite: true, reachedSector: 2, score: 4000, createdAt: '2026.06.17 14:00' },
            { id: 'flight_5', no: '05', favorite: true, reachedSector: 1, score: 3000, createdAt: '2026.06.17 15:00' },
            { id: 'flight_6', no: '06', favorite: false, reachedSector: 1, score: 2000, createdAt: '2026.06.17 16:00' }
        ];
        const favoriteHandler = vi.fn(request => ({ id: request.recordId, favorite: request.favorite }));
        const view = new ArchiveDialogView({
            document,
            operationBinder,
            replayProtectFlow: createReplayProtectFlow(favoriteHandler, () => records)
        });

        view.show({
            kpis: {},
            rankings: {},
            recentResults: [],
            replays: records,
            achievements: []
        }, ArchiveComponents);

        document.querySelector('[data-replay-favorite="flight_6"]').click();

        expect(document.querySelector('[data-replay-favorite="flight_6"]').classList.contains('state-active')).toBe(false);
        expect(document.querySelector('.replay-protect-modal')).toBeNull();
        expect(document.querySelector('.archive-protect-toast').textContent).toContain('Release another protected record first.');
        expect(document.querySelector('.archive-protect-toast').classList.contains('state-active')).toBe(true);
        expect(favoriteHandler).not.toHaveBeenCalled();
    });
});
