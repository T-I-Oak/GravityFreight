import { describe, it, expect, vi, beforeEach } from 'vitest';
import UIController from '../../../../src/systems/ui/UIController.js';

function createRepository() {
    return {
        getStoryContent: vi.fn(() => ({
            title: 'Story',
            discovery: 'Discovery',
            branch: 'T'
        })),
        getFacilityDefinition: vi.fn(() => ({
            className: 'trading-post'
        })),
        getUiText: vi.fn(key => ({
            'flightResult.replay.recorded': 'RECORDED',
            'flightResult.replay.notRecorded': 'NOT RECORDED',
            'flightResult.replay.protected': 'PROTECTED',
            'flightResult.replay.protectRecord': 'PROTECT RECORD',
            'flightResult.sections.performance': 'FLIGHT PERFORMANCE DATA',
            'flightResult.sections.assets': 'COLLECTED SPACE ASSETS',
            'flightResult.stats.score': 'FLIGHT SCORE',
            'flightResult.stats.credits': 'CREDITS EARNED',
            'flightResult.actions.viewMap': 'VIEW MAP',
            'flightResult.actions.continue': 'CONTINUE',
            'flightResult.bonusTitle': 'DELIVERY BONUS'
        })[key])
    };
}

function createViewData() {
    return {
        title: 'SECTOR 3 COMPLETED',
        themeClass: 'trading-post',
        totalScore: 3260,
        totalCoins: 30,
        actionLabel: 'TO TRADING POST',
        replay: { recorded: true, favorite: false, pending: false },
        entries: [
            { label: 'Goal Bonus', score: 3000, coin: 30 }
        ],
        itemReport: [],
        storyCards: []
    };
}

describe('UIController', () => {
    let repository;
    let soundController;

    beforeEach(() => {
        document.body.innerHTML = `
            <main id="flight-result-screen" hidden></main>
            <header id="play-hud"></header>
            <section id="build-overlay"></section>
            <section id="launch-control"></section>
        `;
        repository = createRepository();
        soundController = { playSE: vi.fn() };
    });

    it('renders the flight result screen and hides active play UI', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showResultScreen(createViewData());

        expect(document.querySelector('#flight-result-screen').hidden).toBe(false);
        expect(document.querySelector('#play-hud').hidden).toBe(true);
        expect(document.querySelector('#build-overlay').hidden).toBe(true);
        expect(document.querySelector('#launch-control').hidden).toBe(true);
        expect(document.querySelector('#flight-result-screen').textContent).toContain('SECTOR 3 COMPLETED');
        expect(document.querySelector('#flight-result-screen').textContent).toContain('Goal Bonus');
    });

    it('registers result, map toggle, and protect handlers on rendered controls', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const resultHandler = vi.fn();
        const mapHandler = vi.fn();
        const protectHandler = vi.fn();

        controller.showResultScreen(createViewData());
        controller.setResultHandler(resultHandler);
        controller.setMapToggleHandler(mapHandler);
        controller.setProtectHandler(protectHandler);

        document.querySelector('.flight-result-action-button').click();
        document.querySelector('.flight-result-map-button').click();
        document.querySelector('.Badge.favorite').click();

        expect(soundController.playSE).toHaveBeenCalledTimes(3);
        expect(resultHandler).toHaveBeenCalledTimes(1);
        expect(mapHandler).toHaveBeenCalledWith(true);
        expect(protectHandler).toHaveBeenCalledWith(true);
    });

    it('throws when the result screen container is missing', () => {
        document.body.innerHTML = '';

        expect(() => new UIController({ gameDataRepository: repository })).toThrow(
            '[UIController] Required element not found: #flight-result-screen'
        );
    });
});
