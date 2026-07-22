import { describe, it, expect, vi, beforeEach } from 'vitest';
import UIController from '../../../../src/systems/ui/UIController.js';

function createRepository() {
    return {
        getStoryContent: vi.fn(() => ({
            title: 'Story',
            discovery: 'Discovery',
            content: 'Story body',
            branch: 'T'
        })),
        getFacilityDefinition: vi.fn(() => ({
            name: 'TRADING POST',
            className: 'trading-post',
            icon: 'T'
        })),
        getStoryCategoryDefinition: vi.fn(() => ({
            name: 'TRADING POST',
            className: 'trading-post',
            icon: 'T'
        })),
        getHowToPlayContent: vi.fn(() => [
            {
                id: 'mission',
                title: 'MISSION',
                background: '/assets/tutorial/slide1.png',
                layout: 'full',
                blocks: [{ type: 'paragraph', text: 'Mission briefing' }]
            }
        ]),
        getItemDefinition: vi.fn(id => ({
            id,
            uid: id,
            name: id,
            category: id === 'sensor_short' ? 'logic' : id === 'mod_analyzer' ? 'module' : 'chassis',
            description: 'Demo item',
            stats: {},
            slots: id === 'hull_light' ? 1 : undefined,
            pickupMultiplier: id === 'sensor_short' ? 1.2 : undefined,
            precisionMultiplier: id === 'mod_analyzer' ? 1.2 : undefined
        })),
        getAchievementDefinition: vi.fn(() => ({
            id: 'stat_launches',
            label: '累積発射回数',
            tiers: [
                { goal: 1000, title: '銀河の英雄' },
                { goal: 150, title: '安定した打ち上げ' },
                { goal: 20, title: '最初の跳躍' }
            ]
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
            'flightResult.actions.backToResult': 'BACK TO RESULT',
            'flightResult.actions.share': 'SHARE',
            'flightResult.actions.continue': 'CONTINUE',
            'map.deliveryCargo.title': 'DELIVERY TARGET',
            'map.deliveryCargo.body': 'Deliver {itemName} to {facilityName}.',
            'flightResult.bonusTitle': 'DELIVERY BONUS',
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
    };
}

function createViewData() {
    return {
        title: 'SECTOR 3 COMPLETED',
        themeClass: 'trading-post',
        totalScore: 3260,
        totalCoins: 30,
        actionLabel: 'TO TRADING POST',
        replay: { id: 'flight_current', recorded: true, favorite: false, pending: false },
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
            <div id="title-screen">
                <canvas id="title-bg-canvas"></canvas>
                <canvas id="title-fg-canvas"></canvas>
                <button id="title-settings-btn"></button>
                <div id="version"></div>
                <div class="copyright"></div>
            </div>
            <div id="settings-overlay" class="state-hidden" hidden>
                <button id="settings-done-btn"></button>
            </div>
            <div id="how-to-play-overlay" class="how-to-play-screen state-hidden" hidden>
                <div class="Panel HowToPlaySlider">
                    <div class="how-to-play-slides"></div>
                    <button data-how-to-play-action="prev"></button>
                    <div class="how-to-play-dots"></div>
                    <button data-how-to-play-action="next"></button>
                    <button data-how-to-play-action="close"></button>
                </div>
            </div>
            <div id="story-overlay" class="theme-neon state-hidden FlexCenter" hidden></div>
            <div id="replay-overlay" class="theme-neon state-hidden" hidden>
                <div id="replay-config-list"></div>
                <button id="exit-replay-btn"></button>
            </div>
            <button id="archive-btn"></button>
            <div id="archive-screen-overlay" hidden class="theme-matte state-hidden">
                <div id="archive-screen-root"></div>
            </div>
            <button id="start-game-btn"></button>
            <button id="how-to-play-btn"></button>
            <main id="flight-result-screen" hidden></main>
            <main id="facility-screen" hidden></main>
            <main id="game-result-scene-container" class="theme-printing state-hidden" hidden></main>
            <main id="play-scene-container" class="state-hidden">
                <header id="play-hud" class="state-hidden">
                    <span id="sector-display"></span>
                    <span id="score-display"></span>
                    <span id="coin-display"></span>
                    <span id="mail-btn-0" class="Icon mail trading-post state-new state-clickable"></span>
                    <span id="mail-btn-1" class="Icon mail repair-dock state-clickable"></span>
                    <span id="mail-btn-2" class="Icon mail state-disabled"></span>
                </header>
                <section id="inventory-panel" class="state-hidden">
                    <button id="btn-toggle-panel"></button>
                    <button id="build-settings-btn"></button>
                    <button class="Tab state-active" data-tab="flight"></button>
                    <button class="Tab" data-tab="assembly"></button>
                    <div id="tab-flight">
                        <div class="flight-scroll">
                            <div id="list-rocket" class="item-list"></div>
                            <div id="list-launcher" class="item-list"></div>
                            <div id="list-booster" class="item-list"></div>
                        </div>
                        <div id="launch-control">
                            <div id="launch-return-bonus" class="launch-return-bonus state-hidden" hidden></div>
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
                <div id="map-action-dock" class="action-dock"></div>
            </main>
            <canvas id="gameCanvas"></canvas>
            <div id="star-info-panel" class="Panel StarInfoPanel state-hidden" hidden>
                <h2 id="star-info-title"></h2>
                <div id="star-info-list"></div>
            </div>
            <div id="sector-notification" class="sector-notif state-hidden"></div>
        `;
        repository = createRepository();
        soundController = { playSE: vi.fn() };
    });

    it('renders the flight result screen and hides active play UI', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        document.querySelector('#inventory-panel').classList.remove('state-collapsed');

        controller.showResultScreen(createViewData());

        expect(document.querySelector('#flight-result-screen').hidden).toBe(false);
        expect(document.querySelector('#play-hud').hidden).toBe(true);
        expect(document.querySelector('#inventory-panel').hidden).toBe(true);
        expect(document.querySelector('#inventory-panel').classList.contains('state-collapsed')).toBe(true);
        expect(document.querySelector('#launch-control').hidden).toBe(true);
        expect(document.querySelector('#flight-result-screen').textContent).toContain('SECTOR 3 COMPLETED');
        expect(document.querySelector('#flight-result-screen').textContent).toContain('Goal Bonus');
        expect(document.querySelector('#flight-result-screen').textContent).toContain('SHARE');
    });

    it('temporarily hides and restores the build panel during tutorial canvas focus', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showBuildScreen();
        controller.hideBuildPanelForTutorialFocus();

        expect(document.querySelector('#inventory-panel').hidden).toBe(true);

        controller.restoreBuildPanelAfterTutorialFocus();

        expect(document.querySelector('#inventory-panel').hidden).toBe(false);
        expect(document.querySelector('#inventory-panel').classList.contains('state-hidden')).toBe(false);
    });

    it('does not show the build panel after tutorial canvas focus if it was already hidden', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showTitleScreen();
        controller.hideBuildPanelForTutorialFocus();
        controller.restoreBuildPanelAfterTutorialFocus();

        expect(document.querySelector('#inventory-panel').hidden).toBe(true);
    });

    it('animates flight result scores and coins from zero to final values', () => {
        const frames = [];
        const requestFrame = vi.fn(callback => {
            frames.push(callback);
            return frames.length;
        });
        const cancelFrame = vi.fn();
        const controller = new UIController({
            gameDataRepository: repository,
            soundController,
            requestFrame,
            cancelFrame,
            flightResultCountDurationMs: 1000
        });

        controller.showResultScreen(createViewData());

        expect(document.querySelector('.stat-value.score').textContent).toBe('0');
        expect(document.querySelector('.stat-value.num-coin').textContent).toBe('0');
        expect(document.querySelector('.report-data-value.score').textContent).toBe('+0');
        expect(document.querySelector('.report-data-value.num-coin').textContent).toBe('+0');

        frames.shift()(0);
        frames.shift()(1000);

        expect(document.querySelector('.stat-value.score').textContent).toBe('3,260');
        expect(document.querySelector('.stat-value.num-coin').textContent).toBe('30');
        expect(document.querySelector('.report-data-value.score').textContent).toBe('+3,000');
        expect(document.querySelector('.report-data-value.num-coin').textContent).toBe('+30');
    });

    it('stops the flight result count animation when leaving the result screen', () => {
        const requestFrame = vi.fn(() => 42);
        const cancelFrame = vi.fn();
        const controller = new UIController({
            gameDataRepository: repository,
            soundController,
            requestFrame,
            cancelFrame
        });

        controller.showResultScreen(createViewData());
        controller.showBuildScreen();

        expect(cancelFrame).toHaveBeenCalledWith(42);
    });

    it('registers result, map toggle, and protect handlers on rendered controls', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const resultHandler = vi.fn();
        const mapHandler = vi.fn();
        const protectHandler = vi.fn(request => ({ id: request.recordId, favorite: request.favorite }));

        controller.showResultScreen(createViewData());
        controller.setResultHandler(resultHandler);
        controller.setMapToggleHandler(mapHandler);
        controller.setReplayProtectHandler(protectHandler);
        controller.setReplayProtectRecordsProvider(() => []);

        document.querySelector('.flight-result-action-button').click();
        document.querySelector('.flight-result-map-button').click();
        document.querySelector('.Badge.favorite').click();

        expect(soundController.playSE).toHaveBeenCalledTimes(3);
        expect(resultHandler).toHaveBeenCalledTimes(1);
        expect(mapHandler).toHaveBeenCalledWith(true);
        expect(document.querySelector('#flight-result-screen').hidden).toBe(true);
        expect(document.querySelector('#play-scene-container').hidden).toBe(false);
        expect(document.querySelector('#play-hud').hidden).toBe(false);
        expect(document.querySelector('#inventory-panel').hidden).toBe(false);
        expect(document.querySelector('#inventory-panel').classList.contains('state-readonly')).toBe(true);
        expect(document.querySelector('#map-action-dock').textContent).toContain('BACK TO RESULT');
        expect(document.querySelector('.replay-protect-modal')).not.toBeNull();
        expect(protectHandler).not.toHaveBeenCalled();
    });

    it('shares the rendered flight result through the share service', async () => {
        const blob = new Blob(['flight'], { type: 'image/png' });
        const shareImageRenderer = {
            createFlightResultImage: vi.fn(() => Promise.resolve(blob))
        };
        const shareService = {
            shareImage: vi.fn(() => Promise.resolve({ mode: 'clipboard' }))
        };
        const controller = new UIController({
            gameDataRepository: repository,
            soundController,
            shareImageRenderer,
            shareService
        });

        controller.showResultScreen(createViewData());
        document.querySelector('.flight-result-share-button').click();
        await Promise.resolve();
        await Promise.resolve();

        expect(shareImageRenderer.createFlightResultImage).toHaveBeenCalledWith({
            viewData: expect.objectContaining({ title: 'SECTOR 3 COMPLETED' }),
            mapCanvas: document.querySelector('#gameCanvas'),
            gameDataRepository: repository
        });
        expect(shareService.shareImage).toHaveBeenCalledWith({
            blob,
            fileName: 'gravity-freight-flight-result.png',
            title: 'Gravity Freight Result',
            text: [
                '【GRAVITY FREIGHT】',
                'SECTOR 3 COMPLETED',
                'https://t-i-oak.github.io/GravityFreight/',
                '#GravityFreight #GameWorksOAK'
            ].join('\n')
        });
    });

    it('marks a pending result replay as recorded when protect saves it', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const protectHandler = vi.fn(request => ({ id: request.recordId, favorite: request.favorite, success: true }));
        const viewData = createViewData();
        viewData.replay = { id: 'flight_pending', recorded: false, favorite: false, pending: true };

        controller.showResultScreen(viewData);
        controller.setReplayProtectHandler(protectHandler);
        controller.setReplayProtectRecordsProvider(() => []);

        document.querySelector('.Badge.favorite').click();

        expect(protectHandler).not.toHaveBeenCalled();
        expect(document.querySelector('[data-replay-protect-row="flight_pending"]').classList.contains('state-current')).toBe(true);
        expect(document.querySelector('.replay-protect-ok').disabled).toBe(false);
        document.querySelector('.replay-protect-ok').click();

        expect(document.querySelector('[data-replay-recorded-status]').textContent).toBe('RECORDED');
        expect(document.querySelector('[data-replay-recorded-status]').classList.contains('state-recorded')).toBe(true);
        expect(document.querySelector('[data-replay-recorded-status]').classList.contains('state-not-recorded')).toBe(false);
        expect(document.querySelector('.Badge.favorite').textContent).toBe('PROTECTED');
        expect(document.querySelector('.Badge.favorite').classList.contains('state-active')).toBe(true);
        expect(viewData.replay.recorded).toBe(true);
        expect(viewData.replay.pending).toBe(false);
    });

    it('does not protect the current result replay when the protect dialog is canceled', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const protectHandler = vi.fn(request => ({ id: request.recordId, favorite: request.favorite, success: true }));
        const viewData = createViewData();
        viewData.replay = { id: 'flight_pending', recorded: false, favorite: false, pending: true };

        controller.showResultScreen(viewData);
        controller.setReplayProtectHandler(protectHandler);
        controller.setReplayProtectRecordsProvider(() => []);

        document.querySelector('.Badge.favorite').click();
        document.querySelector('.flight-result-favorite-cancel').click();

        expect(protectHandler).not.toHaveBeenCalled();
        expect(document.querySelector('.replay-protect-modal')).toBeNull();
        expect(document.querySelector('[data-replay-recorded-status]').textContent).toBe('NOT RECORDED');
        expect(document.querySelector('.Badge.favorite').classList.contains('state-active')).toBe(false);
        expect(viewData.replay.recorded).toBe(false);
        expect(viewData.replay.pending).toBe(true);
    });

    it('edits protected replays in a table when result protect reaches the limit', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const protectHandler = vi.fn(request => ({ id: request.recordId, favorite: request.favorite }));
        controller.setReplayProtectRecordsProvider(() => [
            { id: 'flight_1', no: '01', score: 1200, reachedSector: 2, favorite: true },
            { id: 'flight_2', no: '02', score: 900, reachedSector: 1, favorite: true },
            { id: 'flight_3', no: '03', score: 800, reachedSector: 1, favorite: true },
            { id: 'flight_4', no: '04', score: 700, reachedSector: 1, favorite: true },
            { id: 'flight_5', no: '05', score: 600, reachedSector: 1, favorite: true },
            { id: 'flight_6', no: '06', score: 500, reachedSector: 1, favorite: false }
        ]);
        controller.setReplayProtectHandler(protectHandler);

        controller.showResultScreen(createViewData());
        document.querySelector('.Badge.favorite').click();

        expect(document.querySelector('.Badge.favorite').classList.contains('state-active')).toBe(false);
        expect(document.querySelector('.replay-protect-modal')).not.toBeNull();
        expect(document.querySelector('.flight-result-favorite-dialog').textContent).toContain('PROTECT LIMIT REACHED');
        expect(document.querySelector('.flight-result-favorite-dialog').textContent).toContain('CURRENT FLIGHT');
        expect(document.querySelector('.flight-result-favorite-dialog').textContent).toContain('6/5 protected');
        expect(document.querySelector('.replay-protect-ok').disabled).toBe(true);
        expect(document.querySelector('.flight-result-favorite-dialog').textContent).not.toContain('flight_1');
        expect(document.querySelector('[data-replay-protect-row="flight_6"]')).not.toBeNull();
        expect(document.querySelector('[data-replay-protect-row="flight_6"]').classList.contains('state-inactive')).toBe(true);
        expect(document.querySelector('[data-replay-protect-row="flight_current"]').classList.contains('state-current')).toBe(true);
        expect(document.querySelector('[data-replay-protect-row="flight_current"]').classList.contains('state-new')).toBe(true);
        expect(document.querySelector('[data-replay-protect-row="flight_current"] .col-no').textContent).toBe('CURRENT');
        expect(document.querySelector('[data-replay-protect-row="flight_current"] .date-cell')).not.toBeNull();
        expect(document.querySelector('[data-replay-protect-row="flight_current"] .Badge.state-new').textContent).toBe('NEW');
        expect(document.querySelector('[data-replay-protect-row="flight_current"] .date-label').textContent).toBe('CURRENT FLIGHT');
        expect(document.querySelector('[data-replay-protect-row="flight_1"] .col-no').textContent).toBe('01');
        expect(document.querySelector('.flight-result-favorite-cancel').classList.contains('button-large')).toBe(true);
        expect(protectHandler).not.toHaveBeenCalled();

        document.querySelector('[data-replay-protect-toggle="flight_1"]').click();

        expect(document.querySelector('.flight-result-favorite-dialog').textContent).toContain('5/5 protected');
        expect(document.querySelector('.replay-protect-ok').disabled).toBe(false);

        document.querySelector('.replay-protect-ok').click();

        expect(protectHandler).toHaveBeenNthCalledWith(1, expect.objectContaining({
            source: 'record',
            recordId: 'flight_1',
            favorite: false
        }));
        expect(protectHandler).toHaveBeenNthCalledWith(2, expect.objectContaining({
            source: 'result',
            recordId: 'flight_current',
            favorite: true,
            replaceRecordId: 'flight_1'
        }));
        expect(document.querySelector('.Badge.favorite').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('.flight-result-favorite-dialog')).toBeNull();
        expect(document.querySelector('.replay-protect-modal')).toBeNull();
    });

    it('keeps build panel toggling available but item selection disabled in result map view', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const selectionHandler = vi.fn();

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
            launch: {
                ready: false,
                label: 'LAUNCH ENGINE',
                subtext: 'Ready'
            }
        });
        controller.setBuildItemSelectionHandler(selectionHandler);
        controller.showResultScreen(createViewData());
        controller.setMapToggleHandler(vi.fn());

        document.querySelector('.flight-result-map-button').click();
        document.querySelector('#list-rocket .ItemCard').click();
        document.querySelector('#btn-toggle-panel').click();

        expect(selectionHandler).not.toHaveBeenCalled();
        expect(document.querySelector('#inventory-panel').classList.contains('state-collapsed')).toBe(false);
    });

    it('shows a collapsed read-only build panel on facility screens', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const selectionHandler = vi.fn();

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
            launch: {
                ready: false,
                label: 'LAUNCH ENGINE',
                subtext: 'Ready'
            }
        });
        controller.setBuildItemSelectionHandler(selectionHandler);

        controller.showFacilityScreen('TRADING_POST', {
            name: 'TRADING POST',
            icon: 'T',
            themeClass: 'trading-post',
            description: 'Trading post description',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: []
        });

        expect(document.querySelector('#facility-screen').hidden).toBe(false);
        expect(document.querySelector('#play-scene-container').hidden).toBe(false);
        expect(document.querySelector('#play-hud').hidden).toBe(true);
        expect(document.querySelector('#inventory-panel').hidden).toBe(false);
        expect(document.querySelector('#inventory-panel').classList.contains('state-readonly')).toBe(true);
        expect(document.querySelector('#inventory-panel').classList.contains('state-collapsed')).toBe(true);
        expect(document.querySelector('#build-btn').disabled).toBe(true);
        expect(document.querySelector('#build-btn').classList.contains('state-notable')).toBe(false);
        expect(document.querySelector('#launch-btn').disabled).toBe(true);
        expect(document.querySelector('#launch-btn').classList.contains('state-notable')).toBe(false);

        document.querySelector('#list-rocket .ItemCard').click();
        document.querySelector('#btn-toggle-panel').click();

        expect(selectionHandler).not.toHaveBeenCalled();
        expect(document.querySelector('#inventory-panel').classList.contains('state-collapsed')).toBe(false);
    });

    it('reopens the normal build panel with HUD after read-only facility view', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showBuildScreen({
            sections: {},
            launch: {
                ready: false,
                label: 'LAUNCH ENGINE',
                subtext: 'Ready'
            },
            assembly: { ready: false }
        });
        controller.showFacilityScreen('TRADING_POST', {
            name: 'TRADING POST',
            icon: 'T',
            themeClass: 'trading-post',
            description: 'Trading post description',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: []
        });
        controller.showBuildScreen({
            sections: {},
            launch: {
                ready: false,
                label: 'LAUNCH ENGINE',
                subtext: 'Ready'
            },
            assembly: { ready: false }
        });

        expect(document.querySelector('#play-scene-container').hidden).toBe(false);
        expect(document.querySelector('#play-hud').hidden).toBe(false);
        expect(document.querySelector('#play-hud').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#inventory-panel').hidden).toBe(false);
        expect(document.querySelector('#inventory-panel').classList.contains('state-readonly')).toBe(false);
        expect(document.querySelector('#inventory-panel').classList.contains('state-collapsed')).toBe(false);
    });

    it('returns to the flight tab whenever the build screen starts', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showBuildScreen({
            sections: {},
            launch: { ready: false, label: 'LAUNCH ENGINE', subtext: 'Ready' },
            assembly: { ready: false, label: 'ASSEMBLE ROCKET', subtext: 'Waiting' }
        });
        document.querySelector('[data-tab="assembly"]').click();

        controller.showBuildScreen({
            sections: {},
            launch: { ready: false, label: 'LAUNCH ENGINE', subtext: 'Ready' },
            assembly: { ready: false, label: 'ASSEMBLE ROCKET', subtext: 'Waiting' }
        });

        expect(document.querySelector('[data-tab="flight"]').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-tab="assembly"]').classList.contains('state-active')).toBe(false);
        expect(document.querySelector('#tab-flight').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#tab-assembly').classList.contains('state-hidden')).toBe(true);
    });

    it('keeps facility read-only panel open when facility data refreshes', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        const facilityViewData = {
            name: 'TRADING POST',
            icon: 'T',
            themeClass: 'trading-post',
            description: 'Trading post description',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: []
        };
        const buildViewData = {
            sections: {},
            launch: { ready: false, label: 'LAUNCH ENGINE', subtext: 'Ready' },
            assembly: { ready: false, label: 'ASSEMBLE ROCKET', subtext: 'Waiting' }
        };

        controller.showFacilityScreen('TRADING_POST', facilityViewData, buildViewData);
        document.querySelector('#btn-toggle-panel').click();
        controller.showFacilityScreen('TRADING_POST', facilityViewData, buildViewData, {
            collapseBuildPanel: false
        });

        expect(document.querySelector('#inventory-panel').classList.contains('state-collapsed')).toBe(false);
        expect(document.querySelector('#inventory-panel').classList.contains('state-readonly')).toBe(true);
    });

    it('renders the latest build panel data in read-only facility view', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showBuildScreen({
            sections: {
                logic: {
                    entries: [
                        {
                            uid: 'old_logic',
                            itemViewData: {
                                uid: 'old_logic',
                                id: 'logic_old',
                                name: 'Old Logic',
                                category: 'logic',
                                stats: {}
                            }
                        }
                    ]
                }
            },
            launch: { ready: false, label: 'LAUNCH ENGINE', subtext: 'Ready' },
            assembly: { ready: false }
        });

        controller.showFacilityScreen('TRADING_POST', {
            name: 'TRADING POST',
            icon: 'T',
            themeClass: 'trading-post',
            description: 'Trading post description',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: []
        }, {
            sections: {
                logic: {
                    entries: [
                        {
                            uid: 'new_logic',
                            itemViewData: {
                                uid: 'new_logic',
                                id: 'logic_new',
                                name: 'New Logic',
                                category: 'logic',
                                stats: {}
                            }
                        }
                    ]
                }
            },
            launch: { ready: false, label: 'LAUNCH ENGINE', subtext: 'Ready' },
            assembly: { ready: false }
        });

        expect(document.querySelector('#inventory-panel').textContent).toContain('New Logic');
        expect(document.querySelector('#inventory-panel').textContent).not.toContain('Old Logic');
        expect(document.querySelector('#inventory-panel').classList.contains('state-readonly')).toBe(true);
    });

    it('resets locked and hidden play UI whenever the build screen starts', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const panel = document.querySelector('#inventory-panel');
        const launchControl = document.querySelector('#launch-control');
        const hud = document.querySelector('#play-hud');

        panel.classList.add('state-collapsed', 'state-readonly', 'state-locked');
        launchControl.classList.add('state-locked');
        hud.hidden = true;
        hud.classList.add('state-hidden');

        controller.showBuildScreen({
            sections: {},
            launch: {
                ready: false,
                label: 'LAUNCH ENGINE',
                subtext: 'Ready'
            },
            assembly: { ready: false }
        });

        expect(hud.hidden).toBe(false);
        expect(hud.classList.contains('state-hidden')).toBe(false);
        expect(panel.hidden).toBe(false);
        expect(panel.classList.contains('state-collapsed')).toBe(false);
        expect(panel.classList.contains('state-readonly')).toBe(false);
        expect(panel.classList.contains('state-locked')).toBe(false);
        expect(launchControl.classList.contains('state-locked')).toBe(false);
    });

    it('returns from result map view to the rendered flight result screen', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const mapHandler = vi.fn();

        controller.showResultScreen(createViewData());
        controller.setMapToggleHandler(mapHandler);
        document.querySelector('.flight-result-map-button').click();
        document.querySelector('.flight-result-return-button').click();

        expect(mapHandler).toHaveBeenNthCalledWith(1, true);
        expect(mapHandler).toHaveBeenNthCalledWith(2, false);
        expect(document.querySelector('#flight-result-screen').hidden).toBe(false);
        expect(document.querySelector('#play-scene-container').hidden).toBe(true);
        expect(document.querySelector('#play-hud').hidden).toBe(true);
        expect(document.querySelector('#inventory-panel').hidden).toBe(true);
        expect(document.querySelector('#map-action-dock').innerHTML).toBe('');
        expect(document.querySelector('#flight-result-screen').textContent).toContain('SECTOR 3 COMPLETED');
    });

    it('shows the game-end receipt over the play scene and routes END CONTRACT', () => {
        vi.useFakeTimers();
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const returnHandler = vi.fn();

        try {
            controller.setGameEndReturnHandler(returnHandler);
            controller.showGameEndSequence({
                totalScore: 3200,
                totalCoins: 90,
                completedSectors: 3,
                collectedItemCount: 4,
                rankings: {
                    scoreRank: 1,
                    sectorRank: 2,
                    collectedRank: 3
                },
                createdAt: '2026-06-18T10:00:00.000Z'
            }, {
                reason: 'NO_PARTS_REMAINING',
                details: ['LAUNCHER']
            });

            expect(document.querySelector('#game-result-scene-container').hidden).toBe(true);
            expect(document.querySelector('#play-scene-container').hidden).toBe(false);
            expect(document.querySelector('#play-hud').hidden).toBe(true);
            expect(document.querySelector('#game-result-scene-container').textContent).toContain('TERMINAL REPORT');

            vi.advanceTimersByTime(2400);

            expect(document.querySelector('#game-result-scene-container').hidden).toBe(false);
            expect(document.querySelector('#game-result-scene-container').classList.contains('state-active')).toBe(true);
            expect(document.querySelector('#game-result-scene-container').textContent).toContain('FINAL SCORE');
            expect(document.querySelector('#game-result-scene-container').textContent).toContain('3,200 PTS');
            expect(document.querySelector('#game-result-scene-container').textContent).toContain('SECTOR RANKING 2nd');
            expect(document.querySelector('#game-result-scene-container').textContent).toContain('COLLECTION RANKING 3rd');
            expect(document.querySelector('#game-result-scene-container').textContent).toContain('SCORE RANKING 1st');
            expect(document.querySelector('#game-result-scene-container').textContent).toContain('GRADE');
            expect(document.querySelector('#game-result-scene-container').textContent).toContain('SHARE');
            expect(document.querySelector('#game-result-scene-container').textContent).not.toContain('NO PARTS REMAINING');
            expect(document.querySelector('#game-result-scene-container').textContent).not.toContain('LAUNCHER');
            vi.advanceTimersByTime(1650);
            expect(soundController.playSE).toHaveBeenCalledWith('stamp');

            document.querySelector('.game-end-return-button').click();

            expect(returnHandler).toHaveBeenCalledTimes(1);
            expect(soundController.playSE).toHaveBeenCalledWith('click');
        } finally {
            vi.clearAllTimers();
            vi.useRealTimers();
        }
    });

    it('shares the game-end receipt through the share service', async () => {
        vi.useFakeTimers();
        const blob = new Blob(['receipt'], { type: 'image/png' });
        const shareImageRenderer = {
            createGameEndImage: vi.fn(() => Promise.resolve(blob))
        };
        const shareService = {
            shareImage: vi.fn(() => Promise.resolve({ mode: 'clipboard' }))
        };
        const controller = new UIController({
            gameDataRepository: repository,
            soundController,
            shareImageRenderer,
            shareService
        });

        try {
            controller.showGameEndSequence({
                totalScore: 3200,
                completedSectors: 2,
                collectedItemCount: 3,
                rankings: {}
            }, {});
            document.querySelector('.game-end-share-button').click();
            await Promise.resolve();
            await Promise.resolve();

            expect(shareImageRenderer.createGameEndImage).toHaveBeenCalledWith({
                receiptElement: document.querySelector('#receipt-content-area')
            });
            expect(shareService.shareImage).toHaveBeenCalledWith({
                blob,
                fileName: 'gravity-freight-terminal-report.png',
                title: 'Gravity Freight Terminal Report',
                text: [
                    '【GRAVITY FREIGHT】',
                    'Terminal Report',
                    'https://t-i-oak.github.io/GravityFreight/',
                    '#GravityFreight #GameWorksOAK'
                ].join('\n')
            });
        } finally {
            vi.useRealTimers();
        }
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
            '[FlightResultScreenView] Required element not found: #flight-result-screen'
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
        expect(document.querySelector('#inventory-panel').classList.contains('state-collapsed')).toBe(true);
        expect(document.querySelector('#facility-screen').textContent).toContain('TRADING POST');
        expect(document.querySelector('#facility-screen').textContent).toContain('Long Sensor');
        expect(document.querySelector('#facility-screen').textContent).toContain('120 c');
        expect(actionHandler).toHaveBeenCalledWith('buy', { uid: 'item_1' });
        expect(departHandler).toHaveBeenCalledTimes(1);
        expect(soundController.playSE).toHaveBeenCalledTimes(2);
        expect(soundController.playSE).toHaveBeenNthCalledWith(1, 'cashier');
        expect(soundController.playSE).toHaveBeenNthCalledWith(2, 'click');
    });

    it('does not dispatch the same facility action button twice after it is locked', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const actionHandler = vi.fn();

        controller.showFacilityScreen('TRADING_POST', {
            name: 'TRADING POST',
            icon: 'T',
            themeClass: 'trading-post',
            description: 'Trading post description',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: [
                {
                    id: 'buy',
                    title: '販売中のアイテム',
                    subtitle: '',
                    entries: [
                        {
                            action: 'buy',
                            actionLabel: 'BUY',
                            uid: 'item_1',
                            price: 40,
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
                    emptySubtext: '',
                    themeClass: 'trading-post'
                }
            ]
        });
        controller.setFacilityActionHandler(actionHandler);
        const button = document.querySelector('.facility-action-button');

        button.click();
        button.click();

        expect(actionHandler).toHaveBeenCalledTimes(1);
        expect(soundController.playSE).toHaveBeenCalledTimes(1);
        expect(button.disabled).toBe(true);
    });

    it('does not dispatch facility actions from disabled action buttons', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const actionHandler = vi.fn();

        controller.showFacilityScreen('BLACK_MARKET', {
            name: 'BLACK MARKET',
            icon: 'B',
            themeClass: 'black-market',
            description: 'Black market description',
            coins: 20,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: [
                {
                    id: 'black-market',
                    title: 'Black Sector Stock',
                    subtitle: 'Acquire one item.',
                    entries: [
                        {
                            action: 'buy_premium',
                            actionLabel: 'BUY',
                            uid: 'black_market_premium',
                            price: 500,
                            discountPercent: 0,
                            disabled: true,
                            itemViewData: {
                                uid: 'black_market_premium',
                                id: 'black_market_premium',
                                name: 'Premium Deal',
                                category: 'black-market',
                                stats: {}
                            }
                        }
                    ],
                    emptyText: 'NO ITEMS',
                    emptySubtext: '現在表示できる項目はありません。',
                    themeClass: 'black-market'
                }
            ]
        });
        controller.setFacilityActionHandler(actionHandler);

        document.querySelector('.facility-action-button').click();

        expect(actionHandler).not.toHaveBeenCalled();
        expect(soundController.playSE).not.toHaveBeenCalled();
    });

    it.each(['sell', 'repair', 'dismantle', 'buy_normal', 'buy_premium'])('uses cashier SE for %s facility actions', action => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const actionHandler = vi.fn();

        controller.showFacilityScreen('TRADING_POST', {
            name: 'TRADING POST',
            icon: 'T',
            themeClass: 'trading-post',
            description: 'Trading post description',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: [
                {
                    id: 'actions',
                    title: 'Actions',
                    subtitle: 'Actions',
                    entries: [
                        {
                            action,
                            actionLabel: action.toUpperCase(),
                            uid: `${action}_1`,
                            price: 10,
                            discountPercent: 0,
                            disabled: false,
                            itemViewData: {
                                uid: `${action}_1`,
                                id: `${action}_1`,
                                name: action,
                                category: 'module',
                                stats: {}
                            }
                        }
                    ],
                    emptyText: 'NO ITEMS',
                    emptySubtext: 'No items.',
                    themeClass: 'trading-post'
                }
            ]
        });
        controller.setFacilityActionHandler(actionHandler);

        document.querySelector('.facility-action-button').click();

        expect(actionHandler).toHaveBeenCalledWith(action, { uid: `${action}_1` });
        expect(soundController.playSE).toHaveBeenCalledWith('cashier');
    });

    it.each([
        ['cleared', 'flight-exit'],
        ['returned', 'flight-return'],
        ['crashed', 'flight-crash'],
        ['lost', 'flight-lost']
    ])('plays %s flight end SE', (status, seId) => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.playFlightEndSE(status);

        expect(soundController.playSE).toHaveBeenCalledWith(seId);
    });

    it('counts facility credits up and down when credits change', () => {
        const frames = [];
        const requestFrame = vi.fn(callback => {
            frames.push(callback);
            return frames.length;
        });
        const controller = new UIController({
            gameDataRepository: repository,
            soundController,
            requestFrame,
            facilityCreditCountDurationMs: 900
        });

        controller.showFacilityScreen('TRADING_POST', {
            name: 'TRADING POST',
            icon: 'T',
            themeClass: 'trading-post',
            description: 'Trading post description',
            coins: 120,
            creditsLabel: 'CREDITS:',
            departLabel: 'TO NEXT SECTOR',
            sections: []
        });

        controller.updateFacilityCredits(80);

        expect(document.querySelector('.credits-value').textContent).toBe('120 c');
        frames.shift()(0);
        frames.shift()(900);

        expect(document.querySelector('.credits-value').textContent).toBe('80 c');
        expect(document.querySelector('.credits-value').dataset.facilityCreditsValue).toBe('80');

        controller.updateFacilityCredits(160);

        frames.shift()(0);
        frames.shift()(900);

        expect(document.querySelector('.credits-value').textContent).toBe('160 c');
        expect(document.querySelector('.credits-value').dataset.facilityCreditsValue).toBe('160');
    });

    it('registers title start operation and switches to the build screen', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const startHandler = vi.fn();
        const sessionState = { sectorNumber: 0, totalScore: 0, coins: 120 };
        document.querySelector('#inventory-panel').classList.add('state-collapsed');

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
        expect(document.querySelector('#inventory-panel').classList.contains('state-collapsed')).toBe(false);
    });

    it('opens the analytic archive from title records data', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const recordHandler = vi.fn(() => controller.showRecordScreen({
            kpis: {
                totalCompletedSectors: 3,
                lifetimeContracts: 1,
                totalCollectedItems: 8,
                achievementRate: 20
            },
            rankings: { score: [], sector: [], collected: [] },
            recentResults: [],
            replays: [],
            achievements: [],
            stories: [
                { id: 'T', title: 'Story', isRead: true, className: 'trading-post', icon: 'T' },
                { id: 'TR', title: '???', isRead: false, className: 'repair-dock', icon: 'R' }
            ]
        }));
        const storyHandler = vi.fn(storyId => controller.showStoryModal(storyId));

        controller.setRecordHandler(recordHandler);
        controller.setArchiveStoryHandler(storyHandler);
        document.querySelector('#archive-btn').click();
        document.querySelector('#tab-story').style.display = 'grid';
        expect(document.querySelector('[data-story-id="T"]').classList.contains('archive-story-card')).toBe(true);
        document.querySelector('[data-story-id="T"]').click();

        expect(recordHandler).toHaveBeenCalledTimes(1);
        expect(storyHandler).toHaveBeenCalledWith('T');
        expect(document.querySelector('#story-overlay').hidden).toBe(false);
        expect(document.querySelectorAll('#tab-story [data-story-id="TR"]')).toHaveLength(0);
        expect(soundController.playSE).toHaveBeenCalledWith('click');
        expect(document.querySelector('#archive-screen-overlay').hidden).toBe(false);
        expect(document.querySelector('#archive-screen-root').textContent).toContain('ANALYTIC ARCHIVE');
        expect(document.querySelector('#archive-screen-root').textContent).toContain('TOTAL CLEAR SECTORS');
        expect(document.querySelector('#archive-screen-overlay').classList.contains('theme-matte')).toBe(true);
    });

    it('switches to a sector transition screen before build controls are available', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showSectorTransitionScreen();

        expect(document.querySelector('#title-screen').hidden).toBe(true);
        expect(document.querySelector('#flight-result-screen').hidden).toBe(true);
        expect(document.querySelector('#facility-screen').hidden).toBe(true);
        expect(document.querySelector('#play-scene-container').hidden).toBe(false);
        expect(document.querySelector('#play-hud').hidden).toBe(false);
        expect(document.querySelector('#inventory-panel').hidden).toBe(true);
        expect(document.querySelector('#launch-control').hidden).toBe(true);
    });

    it('shows a sector ready notification in English', () => {
        vi.useFakeTimers();
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const notification = document.querySelector('#sector-notification');

        controller.showSectorTitle(4, false);

        expect(notification.textContent).toBe('SECTOR 4 READY');
        expect(notification.classList.contains('state-hidden')).toBe(false);
        expect(notification.classList.contains('state-active')).toBe(true);
        expect(notification.classList.contains('state-anomaly')).toBe(false);

        vi.advanceTimersByTime(3500);

        expect(notification.classList.contains('state-hidden')).toBe(true);
        expect(notification.classList.contains('state-active')).toBe(false);
        vi.useRealTimers();
    });

    it('shows anomaly sector ready notification with anomaly state', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const notification = document.querySelector('#sector-notification');

        controller.showSectorTitle(5, true);

        expect(notification.textContent).toBe('ANOMALY SECTOR 5 READY');
        expect(notification.classList.contains('state-anomaly')).toBe(true);
    });

    it('shows home sector ready notification when the sector arrival story is active', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const notification = document.querySelector('#sector-notification');

        controller.showSectorTitle(2, true, { type: 'home' });

        expect(notification.textContent).toBe('HOME SECTOR 2 READY');
        expect(notification.classList.contains('state-anomaly')).toBe(true);
    });

    it('switches build tabs without changing game state', () => {
        new UIController({ gameDataRepository: repository, soundController });

        document.querySelector('[data-tab="assembly"]').click();

        expect(document.querySelector('[data-tab="assembly"]').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('[data-tab="flight"]').classList.contains('state-active')).toBe(false);
        expect(document.querySelector('#tab-assembly').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#tab-flight').classList.contains('state-hidden')).toBe(true);
    });

    it('notifies registered build tab changes', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn();

        controller.setBuildTabChangeHandler(handler);
        document.querySelector('[data-tab="assembly"]').click();

        expect(handler).toHaveBeenCalledWith('assembly');
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
                subtext: 'ロケットと発射台を選択すると発射できます',
                bonusText: 'RETURN BONUS POWER x1.2'
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
        expect(document.querySelector('#launch-return-bonus').hidden).toBe(false);
        expect(document.querySelector('#launch-return-bonus').textContent).toBe('RETURN BONUS POWER x1.2');
        expect(document.querySelector('#launch-btn').disabled).toBe(true);
        expect(document.querySelector('#launch-btn').classList.contains('state-disabled')).toBe(true);
        expect(document.querySelector('#launch-btn').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#build-btn').disabled).toBe(false);
        expect(document.querySelector('#build-btn').classList.contains('state-disabled')).toBe(false);
        expect(document.querySelector('#build-btn .btn-main-label').textContent).toBe('ASSEMBLE ROCKET');

        controller.showBuildScreen({
            sections: {},
            launch: {
                ready: true,
                label: 'LAUNCH ENGINE',
                subtext: 'Ready',
                bonusText: ''
            },
            assembly: { ready: false }
        });

        expect(document.querySelector('#launch-return-bonus').hidden).toBe(true);
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

    it('does not dispatch the same assemble button twice after it is locked', () => {
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
        const button = document.querySelector('#build-btn');

        button.click();
        button.click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(soundController.playSE).toHaveBeenCalledTimes(1);
        expect(button.disabled).toBe(true);
    });

    it('unlocks the assemble button when build view data is rendered again', () => {
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
        const button = document.querySelector('#build-btn');

        button.click();
        controller.showBuildScreen({
            sections: {},
            assembly: {
                ready: true,
                label: 'ASSEMBLE ROCKET',
                subtext: 'Ready'
            },
            launch: { ready: false }
        });
        button.click();

        expect(handler).toHaveBeenCalledTimes(2);
        expect(soundController.playSE).toHaveBeenCalledTimes(2);
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

    it('does not dispatch the same launch button twice after it is locked', () => {
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
        const button = document.querySelector('#launch-btn');

        button.click();
        button.click();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(soundController.playSE).toHaveBeenCalledTimes(1);
        expect(button.disabled).toBe(true);
    });

    it('unlocks the launch button when build view data is rendered again', () => {
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
        const button = document.querySelector('#launch-btn');

        button.click();
        controller.showBuildScreen({
            sections: {},
            assembly: { ready: false },
            launch: {
                ready: true,
                label: 'LAUNCH ENGINE',
                subtext: 'Ready'
            }
        });
        button.click();

        expect(handler).toHaveBeenCalledTimes(2);
        expect(soundController.playSE).toHaveBeenCalledTimes(2);
    });

    it('does not stack assemble and launch operation handlers when they are registered again', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const firstAssembleHandler = vi.fn();
        const secondAssembleHandler = vi.fn();
        const firstLaunchHandler = vi.fn();
        const secondLaunchHandler = vi.fn();

        controller.showBuildScreen({
            sections: {},
            assembly: {
                ready: true,
                label: 'ASSEMBLE ROCKET',
                subtext: 'Ready'
            },
            launch: {
                ready: true,
                label: 'LAUNCH ENGINE',
                subtext: 'Ready'
            }
        });
        controller.setBuildAssembleHandler(firstAssembleHandler);
        controller.setBuildAssembleHandler(secondAssembleHandler);
        controller.setLaunchHandler(firstLaunchHandler);
        controller.setLaunchHandler(secondLaunchHandler);

        document.querySelector('#build-btn').click();
        controller.showBuildScreen({
            sections: {},
            assembly: { ready: false },
            launch: {
                ready: true,
                label: 'LAUNCH ENGINE',
                subtext: 'Ready'
            }
        });
        document.querySelector('#launch-btn').click();

        expect(firstAssembleHandler).not.toHaveBeenCalled();
        expect(secondAssembleHandler).toHaveBeenCalledTimes(1);
        expect(firstLaunchHandler).not.toHaveBeenCalled();
        expect(secondLaunchHandler).toHaveBeenCalledTimes(1);
        expect(soundController.playSE).toHaveBeenCalledTimes(2);
    });

    it('does not dispatch disabled build operation buttons', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const assembleHandler = vi.fn();
        const launchHandler = vi.fn();

        controller.showBuildScreen({
            sections: {},
            assembly: { ready: false, label: 'ASSEMBLE ROCKET', subtext: 'Select parts' },
            launch: { ready: false, label: 'LAUNCH ENGINE', subtext: 'Select rocket and launcher' }
        });
        controller.setBuildAssembleHandler(assembleHandler);
        controller.setLaunchHandler(launchHandler);
        document.querySelector('[data-tab="assembly"]').click();
        document.querySelector('#build-btn').click();
        document.querySelector('[data-tab="flight"]').click();
        document.querySelector('#launch-btn').click();

        expect(assembleHandler).not.toHaveBeenCalled();
        expect(launchHandler).not.toHaveBeenCalled();
        expect(soundController.playSE).not.toHaveBeenCalled();
    });

    it('registers build item selection handlers with category and uid', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn(() => ({
            sections: {
                chassis: {
                    entries: [
                        {
                            uid: 'chassis_1',
                            selected: true,
                            itemViewData: {
                                uid: 'chassis_1',
                                id: 'hull_light',
                                name: 'Light Hull',
                                category: 'chassis',
                                stats: {}
                            }
                        }
                    ]
                }
            },
            launch: { ready: false }
        }));

        controller.showBuildScreen({
            sections: {
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
                    ]
                }
            },
            launch: { ready: false }
        });
        document.querySelector('[data-tab="assembly"]').click();
        controller.setBuildItemSelectionHandler(handler);
        document.querySelector('#list-chassis .ItemCard').click();

        expect(handler).toHaveBeenCalledWith({ category: 'chassis', uid: 'chassis_1' });
        expect(soundController.playSE).toHaveBeenCalledWith('click');
        expect(document.querySelector('[data-tab="assembly"]').classList.contains('state-active')).toBe(true);
        expect(document.querySelector('#tab-assembly').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#tab-flight').classList.contains('state-hidden')).toBe(true);
        expect(document.querySelector('#list-chassis .ItemCard').classList.contains('state-selected')).toBe(true);
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

    it('updates HUD values and exposes the map and title canvases', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.updateHUDValue('sector', 3);
        controller.updateHUDValue('score', 1234);
        controller.updateHUDValue('coin', 80);

        expect(controller.getMapCanvas()).toBe(document.querySelector('#gameCanvas'));
        expect(controller.getTitleCanvases()).toEqual({
            background: document.querySelector('#title-bg-canvas'),
            foreground: document.querySelector('#title-fg-canvas')
        });
        expect(document.querySelector('#sector-display').textContent).toBe('3');
        expect(document.querySelector('#score-display').textContent).toBe('1,234');
        expect(document.querySelector('#coin-display').textContent).toBe('80');
    });

    it('updates mail icon status by story branch and unread state', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const mailButton = document.querySelector('#mail-btn-1');

        controller.updateMailStatus(1, 'R', true);

        expect(mailButton.classList.contains('repair-dock')).toBe(true);
        expect(mailButton.classList.contains('state-clickable')).toBe(true);
        expect(mailButton.classList.contains('state-disabled')).toBe(false);
        expect(mailButton.classList.contains('state-new')).toBe(true);

        controller.updateMailStatus(1, 'R', false);

        expect(mailButton.classList.contains('repair-dock')).toBe(true);
        expect(mailButton.classList.contains('state-clickable')).toBe(true);
        expect(mailButton.classList.contains('state-new')).toBe(false);
    });

    it('opens the registered mail handler from active mail icons only', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn();
        const latestHandler = vi.fn();

        controller.setMailHandler(handler);
        controller.setMailHandler(latestHandler);
        document.querySelector('#mail-btn-0').click();
        document.querySelector('#mail-btn-2').click();

        expect(handler).not.toHaveBeenCalled();
        expect(latestHandler).toHaveBeenCalledTimes(1);
        expect(latestHandler).toHaveBeenCalledWith(0);
        expect(soundController.playSE).toHaveBeenCalledTimes(1);
    });

    it('renders and closes a story modal from a story id', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const overlay = document.querySelector('#story-overlay');

        controller.showStoryModal('T');

        expect(overlay.hidden).toBe(false);
        expect(overlay.classList.contains('state-hidden')).toBe(false);
        expect(overlay.textContent).toContain('Story');
        expect(overlay.textContent).toContain('Story body');

        document.querySelector('#story-modal-close').click();

        expect(overlay.hidden).toBe(true);
        expect(overlay.classList.contains('state-hidden')).toBe(true);
        expect(overlay.innerHTML).toBe('');
    });

    it('refreshes a visible story modal when language resources change', () => {
        repository.getStoryContent
            .mockReturnValueOnce({
                title: 'Story',
                discovery: 'Discovery',
                content: 'Story body',
                branch: 'T'
            })
            .mockReturnValueOnce({
                title: '物語',
                discovery: '発見',
                content: '物語本文',
                branch: 'T'
            });
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const overlay = document.querySelector('#story-overlay');

        controller.showStoryModal('T');
        controller.refreshLanguageDependentUI();

        expect(overlay.hidden).toBe(false);
        expect(overlay.textContent).toContain('物語');
        expect(overlay.textContent).toContain('物語本文');

        document.querySelector('#story-modal-close').click();

        expect(overlay.hidden).toBe(true);
        expect(overlay.innerHTML).toBe('');
    });

    it('opens the registered story handler from flight result story cards', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const handler = vi.fn();
        const viewData = createViewData();
        viewData.storyCards = [{ id: 'T', type: 'T', isUnread: true }];

        controller.setResultStoryHandler(handler);
        controller.showResultScreen(viewData);
        document.querySelector('.story-card[data-story-id="T"]').click();

        expect(handler).toHaveBeenCalledWith('T');
        expect(soundController.playSE).toHaveBeenCalledWith('click');
    });

    it('shows achievement reached toasts from achievement events', () => {
        vi.useFakeTimers();
        const controller = new UIController({
            gameDataRepository: repository,
            soundController,
            achievementToastDurationMs: 1000
        });

        try {
            controller.showAchievementToasts([
                { achievementId: 'stat_launches', tier: 3, value: 20 }
            ]);

            const toast = document.querySelector('.AchievementToast');
            expect(toast).not.toBeNull();
            expect(toast.classList.contains('state-active')).toBe(true);
            expect(toast.querySelector('.AchievementCard')).not.toBeNull();
            expect(toast.querySelector('.seal-num').textContent).toBe('III');
            expect(toast.textContent).toContain('最初の跳躍');
            expect(toast.textContent).toContain('累積発射回数');
            expect(toast.textContent).toContain('20 / 20');

            vi.advanceTimersByTime(1000);

            expect(toast.classList.contains('state-exit')).toBe(true);

            vi.advanceTimersByTime(250);

            expect(document.querySelector('.AchievementToast')).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('refreshes visible achievement toasts when language resources change', () => {
        vi.useFakeTimers();
        repository.getAchievementDefinition
            .mockReturnValueOnce({
                id: 'stat_launches',
                label: '累積発射回数',
                tiers: [
                    { goal: 1000, title: '銀河の英雄' },
                    { goal: 150, title: '安定した打ち上げ' },
                    { goal: 20, title: '最初の跳躍' }
                ]
            })
            .mockReturnValueOnce({
                id: 'stat_launches',
                label: 'Total launches',
                tiers: [
                    { goal: 1000, title: 'Galactic Hero' },
                    { goal: 150, title: 'Steady Launch' },
                    { goal: 20, title: 'First Jump' }
                ]
            });
        const controller = new UIController({
            gameDataRepository: repository,
            soundController,
            achievementToastDurationMs: 1000
        });

        try {
            controller.showAchievementToasts([
                { achievementId: 'stat_launches', tier: 3, value: 20 }
            ]);
            controller.refreshLanguageDependentUI();

            const toast = document.querySelector('.AchievementToast');
            expect(toast).not.toBeNull();
            expect(toast.textContent).toContain('First Jump');
            expect(toast.textContent).toContain('Total launches');
            expect(toast.textContent).toContain('20 / 20');
        } finally {
            vi.useRealTimers();
        }
    });

    it('opens and closes the title settings overlay from title controls', () => {
        new UIController({ gameDataRepository: repository, soundController });
        const overlay = document.querySelector('#settings-overlay');

        document.querySelector('#title-settings-btn').click();

        expect(overlay.hidden).toBe(false);
        expect(overlay.classList.contains('state-hidden')).toBe(false);
        expect(soundController.playSE).toHaveBeenCalledWith('click');

        document.querySelector('#settings-done-btn').click();

        expect(overlay.hidden).toBe(true);
        expect(overlay.classList.contains('state-hidden')).toBe(true);
    });

    it('opens the shared settings overlay from the build panel settings control', () => {
        new UIController({ gameDataRepository: repository, soundController });
        const overlay = document.querySelector('#settings-overlay');

        document.querySelector('#build-settings-btn').click();

        expect(overlay.hidden).toBe(false);
        expect(overlay.classList.contains('state-hidden')).toBe(false);
        expect(soundController.playSE).toHaveBeenCalledWith('click');
    });

    it('renders app metadata with a portal copyright link', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.setAppMetadata({
            version: '0.89.0',
            copyright: {
                holder: 'T.I.OAK',
                year: '2026',
                portal: 'GameWorks OAK',
                portalUrl: 'https://t-i-oak.github.io/GameWorksOAK/'
            }
        });

        const link = document.querySelector('.copyright a');
        expect(document.querySelector('#version').textContent).toBe('Ver 0.89.0');
        expect(document.querySelector('.copyright').textContent).toContain('© T.I.OAK 2026');
        expect(link.textContent).toBe('GameWorks OAK');
        expect(link.href).toBe('https://t-i-oak.github.io/GameWorksOAK/');
        expect(link.target).toBe('_blank');
        expect(link.rel).toBe('noopener noreferrer');
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

    it('refreshes the visible star item panel after language resources change', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const item = {
            id: 'coin_100',
            uid: 'coin_1',
            category: 'coin',
            equals: vi.fn(candidate => candidate.id === 'coin_100'),
            getViewData: vi.fn()
                .mockReturnValueOnce({
                    id: 'coin_100',
                    uid: 'coin_1',
                    name: '100c Coin',
                    category: 'coin',
                    stats: {}
                })
                .mockReturnValueOnce({
                    id: 'coin_100',
                    uid: 'coin_1',
                    name: '100コイン',
                    category: 'coin',
                    stats: {}
                })
        };

        controller.showStarInfo({
            isHome: false,
            items: [item]
        }, { x: 10, y: 20 });

        expect(document.querySelector('#star-info-list').textContent).toContain('100c Coin');

        controller.refreshLanguageDependentUI();

        expect(document.querySelector('#star-info-list').textContent).toContain('100コイン');
    });

    it('opens the How To Play screen from the registered title handler', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        controller.setManualHandler(() => controller.showManualScreen());

        document.querySelector('#how-to-play-btn').click();

        expect(document.querySelector('#how-to-play-overlay').hidden).toBe(false);
        expect(document.querySelector('#how-to-play-overlay').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('.how-to-play-slide').textContent).toContain('MISSION');
        expect(document.querySelector('.how-to-play-slide').textContent).toContain('Mission briefing');
        expect(soundController.playSE).toHaveBeenCalledWith('click');

        document.querySelector('[data-how-to-play-action="close"]').click();

        expect(document.querySelector('#how-to-play-overlay').hidden).toBe(true);
        expect(document.querySelector('#how-to-play-overlay').classList.contains('state-hidden')).toBe(true);
    });

    it('shows replay playback UI with a dedicated read-only loadout panel', () => {
        const controller = new UIController({ gameDataRepository: repository, soundController });
        const exitHandler = vi.fn();
        const replayBuildViewData = {
            sections: {
                rocket: {
                    entries: [
                        {
                            uid: 'rocket_1',
                            disabled: true,
                            itemViewData: {
                                uid: 'rocket_1',
                                id: 'rocket',
                                name: 'Replay Rocket',
                                category: 'rocket',
                                stats: {}
                            }
                        }
                    ]
                },
                launcher: {
                    entries: [
                        {
                            uid: 'launcher_1',
                            disabled: true,
                            itemViewData: {
                                uid: 'launcher_1',
                                id: 'ln_standard',
                                name: 'Replay Launcher',
                                category: 'launcher',
                                stats: {}
                            }
                        }
                    ]
                },
                booster: { entries: [] },
                chassis: { entries: [] },
                logic: { entries: [] },
                module: { entries: [] }
            },
            assembly: {
                ready: false,
                label: 'ASSEMBLE ROCKET',
                subtext: 'Disabled during replay.'
            },
            launch: {
                ready: false,
                label: 'LAUNCH ENGINE',
                subtext: 'Disabled during replay.',
                bonusText: ''
            }
        };

        controller.setReplayExitHandler(exitHandler);
        document.querySelector('#archive-screen-overlay').hidden = false;
        document.querySelector('#archive-screen-overlay').classList.remove('state-hidden');
        document.querySelector('[data-tab="assembly"]').click();
        controller.showReplayScreen({ id: 'flight_1' }, replayBuildViewData);

        expect(document.querySelector('#archive-screen-overlay').hidden).toBe(true);
        expect(document.querySelector('#archive-screen-overlay').classList.contains('state-hidden')).toBe(true);
        expect(document.querySelector('#replay-overlay').hidden).toBe(false);
        expect(document.querySelector('#replay-overlay').classList.contains('state-hidden')).toBe(false);
        expect(document.querySelector('#play-scene-container').hidden).toBe(false);
        expect(document.querySelector('#play-hud').hidden).toBe(false);
        expect(document.querySelector('#inventory-panel').hidden).toBe(true);
        expect(document.querySelector('#replay-config-list').textContent).toContain('ROCKET');
        expect(document.querySelector('#replay-config-list').textContent).toContain('Replay Rocket');
        expect(document.querySelector('#replay-config-list').textContent).toContain('LAUNCHER');
        expect(document.querySelector('#replay-config-list').textContent).toContain('Replay Launcher');
        expect(document.querySelector('#replay-config-list .ItemCard.state-clickable')).toBeNull();

        document.querySelector('#exit-replay-btn').click();

        expect(exitHandler).toHaveBeenCalledTimes(1);

        controller.hideReplayScreen();

        expect(document.querySelector('#replay-overlay').hidden).toBe(true);
        expect(document.querySelector('#replay-config-list').innerHTML).toBe('');
        expect(document.querySelector('#inventory-panel').hidden).toBe(true);
    });

    it('shows delivery cargo guidance in the star info panel format', () => {
        repository.getItemDefinition.mockReturnValue({
            id: 'cargo_safe',
            name: '通商物資'
        });
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showDeliveryCargoInfo({
            facilityType: 'TRADING_POST',
            itemId: 'cargo_safe'
        }, { x: 10, y: 20 });

        expect(document.querySelector('#star-info-panel').hidden).toBe(false);
        expect(document.querySelector('#star-info-title').textContent).toBe('DELIVERY TARGET');
        expect(document.querySelector('#star-info-list').textContent).toContain('Deliver 通商物資 to TRADING POST.');
    });

    it('refreshes delivery cargo guidance text when language resources change for the same target', () => {
        repository.getItemDefinition
            .mockReturnValueOnce({
                id: 'cargo_safe',
                name: 'Trade Cargo'
            })
            .mockReturnValueOnce({
                id: 'cargo_safe',
                name: '通商物資'
            });
        repository.getUiText.mockImplementation(key => ({
            'map.deliveryCargo.title': 'DELIVERY TARGET',
            'map.deliveryCargo.body': 'Deliver {itemName} to {facilityName}.'
        })[key]);
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showDeliveryCargoInfo({
            facilityType: 'TRADING_POST',
            itemId: 'cargo_safe'
        }, { x: 10, y: 20 });
        repository.getUiText.mockImplementation(key => ({
            'map.deliveryCargo.title': '配送先',
            'map.deliveryCargo.body': '{itemName}を{facilityName}へ配送してください。'
        })[key]);
        controller.showDeliveryCargoInfo({
            facilityType: 'TRADING_POST',
            itemId: 'cargo_safe'
        }, { x: 10, y: 20 });

        expect(document.querySelector('#star-info-title').textContent).toBe('配送先');
        expect(document.querySelector('#star-info-list').textContent).toContain('通商物資をTRADING POSTへ配送してください。');
    });

    it('refreshes visible delivery cargo guidance when language resources change', () => {
        repository.getItemDefinition
            .mockReturnValueOnce({
                id: 'cargo_safe',
                name: 'Trade Cargo'
            })
            .mockReturnValueOnce({
                id: 'cargo_safe',
                name: '通商物資'
            });
        repository.getUiText.mockImplementation(key => ({
            'map.deliveryCargo.title': 'DELIVERY TARGET',
            'map.deliveryCargo.body': 'Deliver {itemName} to {facilityName}.'
        })[key]);
        const controller = new UIController({ gameDataRepository: repository, soundController });

        controller.showDeliveryCargoInfo({
            facilityType: 'TRADING_POST',
            itemId: 'cargo_safe'
        }, { x: 10, y: 20 });
        repository.getUiText.mockImplementation(key => ({
            'map.deliveryCargo.title': '配送先',
            'map.deliveryCargo.body': '{itemName}を{facilityName}へ配送してください。'
        })[key]);

        controller.refreshLanguageDependentUI();

        expect(document.querySelector('#star-info-title').textContent).toBe('配送先');
        expect(document.querySelector('#star-info-list').textContent).toContain('通商物資をTRADING POSTへ配送してください。');
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

    it('prevents browser zoom and scroll gestures while handling map touch and wheel input', () => {
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
        const firstTouch = createPointerEvent('pointerdown', {
            pointerId: 1,
            pointerType: 'touch',
            clientX: 100,
            clientY: 100
        });
        const secondTouch = createPointerEvent('pointerdown', {
            pointerId: 2,
            pointerType: 'touch',
            clientX: 200,
            clientY: 100
        });
        const pinchMove = createPointerEvent('pointermove', {
            pointerId: 2,
            pointerType: 'touch',
            clientX: 240,
            clientY: 100
        });
        const wheel = new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaY: -120,
            clientX: 220,
            clientY: 180
        });
        const contextMenu = new Event('contextmenu', { bubbles: true, cancelable: true });
        const selectStart = new Event('selectstart', { bubbles: true, cancelable: true });

        canvas.dispatchEvent(firstTouch);
        canvas.dispatchEvent(secondTouch);
        window.dispatchEvent(pinchMove);
        canvas.dispatchEvent(wheel);
        canvas.dispatchEvent(contextMenu);
        canvas.dispatchEvent(selectStart);

        expect(firstTouch.defaultPrevented).toBe(true);
        expect(secondTouch.defaultPrevented).toBe(true);
        expect(pinchMove.defaultPrevented).toBe(true);
        expect(wheel.defaultPrevented).toBe(true);
        expect(contextMenu.defaultPrevented).toBe(true);
        expect(selectStart.defaultPrevented).toBe(true);
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
            type: 'pointerdown',
            point: { x: 160, y: 120 },
            displayPoint: { x: 80, y: 60 },
            pointerType: 'touch'
        }));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'pinch' }));
        expect(handler).toHaveBeenCalledWith(expect.objectContaining({ type: 'wheel' }));
    });
});
