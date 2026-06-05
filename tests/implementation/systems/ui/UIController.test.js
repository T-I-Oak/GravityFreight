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
            <main id="play-scene-container" class="state-hidden">
                <header id="play-hud" class="state-hidden">
                    <span id="sector-display"></span>
                    <span id="score-display"></span>
                    <span id="coin-display"></span>
                    <button id="mail-btn-0"></button>
                    <button id="mail-btn-1"></button>
                    <button id="mail-btn-2"></button>
                </header>
                <section id="inventory-panel" class="state-hidden">
                    <button id="btn-toggle-panel"></button>
                    <button class="Tab state-active" data-tab="flight"></button>
                    <button class="Tab" data-tab="assembly"></button>
                    <div id="tab-flight"></div>
                    <div id="tab-assembly" class="state-hidden"></div>
                    <div id="list-rocket"></div>
                    <div id="list-launcher"></div>
                    <div id="list-booster"></div>
                    <div id="list-chassis"></div>
                    <div id="list-logic"></div>
                    <div id="list-module"></div>
                </section>
            </main>
            <section id="launch-control">
                <button id="launch-btn" disabled class="state-disabled"></button>
            </section>
            <canvas id="gameCanvas"></canvas>
        `;
        repository = createRepository();
        soundController = { playSE: vi.fn() };
    });

    it('renders the flight result screen and hides active play UI', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showResultScreen(createViewData());

        expect(document.querySelector('#flight-result-screen').hidden).toBe(false);
        expect(document.querySelector('#play-hud').hidden).toBe(true);
        expect(document.querySelector('#inventory-panel').hidden).toBe(true);
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

    it('defers the result action handler until the result screen is rendered', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const resultHandler = vi.fn();

        expect(() => controller.setResultHandler(resultHandler)).not.toThrow();

        controller.showResultScreen(createViewData());
        document.querySelector('.flight-result-action-button').click();

        expect(resultHandler).toHaveBeenCalledTimes(1);
        expect(soundController.playSE).toHaveBeenCalledWith('click');
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
        expect(document.querySelector('#play-scene-container').hidden).toBe(false);
        expect(document.querySelector('#play-hud').hidden).toBe(false);
        expect(document.querySelector('#play-hud').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#inventory-panel').hidden).toBe(false);
        expect(document.querySelector('#inventory-panel').classList.contains('state-hidden')).toBe(false);
    });

    it('switches build tabs without changing game state', () => {
        new UIController({ gameDataRepository: repository, soundController });

        document.querySelector('[data-tab="assembly"]').click();

        expect(document.querySelector('[data-tab="assembly"]').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-tab="flight"]').classList.contains('state-active')).toBe(false);
        expect(document.querySelector('#tab-assembly').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#tab-flight').classList.contains('state-hidden')).toBe(true);
    });

    it('toggles the build panel collapsed state without changing game state', () => {
        new UIController({ gameDataRepository: repository, soundController });

        document.querySelector('#btn-toggle-panel').click();

        expect(document.querySelector('#inventory-panel').classList.contains('state-collapsed')).toBe(true);
        expect(soundController.playSE).toHaveBeenCalledWith('click');
    });

    it('renders build inventory lists from view data and updates launch state', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showBuildScreen({
            sections: {
                rocket: {
                    entries: [],
                    emptyText: 'NO ROCKET',
                    emptySubtext: 'ASSEMBLE A ROCKET'
                },
                launcher: {
                    entries: [
                        {
                            uid: 'launcher_1',
                            itemViewData: {
                                uid: 'launcher_1',
                                id: 'pad_standard_d2',
                                name: 'Standard Pad',
                                category: 'launcher',
                                stats: {}
                            }
                        }
                    ],
                    emptyText: 'NO LAUNCHER',
                    emptySubtext: 'BUY A LAUNCHER'
                },
                booster: { entries: [], emptyText: 'NO BOOSTER', emptySubtext: 'OPTIONAL' },
                chassis: {
                    entries: [
                        {
                            uid: 'chassis_1',
                            itemViewData: {
                                uid: 'chassis_1',
                                id: 'hull_light',
                                name: 'Light Hull',
                                category: 'chassis',
                                stats: {}
                            }
                        }
                    ],
                    emptyText: 'NO CHASSIS',
                    emptySubtext: 'BUY CHASSIS'
                },
                logic: { entries: [], emptyText: 'NO LOGIC', emptySubtext: 'BUY LOGIC' },
                module: { entries: [], emptyText: 'NO MODULE', emptySubtext: 'OPTIONAL' }
            },
            launch: {
                ready: false,
                label: 'LAUNCH ENGINE',
                subtext: 'ロケットと発射台を選択すると発射できます'
            }
        });

        expect(document.querySelector('#list-rocket').textContent).toContain('NO ROCKET');
        expect(document.querySelector('#list-launcher').textContent).toContain('Standard Pad');
        expect(document.querySelector('#list-chassis').textContent).toContain('Light Hull');
        expect(document.querySelector('#launch-control').hidden).toBe(false);
        expect(document.querySelector('#launch-btn').disabled).toBe(true);
        expect(document.querySelector('#launch-btn').classList.contains('state-disabled')).toBe(true);
        expect(document.querySelector('#launch-btn').classList.contains('state-hidden')).toBe(false);
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
