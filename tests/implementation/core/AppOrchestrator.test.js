import { describe, it, expect, vi, beforeEach } from 'vitest';
import AppOrchestrator from '../../../src/core/AppOrchestrator.js';

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
    return {
        showTitleScreen: vi.fn(),
        setStartHandler: vi.fn(),
        setRecordHandler: vi.fn(),
        setManualHandler: vi.fn(),
        initHUD: vi.fn(),
        showBuildScreen: vi.fn(),
        getMapCanvas: vi.fn(() => canvas)
    };
}

describe('AppOrchestrator', () => {
    let commonDataManager;
    let uiController;
    let renderer;

    beforeEach(() => {
        commonDataManager = createCommonDataManagerStub();
        uiController = createUIControllerStub();
        renderer = {
            initialize: vi.fn(),
            setSector: vi.fn()
        };
    });

    it('boots shared app systems and wires title start to a game controller', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });

        await orchestrator.boot();
        await uiController.setStartHandler.mock.calls[0][0]();

        expect(renderer.initialize).toHaveBeenCalledWith(uiController.getMapCanvas());
        expect(uiController.showTitleScreen).toHaveBeenCalled();
        expect(orchestrator.gameController).toBeInstanceOf(FakeGameController);
        expect(orchestrator.gameController.infrastructure.gameDataRepository).toBe(orchestrator.gameDataRepository);
        expect(orchestrator.gameController.start).toHaveBeenCalled();
    });

    it('returns to the title screen and drops the current game lifecycle controller', async () => {
        const orchestrator = new AppOrchestrator({
            commonDataManager,
            uiController,
            worldRenderer: renderer,
            gameControllerClass: FakeGameController,
            i18nAdapter: { expandLanguageResource: value => value }
        });

        await orchestrator.boot();
        await orchestrator.startGame();
        orchestrator.returnToTitle();

        expect(orchestrator.gameController).toBeNull();
        expect(uiController.showTitleScreen).toHaveBeenCalledTimes(2);
    });
});
