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
    });

    it('boots shared app systems and wires title start to a game controller', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            titleScreenAnimator,
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
});
