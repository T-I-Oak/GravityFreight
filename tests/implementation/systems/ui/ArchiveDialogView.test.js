import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArchiveDialogView from '../../../../src/systems/ui/ArchiveDialogView.js';
import { ArchiveComponents } from '../../../../src/systems/ui/ArchiveComponents.js';

describe('ArchiveDialogView', () => {
    let operationBinder;

    beforeEach(() => {
        document.body.innerHTML = `
            <button id="archive-btn"></button>
            <div id="archive-screen-overlay" hidden class="theme-matte state-hidden"></div>
        `;
        operationBinder = vi.fn((element, handler) => {
            element.addEventListener('click', () => handler(element));
        });
    });

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
});
