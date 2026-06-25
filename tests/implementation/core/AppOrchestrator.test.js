import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppOrchestrator from '../../../src/core/AppOrchestrator.js';
import packageData from '../../../package.json';
import { getAppVersion } from '../../../../GameWorksOAK/src/lib/utils/env.js';

class FakeGameController {
    constructor(infrastructure) {
        this.infrastructure = infrastructure;
        this.start = vi.fn(() => Promise.resolve());
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
        setReplayStartHandler: vi.fn(),
        setReplayProtectHandler: vi.fn(),
        setReplayProtectRecordsProvider: vi.fn(),
        setStartHandler: vi.fn(),
        setRecordHandler: vi.fn(),
        setManualHandler: vi.fn(),
        setAppMetadata: vi.fn(),
        initHUD: vi.fn(),
        showBuildScreen: vi.fn(),
        getMapCanvas: vi.fn(() => canvas),
        getTitleCanvases: vi.fn(() => titleCanvases)
    };
}

describe('AppOrchestrator', () => {
    let commonDataManager;
    let uiController;
    let renderer;
    let titleScreenAnimator;
    let soundController;

    beforeEach(() => {
        commonDataManager = createCommonDataManagerStub();
        uiController = createUIControllerStub();
        renderer = {
            initialize: vi.fn(),
            setSector: vi.fn(),
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
        expect(uiController.setReplayProtectHandler).toHaveBeenCalled();
        expect(uiController.setReplayProtectRecordsProvider).toHaveBeenCalled();
        expect(soundController.initialize).toHaveBeenCalled();
        expect(uiController.showTitleScreen).toHaveBeenCalled();
        expect(titleScreenAnimator.start).toHaveBeenCalledTimes(1);
        expect(titleScreenAnimator.stop).toHaveBeenCalledTimes(1);
        expect(renderer.setRenderLoopActive).toHaveBeenCalledWith(false);
        expect(renderer.setRenderLoopActive).toHaveBeenCalledWith(true);
        expect(orchestrator.gameController).toBeInstanceOf(FakeGameController);
        expect(orchestrator.gameController.infrastructure.gameDataRepository).toBe(orchestrator.gameDataRepository);
        expect(orchestrator.gameController.start).toHaveBeenCalled();
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

        expect(uiController.showRecordScreen).toHaveBeenCalledWith(expect.objectContaining({
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
            achievements: expect.any(Array)
        }));
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
        orchestrator.systems.flightRecorder = {
            createReplayContext: vi.fn(() => ({ record: { id: 'flight_1' } }))
        };
        const context = uiController.setReplayStartHandler.mock.calls[0][0]('flight_1');

        expect(orchestrator.systems.flightRecorder.createReplayContext).toHaveBeenCalledWith('flight_1');
        expect(context.record.id).toBe('flight_1');
        expect(orchestrator.replayContext).toBe(context);
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
