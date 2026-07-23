import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppOrchestrator from '../../../src/core/AppOrchestrator.js';
import packageData from '../../../package.json';
import { getAppVersion } from '../../../../GameWorksOAK/src/lib/utils/env.js';

class FakeGameController {
    constructor(infrastructure) {
        this.infrastructure = infrastructure;
        this.start = vi.fn(() => Promise.resolve());
        this.getTutorialScene = vi.fn(() => 'build');
    }
}

class FakeTutorialFlowController {
    constructor() {
        this.initialize = vi.fn();
        this.reset = vi.fn();
        this.setTriggersBlocked = vi.fn();
        this.checkCurrentSceneTrigger = vi.fn();
        FakeTutorialFlowController.instance = this;
    }
}

function createCommonDataManagerStub() {
    return {
        getSavedData: vi.fn((key, migrationMap) => migrationMap?.init?.()),
        setSavedData: vi.fn()
    };
}

function createUIControllerStub() {
    const canvas = { getContext: vi.fn(() => ({})) };
    const titleCanvases = {
        background: { getContext: vi.fn(() => ({})), clientWidth: 800, clientHeight: 600 },
        foreground: { getContext: vi.fn(() => ({})), clientWidth: 800, clientHeight: 600 }
    };
    return {
        showTitleScreen: vi.fn(),
        showRecordScreen: vi.fn(),
        hideRecordScreen: vi.fn(),
        showReplayScreen: vi.fn(),
        hideReplayScreen: vi.fn(),
        setReplayStartHandler: vi.fn(),
        setReplayExitHandler: vi.fn(),
        setReplayProtectHandler: vi.fn(),
        setReplayProtectRecordsProvider: vi.fn(),
        setArchiveStoryHandler: vi.fn(),
        setStartHandler: vi.fn(),
        setRecordHandler: vi.fn(),
        setManualHandler: vi.fn(),
        setCanvasInputHandler: vi.fn(),
        showManualScreen: vi.fn(),
        refreshManualLanguage: vi.fn(),
        refreshLanguageDependentUI: vi.fn(),
        getRecordScreenState: vi.fn(() => ({ visible: false, activeTab: null })),
        setAppMetadata: vi.fn(),
        configureSettings: vi.fn(),
        initHUD: vi.fn(),
        showBuildScreen: vi.fn(),
        getMapCanvas: vi.fn(() => canvas),
        getTitleCanvases: vi.fn(() => titleCanvases)
    };
}

function createReplayItem(uid, category, name = uid) {
    return {
        uid,
        getViewData: vi.fn(() => ({
            uid,
            id: uid,
            name,
            category,
            stats: {}
        }))
    };
}

