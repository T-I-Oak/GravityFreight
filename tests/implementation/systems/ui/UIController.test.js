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
            <div id="title-screen"></div>
            <button id="start-game-btn"></button>
            <main id="flight-result-screen" hidden></main>
            <main id="facility-screen" hidden></main>
            <header id="mission-hud" class="hidden">
                <span id="sector-display"></span>
                <span id="score-display"></span>
                <span id="coin-display"></span>
                <button id="mail-btn-0"></button>
                <button id="mail-btn-1"></button>
                <button id="mail-btn-2"></button>
            </header>
            <section id="build-overlay" class="hidden"></section>
            <section id="launch-control"></section>
            <canvas id="gameCanvas"></canvas>
        `;
        repository = createRepository();
        soundController = { playSE: vi.fn() };
    });

    it('renders the flight result screen and hides active play UI', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showResultScreen(createViewData());

        expect(document.querySelector('#flight-result-screen').hidden).toBe(false);
        expect(document.querySelector('#mission-hud').hidden).toBe(true);
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

    it('renders a facility screen and registers facility handlers', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const actionHandler = vi.fn();
        const departHandler = vi.fn();

        controller.showFacilityScreen('TRADING_POST', {
            name: 'TRADING POST',
            icon: 'T',
            themeClass: 'trading-post',
            description: '貨物取引やパーツの売買ができる中継基地。',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: [
                {
                    id: 'buy',
                    title: '販売中のアイテム',
                    subtitle: 'ステーションで販売されている高度なパーツです。',
                    entries: [
                        {
                            action: 'buy',
                            actionLabel: 'BUY',
                            uid: 'item_1',
                            price: 40,
                            discountPercent: 30,
                            disabled: false,
                            itemViewData: {
                                uid: 'item_1',
                                id: 'sensor_long',
                                name: 'Long Sensor',
                                category: 'logic',
                                stats: {}
                            }
                        }
                    ],
                    emptyText: 'NO ITEMS',
                    emptySubtext: '現在表示できる項目はありません。',
                    themeClass: 'trading-post'
                }
            ]
        });
        controller.setFacilityActionHandler(actionHandler);
        controller.setFacilityDepartHandler(departHandler);

        document.querySelector('.facility-action-button').click();
        document.querySelector('.facility-depart-button').click();

        expect(document.querySelector('#facility-screen').hidden).toBe(false);
        expect(document.querySelector('#flight-result-screen').hidden).toBe(true);
        expect(document.querySelector('#facility-screen').textContent).toContain('TRADING POST');
        expect(document.querySelector('#facility-screen').textContent).toContain('Long Sensor');
        expect(document.querySelector('#facility-screen').textContent).toContain('120 c');
        expect(actionHandler).toHaveBeenCalledWith('buy', { uid: 'item_1' });
        expect(departHandler).toHaveBeenCalledTimes(1);
        expect(soundController.playSE).toHaveBeenCalledTimes(2);
    });

    it('registers title start operation and switches to the build screen', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const startHandler = vi.fn();
        const sessionState = { sectorNumber: 0, totalScore: 0, coins: 120 };

        controller.setStartHandler(startHandler);
        document.querySelector('#start-game-btn').click();
        controller.initHUD(sessionState);
        controller.showBuildScreen();

        expect(startHandler).toHaveBeenCalledTimes(1);
        expect(soundController.playSE).toHaveBeenCalledWith('click');
        expect(document.querySelector('#sector-display').textContent).toBe('0');
        expect(document.querySelector('#score-display').textContent).toBe('0');
        expect(document.querySelector('#coin-display').textContent).toBe('120');
        expect(document.querySelector('#title-screen').hidden).toBe(true);
        expect(document.querySelector('#mission-hud').hidden).toBe(false);
        expect(document.querySelector('#mission-hud').classList.contains('hidden')).toBe(false);
        expect(document.querySelector('#build-overlay').hidden).toBe(false);
        expect(document.querySelector('#build-overlay').classList.contains('hidden')).toBe(false);
    });

    it('updates HUD values and exposes the map canvas', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.updateHUDValue('sector', 3);
        controller.updateHUDValue('score', 1234);
        controller.updateHUDValue('coin', 80);

        expect(controller.getMapCanvas()).toBe(document.querySelector('#gameCanvas'));
        expect(document.querySelector('#sector-display').textContent).toBe('3');
        expect(document.querySelector('#score-display').textContent).toBe('1,234');
        expect(document.querySelector('#coin-display').textContent).toBe('80');
    });
});
