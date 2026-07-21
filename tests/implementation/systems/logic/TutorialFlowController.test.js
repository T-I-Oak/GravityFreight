import { describe, it, expect, vi, beforeEach } from 'vitest';
import TutorialFlowController from '../../../../src/systems/logic/TutorialFlowController.js';
import TutorialCameraFocusController from '../../../../src/systems/logic/TutorialCameraFocusController.js';

class FakeTutorialManager {
    static instances = [];

    constructor(scenarios, options) {
        this.scenarios = scenarios;
        this.options = options;
        this.checkTrigger = vi.fn(() => true);
        this.willTrigger = vi.fn(() => false);
        this.advanceScenario = vi.fn();
        this.updateMask = vi.fn();
        this.resetTutorial = vi.fn(() => options.onSaveState({ resetByCommon: true }));
        this.resetTutorialAsync = vi.fn(async () => options.onSaveState({ resetByCommon: true }));
        this.isShowing = false;
        FakeTutorialManager.instances.push(this);
    }
}

describe('TutorialFlowController', () => {
    let repository;
    let documentRef;

    beforeEach(() => {
        FakeTutorialManager.instances = [];
        document.body.innerHTML = `
            <aside id="inventory-panel"></aside>
            <div id="assembly-inventory-list"></div>
            <div id="flight-inventory-list"></div>
            <button id="tab-button-assembly"></button>
            <button id="tutorial-next-btn"></button>
        `;
        document.querySelector('#tab-button-assembly').getBoundingClientRect = () => ({
            left: 10,
            top: 20,
            width: 120,
            height: 30,
            right: 130,
            bottom: 50
        });
        documentRef = document;
        repository = {
            getSavedTutorialState: vi.fn(migrationMap => migrationMap.init()),
            setSavedTutorialState: vi.fn(),
            getUiText: vi.fn(path => `text:${path}`)
        };
    });

    function createCameraFocusController() {
        return {
            setWorldBoundsResolver: vi.fn(),
            setMapInteractionController: vi.fn(),
            beginScenario: vi.fn(),
            focusPage: vi.fn(),
            endScenario: vi.fn()
        };
    }

    async function flushAsyncTutorialWork() {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    it('loads opaque tutorial state and passes callbacks to the common manager', () => {
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef
        });

        controller.initialize();
        const manager = FakeTutorialManager.instances[0];

        expect(repository.getSavedTutorialState).toHaveBeenCalledWith({ init: expect.any(Function) });
        expect(manager.scenarios[0]).toMatchObject({ type: 'defaults' });
        expect(manager.scenarios[1]).toMatchObject({
            title: 'text:tutorial.titles.buildIntro',
            pages: [expect.objectContaining({ message: 'text:tutorial.messages.buildIntro' })]
        });
        expect(manager.scenarios.find(scenario => scenario.id === 'build-assembly-tab')).toMatchObject({
            trigger: 'buildScreen',
            title: 'text:tutorial.titles.assemblyTab',
            pages: [expect.objectContaining({ message: 'text:tutorial.messages.assemblyTab' })]
        });
        expect(manager.scenarios.find(scenario => scenario.id === 'build-assembly-select')).toMatchObject({
            trigger: 'assemblyTabReady',
            title: 'text:tutorial.titles.assemblyTab'
        });
        expect(manager.scenarios.find(scenario => scenario.id === 'build-assembly-select').pages[0]).toMatchObject({
            message: 'text:tutorial.messages.assemblyParts',
            highlight: [{ elementId: 'assembly-inventory-list' }]
        });
        expect(manager.scenarios.find(scenario => scenario.id === 'build-assembly-select').pages[1]).toMatchObject({
            message: 'text:tutorial.messages.assemblyModules',
            highlight: [{ elementId: 'assembly-inventory-list' }]
        });
        expect(manager.scenarios.find(scenario => scenario.id === 'build-assembly-select').pages[2]).toMatchObject({
            message: 'text:tutorial.messages.assemblyButton',
            highlight: [{ elementId: 'build-btn' }]
        });
        expect(manager.scenarios.find(scenario => scenario.id === 'build-flight-select')).toMatchObject({
            trigger: 'flightTabReady',
            title: 'text:tutorial.titles.launchPrep'
        });
        expect(manager.scenarios.find(scenario => scenario.id === 'build-flight-select').pages[0]).toMatchObject({
            message: 'text:tutorial.messages.flightParts',
            highlight: [{ elementId: 'flight-inventory-list' }]
        });
        expect(manager.scenarios.find(scenario => scenario.id === 'build-flight-select').pages[1]).toMatchObject({
            message: 'text:tutorial.messages.flightBooster',
            highlight: [{ elementId: 'flight-inventory-list' }]
        });
        const aimScenario = manager.scenarios.find(scenario => scenario.id === 'aim');
        expect(aimScenario).toMatchObject({
            trigger: 'aimStart',
            title: 'text:tutorial.titles.aim'
        });
        expect(aimScenario.pages).toHaveLength(7);
        expect(aimScenario.pages[0]).toMatchObject({
            message: 'text:tutorial.messages.aimPrediction',
            highlight: [{ targetType: 'aim-preview-rocket' }, { targetType: 'prediction-line' }]
        });
        expect(aimScenario.pages[1]).toMatchObject({
            message: 'text:tutorial.messages.aimSectorClear',
            highlight: [
                { targetType: 'exit-arc', shape: 'circle', padding: 72 },
                { targetType: 'hover-star', shape: 'circle' },
                { targetType: 'home-star', shape: 'circle' }
            ]
        });
        expect(aimScenario.pages.slice(1, 6).flatMap(page => page.highlight).every(highlight => highlight.shape === 'circle')).toBe(true);
        expect(aimScenario.pages.slice(1, 6).every(page => page.highlight.find(highlight => highlight.targetType === 'exit-arc').padding === 72)).toBe(true);
        expect(aimScenario.pages[6]).toMatchObject({
            message: 'text:tutorial.messages.aimLaunch',
            highlight: [{ elementId: 'launch-btn' }]
        });
        const tradingPostScenario = manager.scenarios.find(scenario => scenario.id === 'facility-trading-post');
        expect(tradingPostScenario).toMatchObject({
            trigger: 'facilityTradingPost',
            title: 'text:tutorial.titles.tradingPost'
        });
        expect(tradingPostScenario.pages[0]).toMatchObject({
            message: 'text:tutorial.messages.tradingPostIntro',
            highlight: [{ elementId: 'facility-header' }]
        });
        expect(tradingPostScenario.pages[1]).toMatchObject({
            message: 'text:tutorial.messages.tradingPostBuy',
            highlight: [{ elementId: 'facility-section-buy' }]
        });
        expect(tradingPostScenario.pages[2]).toMatchObject({
            message: 'text:tutorial.messages.tradingPostSell',
            highlight: [{ elementId: 'facility-section-sell' }]
        });
        const repairDockScenario = manager.scenarios.find(scenario => scenario.id === 'facility-repair-dock');
        expect(repairDockScenario).toMatchObject({
            trigger: 'facilityRepairDock',
            title: 'text:tutorial.titles.repairDock'
        });
        expect(repairDockScenario.pages[0]).toMatchObject({
            message: 'text:tutorial.messages.repairDockIntro',
            highlight: [{ elementId: 'facility-header' }]
        });
        expect(repairDockScenario.pages[1]).toMatchObject({
            message: 'text:tutorial.messages.repairDockRepair',
            highlight: [{ elementId: 'facility-section-repair' }]
        });
        expect(repairDockScenario.pages[2]).toMatchObject({
            message: 'text:tutorial.messages.repairDockDismantle',
            highlight: [{ elementId: 'facility-section-dismantle' }]
        });
        expect(repairDockScenario.pages[3]).toMatchObject({
            message: 'text:tutorial.messages.repairDockReceived',
            highlight: [{ elementId: 'facility-section-received' }]
        });
        const blackMarketScenario = manager.scenarios.find(scenario => scenario.id === 'facility-black-market');
        expect(blackMarketScenario).toMatchObject({
            trigger: 'facilityBlackMarket',
            title: 'text:tutorial.titles.blackMarket'
        });
        expect(blackMarketScenario.pages[0]).toMatchObject({
            message: 'text:tutorial.messages.blackMarketIntro',
            highlight: [{ elementId: 'facility-header' }]
        });
        expect(blackMarketScenario.pages[1]).toMatchObject({
            message: 'text:tutorial.messages.blackMarketBuy',
            highlight: [{ elementId: 'facility-section-black-market' }]
        });
        expect(blackMarketScenario.pages[2]).toMatchObject({
            message: 'text:tutorial.messages.blackMarketAcquired',
            highlight: [{ elementId: 'facility-section-acquired' }]
        });
        expect(blackMarketScenario.pages[3]).toMatchObject({
            message: 'text:tutorial.messages.blackMarketRisk',
            highlight: [{ elementId: 'facility-depart-button' }]
        });
        expect(manager.options.initialState).toBeNull();
        expect(manager.options.nextButtonSelector).toBe('#tutorial-next-btn');
        expect(manager.options.onCalculateRect({ elementId: 'tab-button-assembly' })).toEqual({
            left: 10,
            top: 20,
            width: 120,
            height: 30
        });
    });

    it('saves the opaque state without inspecting it', () => {
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef
        });
        const opaqueState = { extra: { ownedByCommon: true } };

        controller.initialize();
        FakeTutorialManager.instances[0].options.onSaveState(opaqueState);

        expect(repository.setSavedTutorialState).toHaveBeenCalledWith(opaqueState);
    });

    it('delegates trigger checks to the common manager', () => {
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef
        });

        controller.initialize();
        expect(controller.checkTrigger('buildScreen', { phase: 'build' })).toBe(true);

        expect(FakeTutorialManager.instances[0].checkTrigger).toHaveBeenCalledWith(
            'buildScreen',
            { phase: 'build' }
        );
    });

    it('rechecks the last trigger after a scenario completes so build-screen guidance can continue', () => {
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef
        });

        controller.initialize();
        const manager = FakeTutorialManager.instances[0];
        manager.checkTrigger
            .mockReturnValueOnce(true)
            .mockReturnValueOnce(true);

        expect(controller.checkTrigger('buildScreen', { currentScene: 'build' })).toBe(true);
        manager.options.onActionResume();

        expect(manager.checkTrigger).toHaveBeenNthCalledWith(1, 'buildScreen', { currentScene: 'build' });
        expect(manager.checkTrigger).toHaveBeenNthCalledWith(2, 'buildScreen', { currentScene: 'build' });
    });

    it('resets tutorial progress and immediately restarts build tutorial only during build', async () => {
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef
        });

        controller.initialize();
        await controller.reset({ currentScene: 'facility' });
        await controller.reset({ currentScene: 'build' });

        const manager = FakeTutorialManager.instances[0];
        expect(manager.resetTutorialAsync).toHaveBeenCalledTimes(2);
        expect(manager.checkTrigger).toHaveBeenCalledTimes(1);
        expect(manager.checkTrigger).toHaveBeenCalledWith('buildScreen', { source: 'tutorialReset' });
    });

    it('does not show tutorial triggers while triggers are blocked', async () => {
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef
        });

        controller.initialize();
        const manager = FakeTutorialManager.instances[0];
        controller.setTriggersBlocked(true);

        expect(controller.checkTrigger('buildScreen', { currentScene: 'build' })).toBe(false);
        expect(controller.willTrigger('buildScreen', { currentScene: 'build' })).toBe(false);
        await controller.reset({ currentScene: 'build' });
        manager.options.onActionResume();

        expect(manager.checkTrigger).not.toHaveBeenCalled();
        expect(manager.willTrigger).not.toHaveBeenCalled();
        expect(manager.resetTutorialAsync).toHaveBeenCalledTimes(1);
    });

    it('checks the build trigger when a blocked settings modal closes', () => {
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef
        });

        controller.initialize();
        const manager = FakeTutorialManager.instances[0];
        controller.setTriggersBlocked(true);
        expect(controller.checkCurrentSceneTrigger({ currentScene: 'build', source: 'settingsClose' })).toBe(false);

        controller.setTriggersBlocked(false);
        expect(controller.checkCurrentSceneTrigger({ currentScene: 'build', source: 'settingsClose' })).toBe(true);

        expect(manager.checkTrigger).toHaveBeenCalledTimes(1);
        expect(manager.checkTrigger).toHaveBeenCalledWith('buildScreen', { source: 'settingsClose' });
    });

    it('does not start a facility tutorial when settings closes on a facility screen', () => {
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef
        });

        controller.initialize();
        const manager = FakeTutorialManager.instances[0];

        expect(controller.checkCurrentSceneTrigger({ currentScene: 'facility', source: 'settingsClose' })).toBe(false);

        expect(manager.checkTrigger).not.toHaveBeenCalled();
    });

    it('throws when a required DOM highlight target is missing', () => {
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef
        });

        controller.initialize();

        expect(() => FakeTutorialManager.instances[0].options.onCalculateRect({ elementId: 'missing' }))
            .toThrow('[TutorialFlowController] Highlight target not found: missing');
    });

    it('allows the canvas target resolver to be connected after construction', () => {
        const resolver = vi.fn(() => ({ left: 1, top: 2, width: 3, height: 4 }));
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef
        });

        controller.initialize();
        controller.setCanvasTargetResolver(resolver);

        expect(FakeTutorialManager.instances[0].options.onCalculateRect({ targetType: 'exit-arc' })).toEqual({
            left: 1,
            top: 2,
            width: 3,
            height: 4
        });
        expect(resolver).toHaveBeenCalledWith({ targetType: 'exit-arc' });
    });

    it('throws when a canvas target cannot be resolved', () => {
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef,
            canvasTargetResolver: () => null
        });

        controller.initialize();

        expect(() => FakeTutorialManager.instances[0].options.onCalculateRect({ targetType: 'exit-arc' }))
            .toThrow('[TutorialFlowController] Canvas highlight target not found: exit-arc');
    });

    it('delegates page lifecycle to the common tutorial manager hooks', async () => {
        const cameraFocusController = createCameraFocusController();
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef,
            cameraFocusController
        });

        controller.initialize();
        const manager = FakeTutorialManager.instances[0];

        expect(manager.options.onBeforeScenario).toEqual(expect.any(Function));
        expect(manager.options.onBeforeShowPage).toEqual(expect.any(Function));
        expect(manager.options.onAfterShowPage).toEqual(expect.any(Function));
        expect(manager.options.onBeforeHidePage).toEqual(expect.any(Function));
        expect(manager.options.onAfterScenario).toEqual(expect.any(Function));
        await manager.options.onBeforeScenario();
        await manager.options.onBeforeShowPage({ highlights: [{ targetType: 'home-star' }] });
        await manager.options.onBeforeHidePage();
        await manager.options.onAfterScenario();

        expect(cameraFocusController.beginScenario).toHaveBeenCalledTimes(1);
        expect(cameraFocusController.focusPage).toHaveBeenCalledWith({
            highlights: [{ targetType: 'home-star' }]
        });
        expect(cameraFocusController.endScenario).toHaveBeenCalledTimes(1);
        expect(manager.advanceScenario).not.toHaveBeenCalled();
    });

    it('passes canvas focus bounds resolver and map interaction controller to camera focus controller', () => {
        const cameraFocusController = createCameraFocusController();
        const focusResolver = vi.fn();
        const mapInteractionController = { setInputLocked: vi.fn() };
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            tutorialManagerClass: FakeTutorialManager,
            document: documentRef,
            cameraFocusController
        });

        controller.initialize();
        controller.setCanvasFocusBoundsResolver(focusResolver);
        controller.setMapInteractionController(mapInteractionController);

        expect(cameraFocusController.setWorldBoundsResolver).toHaveBeenCalledWith(focusResolver);
        expect(cameraFocusController.setMapInteractionController).toHaveBeenCalledWith(mapInteractionController);
    });

    it('does not relock map input when the first-run build tutorial resumes into DOM-only guidance', async () => {
        document.body.innerHTML = `
            <canvas id="tutorial-mask-canvas" class="TutorialMask hidden"></canvas>
            <section id="tutorial-tooltip" class="Panel TutorialTooltip hidden">
                <h2 id="tutorial-title"></h2>
                <p id="tutorial-message"></p>
                <span class="tooltip-arrow"></span>
                <button id="tutorial-next-btn"></button>
            </section>
            <button id="tab-button-assembly"></button>
        `;
        document.getElementById('tab-button-assembly').getBoundingClientRect = () => ({
            left: 10,
            top: 20,
            width: 120,
            height: 30,
            right: 130,
            bottom: 50
        });
        document.getElementById('tutorial-mask-canvas').getContext = () => ({
            beginPath: vi.fn(),
            arc: vi.fn(),
            clearRect: vi.fn(),
            closePath: vi.fn(),
            createRadialGradient: () => ({ addColorStop: vi.fn() }),
            ellipse: vi.fn(),
            fill: vi.fn(),
            fillRect: vi.fn(),
            lineTo: vi.fn(),
            moveTo: vi.fn(),
            quadraticCurveTo: vi.fn(),
            restore: vi.fn(),
            save: vi.fn(),
            scale: vi.fn(),
            stroke: vi.fn(),
            translate: vi.fn()
        });
        const cameraController = {
            getState: vi.fn(() => ({
                position: { x: 0, y: 0 },
                rotation: 0,
                zoomLevel: 1
            })),
            calculateFocusState: vi.fn(() => ({
                position: { x: 12, y: 16 },
                rotation: 0,
                zoomLevel: 1.5
            })),
            applyState: vi.fn()
        };
        const mapInteractionController = { setInputLocked: vi.fn() };
        const cameraFocusController = new TutorialCameraFocusController({
            cameraController,
            mapInteractionController,
            worldRenderer: { render: vi.fn() },
            transitionDurationMs: 0
        });
        const controller = new TutorialFlowController({
            gameDataRepository: repository,
            document: documentRef,
            cameraFocusController
        });
        controller.initialize();
        controller.setCanvasTargetResolver(() => ({ left: 0, top: 0, width: 80, height: 80 }));
        controller.setCanvasFocusBoundsResolver(() => ({ left: -40, top: -40, width: 80, height: 80 }));
        expect(controller.checkTrigger('buildScreen', { currentScene: 'build' })).toBe(true);
        await flushAsyncTutorialWork();
        await controller.manager.advanceScenarioAsync();
        await flushAsyncTutorialWork();
        expect(controller.manager.getCurrentStep().id).toBe('build-assembly-tab');
        expect(mapInteractionController.setInputLocked.mock.calls.map(([locked]) => locked)).toEqual([true, false]);
    });
});
