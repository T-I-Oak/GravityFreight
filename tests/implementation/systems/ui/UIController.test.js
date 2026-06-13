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

function createPointerEvent(type, init = {}) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, init);
    return event;
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
                    <span id="mail-btn-0" class="Icon mail trading-post state-new state-clickable"></span>
                    <span id="mail-btn-1" class="Icon mail repair-dock state-clickable"></span>
                    <span id="mail-btn-2" class="Icon mail"></span>
                </header>
                <section id="inventory-panel" class="state-hidden">
                    <button id="btn-toggle-panel"></button>
                    <button class="Tab state-active" data-tab="flight"></button>
                    <button class="Tab" data-tab="assembly"></button>
                    <div id="tab-flight">
                        <div class="flight-scroll">
                            <div id="list-rocket" class="item-list"></div>
                            <div id="list-launcher" class="item-list"></div>
                            <div id="list-booster" class="item-list"></div>
                        </div>
                        <div id="launch-control">
                            <button id="launch-btn" disabled class="state-disabled"></button>
                        </div>
                    </div>
                    <div id="tab-assembly" class="state-hidden">
                        <div class="assembly-scroll">
                            <div id="list-chassis" class="item-list"></div>
                            <div id="list-logic" class="item-list"></div>
                            <div id="list-module" class="item-list"></div>
                        </div>
                    </div>
                    <button id="build-btn" disabled class="state-disabled">
                        <span class="btn-main-label"></span>
                        <span class="btn-sub-label"></span>
                    </button>
                </section>
            </main>
            <canvas id="gameCanvas"></canvas>
            <div id="star-info-panel" class="Panel StarInfoPanel state-hidden" hidden>
                <h2 id="star-info-title"></h2>
                <div id="star-info-list"></div>
            </div>
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
        expect(document.querySelector('#mail-btn-0').classList.contains('state-disabled')).toBe(true);
        expect(document.querySelector('#mail-btn-0').classList.contains('trading-post')).toBe(false);
        expect(document.querySelector('#mail-btn-0').classList.contains('state-new')).toBe(false);
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

    it('opens the assembly tab when the empty rocket placeholder is clicked', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showBuildScreen({
            sections: {
                rocket: {
                    entries: [],
                    emptyText: '待機中のロケットなし',
                    emptySubtext: 'ここをクリックしてロケットを建造してください',
                    emptyAction: 'open-assembly',
                    emptyNotable: true
                }
            },
            launch: { ready: false },
            assembly: { ready: false }
        });

        document.querySelector('#list-rocket .placeholder-card').click();

        expect(document.querySelector('[data-tab="assembly"]').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-tab="flight"]').classList.contains('state-active')).toBe(false);
        expect(document.querySelector('#tab-assembly').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#tab-flight').classList.contains('state-hidden')).toBe(true);
        expect(soundController.playSE).toHaveBeenCalledWith('click');
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
                    emptyText: '待機中のロケットなし',
                    emptySubtext: 'ここをクリックしてロケットを建造してください'
                },
                launcher: {
                    entries: [
                        {
                            uid: 'launcher_1',
                            selected: true,
                            itemViewData: {
                                uid: 'launcher_1',
                                id: 'pad_standard_d2',
                                name: 'Standard Pad',
                                category: 'launcher',
                                stats: {}
                            }
                        }
                    ],
                    emptyText: '発射台なし',
                    emptySubtext: '購入または回収してください'
                },
                booster: { entries: [], emptyText: 'ブースターなし', emptySubtext: '購入または回収してください' },
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
                    emptyText: 'シャーシなし',
                    emptySubtext: '購入または回収してください'
                },
                logic: { entries: [], emptyText: 'ロジックなし', emptySubtext: '購入または回収してください' },
                module: {
                    entries: [
                        {
                            uid: 'module_1',
                            selected: true,
                            selectedCount: 2,
                            itemViewData: {
                                uid: 'module_1',
                                id: 'mod_insurance',
                                name: 'Insurance',
                                category: 'module',
                                count: 2,
                                stats: {}
                            }
                        }
                    ],
                    emptyText: 'モジュールなし',
                    emptySubtext: '購入または回収してください'
                }
            },
            launch: {
                ready: false,
                label: 'LAUNCH ENGINE',
                subtext: 'ロケットと発射台を選択すると発射できます'
            },
            assembly: {
                ready: true,
                label: 'ASSEMBLE ROCKET',
                subtext: 'シャーシとロジックを選択しています'
            }
        });

        expect(document.querySelector('#list-rocket').textContent).toContain('待機中のロケットなし');
        expect(document.querySelector('#list-launcher').textContent).toContain('Standard Pad');
        expect(document.querySelector('#list-launcher .ItemCard').classList.contains('state-selected')).toBe(true);
        expect(document.querySelector('#list-chassis').textContent).toContain('Light Hull');
        expect(document.querySelector('#list-module').textContent).toContain('x2/2');
        expect(document.querySelector('#launch-control').hidden).toBe(false);
        expect(document.querySelector('#launch-btn').disabled).toBe(true);
        expect(document.querySelector('#launch-btn').classList.contains('state-disabled')).toBe(true);
        expect(document.querySelector('#launch-btn').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#build-btn').disabled).toBe(false);
        expect(document.querySelector('#build-btn').classList.contains('state-disabled')).toBe(false);
        expect(document.querySelector('#build-btn .btn-main-label').textContent).toBe('ASSEMBLE ROCKET');
    });

    it('registers the assemble handler on the build button', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn();

        controller.showBuildScreen({
            sections: {},
            assembly: {
                ready: true,
                label: 'ASSEMBLE ROCKET',
                subtext: 'Ready'
            },
            launch: { ready: false }
        });
        controller.setBuildAssembleHandler(handler);
        document.querySelector('[data-tab="assembly"]').click();
        document.querySelector('#build-btn').click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(document.querySelector('[data-tab="flight"]').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('#tab-flight').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#tab-assembly').classList.contains('state-hidden')).toBe(true);
        expect(soundController.playSE).toHaveBeenCalledWith('click');
    });

    it('registers the launch handler on the launch button', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn();

        controller.showBuildScreen({
            sections: {},
            assembly: { ready: false },
            launch: {
                ready: true,
                label: 'LAUNCH ENGINE',
                subtext: 'Ready'
            }
        });
        controller.setLaunchHandler(handler);
        document.querySelector('#launch-btn').click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(soundController.playSE).toHaveBeenCalledWith('click');
    });

    it('registers build item selection handlers with category and uid', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn();

        controller.showBuildScreen({
            sections: {
                rocket: {
                    entries: [
                        {
                            uid: 'rocket_1',
                            itemViewData: {
                                uid: 'rocket_1',
                                id: 'rocket_basic',
                                name: 'Basic Rocket',
                                category: 'rocket',
                                stats: {}
                            }
                        }
                    ]
                }
            },
            launch: { ready: false }
        });
        controller.setBuildItemSelectionHandler(handler);
        document.querySelector('#list-rocket .ItemCard').click();

        expect(handler).toHaveBeenCalledWith({ category: 'rocket', uid: 'rocket_1' });
        expect(soundController.playSE).toHaveBeenCalledWith('select');
    });

    it('does not register selection handlers for non-clickable item cards', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn();

        controller.showBuildScreen({
            sections: {
                launcher: {
                    entries: [
                        {
                            uid: 'launcher_empty',
                            disabled: true,
                            itemViewData: {
                                uid: 'launcher_empty',
                                id: 'pad_standard_d2',
                                name: 'Empty Launcher',
                                category: 'launcher',
                                stats: {}
                            }
                        }
                    ]
                }
            },
            launch: { ready: false }
        });
        controller.setBuildItemSelectionHandler(handler);
        document.querySelector('#list-launcher .ItemCard').click();

        expect(document.querySelector('#list-launcher .ItemCard').classList.contains('state-clickable')).toBe(false);
        expect(handler).not.toHaveBeenCalled();
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

    it('keeps map pointer input active while dragging outside the canvas', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn();
        const canvas = document.querySelector('#gameCanvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.getBoundingClientRect = vi.fn(() => ({
            left: 20,
            top: 40,
            width: 400,
            height: 300
        }));

        controller.setCanvasInputHandler(handler);
        canvas.dispatchEvent(createPointerEvent('pointerdown', {
            pointerId: 1,
            clientX: 100,
            clientY: 120
        }));
        window.dispatchEvent(createPointerEvent('pointermove', {
            pointerId: 1,
            clientX: 180,
            clientY: 220
        }));
        window.dispatchEvent(createPointerEvent('pointerup', {
            pointerId: 1,
            clientX: 180,
            clientY: 220
        }));

        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
            type: 'pointerdown',
            point: { x: 160, y: 160 }
        }));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
            type: 'pointermove',
            point: { x: 320, y: 360 }
        }));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
            type: 'pointerup',
            point: { x: 320, y: 360 }
        }));
    });

    it('emits map hover input with canvas and display points', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn();
        const canvas = document.querySelector('#gameCanvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.getBoundingClientRect = vi.fn(() => ({
            left: 20,
            top: 40,
            width: 400,
            height: 300
        }));

        controller.setCanvasInputHandler(handler);
        canvas.dispatchEvent(createPointerEvent('pointermove', {
            pointerId: 1,
            pointerType: 'mouse',
            clientX: 120,
            clientY: 190
        }));
        canvas.dispatchEvent(createPointerEvent('pointerleave', {
            pointerId: 1,
            pointerType: 'mouse',
            clientX: 120,
            clientY: 190
        }));

        expect(handler).toHaveBeenCalledWith({
            type: 'hover',
            point: { x: 200, y: 300 },
            displayPoint: { x: 100, y: 150 },
            pointerType: 'mouse'
        });
        expect(handler).toHaveBeenCalledWith({ type: 'hoverleave' });
    });

    it('renders and hides the star item info panel', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const item = {
            id: 'coin_100',
            uid: 'coin_1',
            category: 'coin',
            equals: vi.fn(candidate => candidate.id === 'coin_100'),
            getViewData: vi.fn(() => ({
                id: 'coin_100',
                uid: 'coin_1',
                name: '100c Coin',
                category: 'coin',
                stats: {}
            }))
        };

        controller.showStarInfo({
            isHome: true,
            items: [item, item]
        }, { x: 10, y: 20 }, document.querySelector('#gameCanvas'));

        expect(document.querySelector('#star-info-panel').hidden).toBe(false);
        expect(document.querySelector('#star-info-title').textContent).toBe('STAR CORE STORAGE');
        expect(document.querySelector('#star-info-list').textContent).toContain('100c Coin');
        expect(document.querySelector('#star-info-list').textContent).toContain('x2');
        expect(document.querySelector('#star-info-list .ItemCard').classList.contains('state-compact')).toBe(false);

        controller.hideStarInfo();

        expect(document.querySelector('#star-info-panel').hidden).toBe(true);
        expect(document.querySelector('#star-info-panel').classList.contains('state-hidden')).toBe(true);
    });

    it('uses compact star item cards only when many item groups are shown', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const items = ['coin', 'cargo', 'module', 'launcher'].map((category, index) => ({
            id: `${category}_${index}`,
            uid: `${category}_${index}`,
            category,
            equals: vi.fn(candidate => candidate.id === `${category}_${index}`),
            getViewData: vi.fn(() => ({
                id: `${category}_${index}`,
                uid: `${category}_${index}`,
                name: `${category} item`,
                category,
                stats: {}
            }))
        }));

        controller.showStarInfo({
            isHome: false,
            items
        }, { x: 10, y: 20 }, document.querySelector('#gameCanvas'));

        document.querySelectorAll('#star-info-list .ItemCard').forEach(card => {
            expect(card.classList.contains('state-compact')).toBe(true);
            expect(card.classList.contains('state-mini')).toBe(false);
        });
    });

    it('normalizes two pointer map gestures into pinch events', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn();
        const canvas = document.querySelector('#gameCanvas');
        canvas.width = 800;
        canvas.height = 600;
        canvas.getBoundingClientRect = vi.fn(() => ({
            left: 20,
            top: 40,
            width: 400,
            height: 300
        }));

        controller.setCanvasInputHandler(handler);
        canvas.dispatchEvent(createPointerEvent('pointerdown', {
            pointerId: 1,
            clientX: 100,
            clientY: 100
        }));
        canvas.dispatchEvent(createPointerEvent('pointerdown', {
            pointerId: 2,
            clientX: 200,
            clientY: 100
        }));
        window.dispatchEvent(createPointerEvent('pointermove', {
            pointerId: 2,
            clientX: 240,
            clientY: 100
        }));

        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
            type: 'gesturestart',
            point: { x: 260, y: 120 }
        }));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
            type: 'pinch',
            point: { x: 300, y: 120 },
            delta: { x: 40, y: 0 },
            scale: 1.4
        }));
    });
});