describe('AppOrchestrator', () => {
    let commonDataManager;
    let uiController;
    let renderer;
    let titleScreenAnimator;
    let soundController;

    beforeEach(() => {
        document.body.innerHTML = '<button id="tutorial-next-btn"></button>';
        commonDataManager = createCommonDataManagerStub();
        uiController = createUIControllerStub();
        renderer = {
            initialize: vi.fn(),
            setSector: vi.fn(),
            setSoundController: vi.fn(),
            render: vi.fn(),
            clearPredictionPath: vi.fn(),
            clearAimRocket: vi.fn(),
            resetMapWarp: vi.fn(),
            setAimRocket: vi.fn(),
            setPredictionPath: vi.fn(),
            startNavigation: vi.fn(),
            enableSonar: vi.fn(),
            disableSonar: vi.fn(),
            playFinishAnimation: vi.fn(() => Promise.resolve()),
            setRenderLoopActive: vi.fn()
        };
        titleScreenAnimator = {
            initialize: vi.fn(),
            start: vi.fn(),
            stop: vi.fn()
        };
        soundController = {
            initialize: vi.fn()
        };
    });

    it('boots shared app systems and wires title start to a game controller', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            soundController,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });

        await orchestrator.boot();
        await uiController.setStartHandler.mock.calls[0][0]();

        expect(getAppVersion()).toBe(packageData.version);
        expect(renderer.initialize).toHaveBeenCalledWith(
            uiController.getMapCanvas(),
            orchestrator.systems.cameraController,
            orchestrator.systems.backgroundManager
        );
        expect(titleScreenAnimator.initialize).toHaveBeenCalledWith(
            uiController.getTitleCanvases(),
            orchestrator.systems.backgroundManager
        );
        expect(uiController.setAppMetadata).toHaveBeenCalledWith(expect.objectContaining({
            version: packageData.version
        }));
        expect(uiController.setReplayStartHandler).toHaveBeenCalled();
        expect(uiController.setReplayExitHandler).toHaveBeenCalled();
        expect(uiController.setReplayProtectHandler).toHaveBeenCalled();
        expect(uiController.setReplayProtectRecordsProvider).toHaveBeenCalled();
        expect(uiController.setArchiveStoryHandler).toHaveBeenCalled();
        uiController.setManualHandler.mock.calls[0][0]();
        expect(uiController.showManualScreen).toHaveBeenCalled();
        expect(uiController.configureSettings).toHaveBeenCalledWith(expect.objectContaining({
            seVolume: expect.any(Number),
            onSEVolumeChange: expect.any(Function),
            onCameraReset: expect.any(Function),
            onTutorialReset: expect.any(Function),
            setupLanguageSelector: expect.any(Function),
            onLanguageChange: expect.any(Function)
        }));
        expect(soundController.initialize).toHaveBeenCalled();
        expect(renderer.setSoundController).toHaveBeenCalledWith(soundController);
        expect(uiController.showTitleScreen).toHaveBeenCalled();
        expect(titleScreenAnimator.start).toHaveBeenCalledTimes(1);
        expect(titleScreenAnimator.stop).toHaveBeenCalledTimes(1);
        expect(renderer.setRenderLoopActive).toHaveBeenCalledWith(false);
        expect(renderer.setRenderLoopActive).toHaveBeenCalledWith(true);
        expect(orchestrator.gameController).toBeInstanceOf(FakeGameController);
        expect(orchestrator.gameController.infrastructure.gameDataRepository).toBe(orchestrator.gameDataRepository);
        expect(orchestrator.gameController.start).toHaveBeenCalled();
    });

    it('routes settings operations to sound, camera, renderer, and common i18n', async () => {
        soundController = {
            initialize: vi.fn(),
            getSEVolume: vi.fn(() => 0.31),
            setSEVolume: vi.fn(),
            playSE: vi.fn()
        };
        const setupLanguageSelector = vi.fn();
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            soundController,
            gameControllerClass: FakeGameController,
            i18nAdapter: {
                expandLanguageResource: value => value,
                setupLanguageSelector
            }
        });

        await orchestrator.boot();
        const settings = uiController.configureSettings.mock.calls[0][0];
        settings.onSEVolumeChange(0.82);
        orchestrator.systems.cameraController.position = { x: 12, y: -9 };
        settings.onCameraReset();
        settings.setupLanguageSelector('select', ['ja', 'en'], settings.onLanguageChange);
        settings.onLanguageChange('en');

        expect(settings.seVolume).toBe(0.31);
        expect(soundController.setSEVolume).toHaveBeenCalledWith(0.82);
        expect(soundController.playSE).toHaveBeenCalledWith('select', 0.82);
        expect(orchestrator.systems.cameraController.position).toEqual({ x: 0, y: 0 });
        expect(renderer.render).toHaveBeenCalled();
        expect(setupLanguageSelector).toHaveBeenCalledWith('select', ['ja', 'en'], settings.onLanguageChange);
        expect(uiController.setAppMetadata).toHaveBeenCalledTimes(2);
        expect(uiController.refreshManualLanguage).toHaveBeenCalledTimes(1);
        expect(uiController.refreshLanguageDependentUI).toHaveBeenCalledTimes(1);
    });

    it('routes tutorial reset from settings through the tutorial flow controller', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            soundController,
            gameControllerClass: FakeGameController,
            tutorialFlowControllerClass: FakeTutorialFlowController,
            i18nAdapter: { expandLanguageResource: value => value }
        });

        await orchestrator.boot();
        await orchestrator.startGame();
        const settings = uiController.configureSettings.mock.calls[0][0];

        settings.onOpen();
        settings.onClose();
        settings.onTutorialReset();

        expect(FakeTutorialFlowController.instance.initialize).toHaveBeenCalledTimes(1);
        expect(FakeTutorialFlowController.instance.setTriggersBlocked).toHaveBeenNthCalledWith(1, true);
        expect(FakeTutorialFlowController.instance.setTriggersBlocked).toHaveBeenNthCalledWith(2, false);
        expect(FakeTutorialFlowController.instance.checkCurrentSceneTrigger).toHaveBeenCalledWith({
            currentScene: 'build',
            source: 'settingsClose'
        });
        expect(FakeTutorialFlowController.instance.reset).toHaveBeenCalledWith({ currentScene: 'build' });
    });

    it('returns to the title screen and drops the current game lifecycle controller', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });

        await orchestrator.boot();
        await orchestrator.startGame();
        orchestrator.returnToTitle();

        expect(orchestrator.gameController).toBeNull();
        expect(uiController.showTitleScreen).toHaveBeenCalledTimes(2);
        expect(titleScreenAnimator.start).toHaveBeenCalledTimes(2);
    });

    it('opens the record screen with persistent archive data', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });

        await orchestrator.boot();
        uiController.setRecordHandler.mock.calls[0][0]();

        expect(uiController.showRecordScreen).toHaveBeenCalledWith(
            expect.objectContaining({
                kpis: expect.objectContaining({
                    totalCompletedSectors: 0,
                    lifetimeContracts: 0,
                    totalCollectedItems: 0,
                    achievementRate: 0
                }),
                rankings: expect.objectContaining({
                    score: [],
                    sector: [],
                    collected: []
                }),
                replays: [],
                achievements: expect.any(Array),
                stories: expect.any(Array)
            }),
            {}
        );
    });

    it('creates a replay context from the selected archive replay id', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });

        await orchestrator.boot();
        const rocket = {
            position: { x: 0, y: 0 },
            rocketItem: createReplayItem('rocket_item_1', 'rocket', 'Replay Rocket'),
            launcher: createReplayItem('launcher_1', 'launcher', 'Replay Launcher'),
            booster: createReplayItem('booster_1', 'booster', 'Replay Booster')
        };
        const sector = { bodies: [], exits: [] };
        orchestrator.systems.navigationLoopController = {
            stop: vi.fn(),
            start: vi.fn()
        };
        orchestrator.systems.flightRecorder = {
            createReplayContext: vi.fn(() => ({ record: { id: 'flight_1', reachedSector: 2, score: 300 }, rocket, sector }))
        };
        const cameraResetSpy = vi.spyOn(orchestrator.systems.cameraController, 'reset');
        const context = uiController.setReplayStartHandler.mock.calls[0][0]('flight_1');

        expect(orchestrator.systems.flightRecorder.createReplayContext).toHaveBeenCalledWith('flight_1');
        expect(context.record.id).toBe('flight_1');
        expect(orchestrator.replayContext).toBe(context);
        expect(cameraResetSpy).not.toHaveBeenCalled();
        expect(renderer.resetMapWarp).toHaveBeenCalledTimes(1);
        expect(uiController.hideRecordScreen).toHaveBeenCalled();
        expect(uiController.showReplayScreen).toHaveBeenCalledWith(
            context.record,
            expect.objectContaining({
                sections: expect.objectContaining({
                    rocket: expect.objectContaining({
                        entries: [
                            expect.objectContaining({
                                uid: 'rocket_item_1',
                                disabled: true
                            })
                        ]
                    }),
                    launcher: expect.objectContaining({
                        entries: [
                            expect.objectContaining({
                                uid: 'launcher_1',
                                disabled: true
                            })
                        ]
                    }),
                    booster: expect.objectContaining({
                        entries: [
                            expect.objectContaining({
                                uid: 'booster_1',
                                disabled: true
                            })
                        ]
                    })
                }),
                launch: expect.objectContaining({
                    ready: false
                })
            })
        );
        expect(uiController.initHUD).toHaveBeenCalledWith({
            sectorNumber: 2,
            totalScore: 0,
            coins: 0
        });
        expect(renderer.setSector).toHaveBeenCalledWith(sector);
        expect(renderer.startNavigation).toHaveBeenCalledWith(rocket);
        expect(renderer.enableSonar).toHaveBeenCalled();
    });

    it('stops replay playback and returns to the archive screen', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });
        const rocket = { position: { x: 0, y: 0 } };
        const sector = { bodies: [], exits: [] };

        await orchestrator.boot();
        orchestrator.systems.navigationLoopController = {
            stop: vi.fn(),
            start: vi.fn()
        };
        orchestrator.systems.flightRecorder = {
            createReplayContext: vi.fn(() => ({ record: { id: 'flight_1', reachedSector: 2, score: 300 }, rocket, sector })),
            getRecords: vi.fn(() => [])
        };
        uiController.setReplayStartHandler.mock.calls[0][0]('flight_1');
        uiController.setReplayExitHandler.mock.calls[0][0]();

        expect(renderer.disableSonar).toHaveBeenCalled();
        expect(renderer.startNavigation).toHaveBeenLastCalledWith(null);
        expect(uiController.hideReplayScreen).toHaveBeenCalled();
        expect(orchestrator.replayContext).toBeNull();
        expect(renderer.setRenderLoopActive).toHaveBeenLastCalledWith(false);
        expect(uiController.showTitleScreen).toHaveBeenCalledTimes(2);
        expect(titleScreenAnimator.start).toHaveBeenCalledTimes(2);
        expect(uiController.showRecordScreen).toHaveBeenCalledWith(expect.any(Object), { activeTab: 'replays' });
    });

    it('keeps the final replay map visible after navigation finishes until exit replay is requested', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });
        const rocket = { position: { x: 0, y: 0 } };
        const sector = { bodies: [], exits: [] };
        let onNavigationEnd;

        await orchestrator.boot();
        orchestrator.systems.navigationLoopController = {
            stop: vi.fn(),
            start: vi.fn(options => {
                onNavigationEnd = options.onNavigationEnd;
            })
        };
        orchestrator.systems.flightRecorder = {
            createReplayContext: vi.fn(() => ({ record: { id: 'flight_1', reachedSector: 2, score: 300 }, rocket, sector })),
            getRecords: vi.fn(() => [])
        };
        uiController.setReplayStartHandler.mock.calls[0][0]('flight_1');
        uiController.showTitleScreen.mockClear();
        titleScreenAnimator.start.mockClear();
        renderer.setRenderLoopActive.mockClear();

        await onNavigationEnd();

        expect(renderer.disableSonar).toHaveBeenCalled();
        expect(renderer.playFinishAnimation).toHaveBeenCalled();
        expect(renderer.setRenderLoopActive).toHaveBeenCalledWith(false);
        expect(uiController.hideReplayScreen).not.toHaveBeenCalled();
        expect(uiController.showTitleScreen).not.toHaveBeenCalled();
        expect(uiController.showRecordScreen).not.toHaveBeenCalled();
        expect(titleScreenAnimator.start).not.toHaveBeenCalled();
        expect(orchestrator.replayContext).not.toBeNull();
    });

    it('allows replay map viewing controls without enabling AIM or launch operations', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });
        const rocket = { position: { x: 0, y: 0 } };
        const sector = { bodies: [], exits: [] };

        await orchestrator.boot();
        orchestrator.systems.navigationLoopController = {
            stop: vi.fn(),
            start: vi.fn()
        };
        orchestrator.systems.flightRecorder = {
            createReplayContext: vi.fn(() => ({ record: { id: 'flight_1', reachedSector: 2, score: 300 }, rocket, sector })),
            getRecords: vi.fn(() => [])
        };
        const saveSpy = vi.spyOn(orchestrator.systems.cameraController, 'save');
        const panSpy = vi.spyOn(orchestrator.systems.cameraController, 'pan');

        uiController.setReplayStartHandler.mock.calls[0][0]('flight_1');
        const replayInputHandler = uiController.setCanvasInputHandler.mock.calls.at(-1)[0];
        replayInputHandler({ type: 'pointerdown', point: { x: 10, y: 20 }, shiftKey: true, ctrlKey: false });
        replayInputHandler({ type: 'pointermove', point: { x: 18, y: 24 } });
        replayInputHandler({ type: 'pointerup', point: { x: 18, y: 24 } });

        expect(panSpy).toHaveBeenCalledWith({ x: 8, y: 4 });
        expect(saveSpy).toHaveBeenCalled();
        expect(renderer.render).toHaveBeenCalled();
        expect(renderer.setAimRocket).not.toHaveBeenCalled();
        expect(renderer.setPredictionPath).not.toHaveBeenCalled();

        uiController.setReplayExitHandler.mock.calls[0][0]();
        expect(uiController.setCanvasInputHandler).toHaveBeenLastCalledWith(null);
    });

    it('refreshes the replay loadout panel when the language changes during replay playback', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });
        const rocket = {
            position: { x: 0, y: 0 },
            rocketItem: createReplayItem('rocket_item_1', 'rocket', 'Replay Rocket'),
            launcher: createReplayItem('launcher_1', 'launcher', 'Replay Launcher')
        };
        const sector = { bodies: [], exits: [] };

        await orchestrator.boot();
        const settings = uiController.configureSettings.mock.calls[0][0];
        orchestrator.systems.navigationLoopController = {
            stop: vi.fn(),
            start: vi.fn()
        };
        orchestrator.systems.flightRecorder = {
            createReplayContext: vi.fn(() => ({ record: { id: 'flight_1', reachedSector: 2, score: 300 }, rocket, sector })),
            getRecords: vi.fn(() => [])
        };
        uiController.setReplayStartHandler.mock.calls[0][0]('flight_1');
        uiController.showReplayScreen.mockClear();

        settings.onLanguageChange('en');

        expect(uiController.showReplayScreen).toHaveBeenCalledWith(
            orchestrator.replayContext.record,
            expect.objectContaining({
                sections: expect.objectContaining({
                    rocket: expect.objectContaining({
                        entries: [
                            expect.objectContaining({
                                uid: 'rocket_item_1',
                                disabled: true
                            })
                        ]
                    }),
                    launcher: expect.objectContaining({
                        entries: [
                            expect.objectContaining({
                                uid: 'launcher_1',
                                disabled: true
                            })
                        ]
                    })
                })
            })
        );
    });

    it('refreshes the visible archive screen without changing the active tab when language changes', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });

        await orchestrator.boot();
        const settings = uiController.configureSettings.mock.calls[0][0];
        uiController.getRecordScreenState.mockReturnValue({ visible: true, activeTab: 'achievements' });
        uiController.showRecordScreen.mockClear();

        settings.onLanguageChange('en');

        expect(uiController.showRecordScreen).toHaveBeenCalledWith(
            expect.objectContaining({
                kpis: expect.any(Object),
                rankings: expect.any(Object),
                replays: expect.any(Array),
                achievements: expect.any(Array),
                stories: expect.any(Array)
            }),
            { activeTab: 'achievements' }
        );
    });

    it('updates replay protect state from the shared replay protect flow', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });

        await orchestrator.boot();
        orchestrator.systems.flightRecorder = {
            setFavorite: vi.fn(() => ({ id: 'flight_1', favorite: true }))
        };
        const updated = uiController.setReplayProtectHandler.mock.calls[0][0]({
            source: 'archive',
            recordId: 'flight_1',
            favorite: true
        });

        expect(orchestrator.systems.flightRecorder.setFavorite).toHaveBeenCalledWith('flight_1', true);
        expect(updated).toEqual({ id: 'flight_1', favorite: true });
    });

    it('routes result replay protect changes to the active game controller', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });

        await orchestrator.boot();
        await orchestrator.startGame();
        orchestrator.gameController.handleResultProtect = vi.fn(() => ({ id: 'flight_current', favorite: true }));

        const updated = uiController.setReplayProtectHandler.mock.calls[0][0]({
            source: 'result',
            recordId: 'flight_current',
            favorite: true,
            replaceRecordId: 'flight_old'
        });

        expect(orchestrator.gameController.handleResultProtect).toHaveBeenCalledWith(true, {
            replaceRecordId: 'flight_old'
        });
        expect(updated).toEqual({ id: 'flight_current', favorite: true });
    });
});
