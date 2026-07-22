import { TutorialManager } from '../../../../GameWorksOAK/src/lib/core/tutorialManager.js';

const DEFAULT_HIGHLIGHT = {
    shape: 'rect',
    padding: { x: 8, y: 6 },
    radius: 12
};
const CANVAS_CIRCLE_HIGHLIGHT = {
    shape: 'circle'
};
const EXIT_ARC_HIGHLIGHT = {
    shape: 'circle',
    padding: 72
};

const SCENARIO_DEFINITIONS = [
    {
        type: 'defaults',
        highlightDefaults: DEFAULT_HIGHLIGHT
    },
    {
        id: 'build-intro',
        trigger: 'buildScreen',
        requires: [],
        titleKey: 'tutorial.titles.buildIntro',
        pages: [
            {
                messageKey: 'tutorial.messages.buildIntro',
                highlight: [
                    { targetType: 'home-star', shape: 'ellipse', padding: { x: 10, y: 10 } },
                    { targetType: 'exit-arc', shape: 'ellipse', padding: { x: 72, y: 56 } }
                ]
            }
        ]
    },
    {
        id: 'build-assembly-tab',
        trigger: 'buildScreen',
        titleKey: 'tutorial.titles.assemblyTab',
        pages: [
            {
                messageKey: 'tutorial.messages.assemblyTab',
                highlight: [{ elementId: 'tab-button-assembly' }]
            }
        ]
    },
    {
        id: 'build-assembly-select',
        trigger: 'assemblyTabReady',
        titleKey: 'tutorial.titles.assemblyTab',
        pages: [
            {
                messageKey: 'tutorial.messages.assemblyParts',
                highlight: [{ elementId: 'assembly-inventory-list' }]
            },
            {
                messageKey: 'tutorial.messages.assemblyModules',
                highlight: [{ elementId: 'assembly-inventory-list' }]
            },
            {
                messageKey: 'tutorial.messages.assemblyButton',
                highlight: [{ elementId: 'build-btn' }]
            }
        ]
    },
    {
        id: 'build-flight-select',
        trigger: 'flightTabReady',
        titleKey: 'tutorial.titles.launchPrep',
        pages: [
            {
                messageKey: 'tutorial.messages.flightParts',
                highlight: [{ elementId: 'flight-inventory-list' }]
            },
            {
                messageKey: 'tutorial.messages.flightBooster',
                highlight: [{ elementId: 'flight-inventory-list' }]
            }
        ]
    },
    {
        id: 'aim',
        trigger: 'aimStart',
        titleKey: 'tutorial.titles.aim',
        pages: [
            {
                messageKey: 'tutorial.messages.aimPrediction',
                highlight: [{ targetType: 'aim-preview-rocket' }, { targetType: 'prediction-line' }]
            },
            {
                messageKey: 'tutorial.messages.aimSectorClear',
                highlight: [
                    { targetType: 'exit-arc', ...EXIT_ARC_HIGHLIGHT },
                    { targetType: 'hover-star', ...CANVAS_CIRCLE_HIGHLIGHT },
                    { targetType: 'home-star', ...CANVAS_CIRCLE_HIGHLIGHT }
                ]
            },
            {
                messageKey: 'tutorial.messages.aimStarItems',
                highlight: [
                    { targetType: 'hover-star', ...CANVAS_CIRCLE_HIGHLIGHT },
                    { targetType: 'home-star', ...CANVAS_CIRCLE_HIGHLIGHT },
                    { targetType: 'exit-arc', ...EXIT_ARC_HIGHLIGHT }
                ]
            },
            {
                messageKey: 'tutorial.messages.aimExitArc',
                highlight: [
                    { targetType: 'exit-arc', ...EXIT_ARC_HIGHLIGHT },
                    { targetType: 'hover-star', ...CANVAS_CIRCLE_HIGHLIGHT },
                    { targetType: 'home-star', ...CANVAS_CIRCLE_HIGHLIGHT }
                ]
            },
            {
                messageKey: 'tutorial.messages.aimDanger',
                highlight: [
                    { targetType: 'hover-star', ...CANVAS_CIRCLE_HIGHLIGHT },
                    { targetType: 'home-star', ...CANVAS_CIRCLE_HIGHLIGHT },
                    { targetType: 'exit-arc', ...EXIT_ARC_HIGHLIGHT }
                ]
            },
            {
                messageKey: 'tutorial.messages.aimReturnHome',
                highlight: [
                    { targetType: 'home-star', ...CANVAS_CIRCLE_HIGHLIGHT },
                    { targetType: 'exit-arc', ...EXIT_ARC_HIGHLIGHT },
                    { targetType: 'hover-star', ...CANVAS_CIRCLE_HIGHLIGHT }
                ]
            },
            {
                messageKey: 'tutorial.messages.aimLaunch',
                highlight: [{ elementId: 'launch-btn' }]
            }
        ]
    },
    {
        id: 'facility-trading-post',
        trigger: 'facilityTradingPost',
        requires: ['aim'],
        titleKey: 'tutorial.titles.tradingPost',
        pages: [
            {
                messageKey: 'tutorial.messages.tradingPostIntro',
                highlight: [{ elementId: 'facility-header' }]
            },
            {
                messageKey: 'tutorial.messages.tradingPostBuy',
                highlight: [{ elementId: 'facility-section-buy' }]
            },
            {
                messageKey: 'tutorial.messages.tradingPostSell',
                highlight: [{ elementId: 'facility-section-sell' }]
            }
        ]
    },
    {
        id: 'facility-repair-dock',
        trigger: 'facilityRepairDock',
        requires: ['aim'],
        titleKey: 'tutorial.titles.repairDock',
        pages: [
            {
                messageKey: 'tutorial.messages.repairDockIntro',
                highlight: [{ elementId: 'facility-header' }]
            },
            {
                messageKey: 'tutorial.messages.repairDockRepair',
                highlight: [{ elementId: 'facility-section-repair' }]
            },
            {
                messageKey: 'tutorial.messages.repairDockDismantle',
                highlight: [{ elementId: 'facility-section-dismantle' }]
            },
            {
                messageKey: 'tutorial.messages.repairDockReceived',
                highlight: [{ elementId: 'facility-section-received' }]
            }
        ]
    },
    {
        id: 'facility-black-market',
        trigger: 'facilityBlackMarket',
        requires: ['aim'],
        titleKey: 'tutorial.titles.blackMarket',
        pages: [
            {
                messageKey: 'tutorial.messages.blackMarketIntro',
                highlight: [{ elementId: 'facility-header' }]
            },
            {
                messageKey: 'tutorial.messages.blackMarketBuy',
                highlight: [{ elementId: 'facility-section-black-market' }]
            },
            {
                messageKey: 'tutorial.messages.blackMarketAcquired',
                highlight: [{ elementId: 'facility-section-acquired' }]
            },
            {
                messageKey: 'tutorial.messages.blackMarketRisk',
                highlight: [{ elementId: 'facility-depart-button' }]
            }
        ]
    }
];

class TutorialFlowController {
    constructor(options = {}) {
        if (!options.gameDataRepository) {
            throw new Error('[TutorialFlowController] gameDataRepository is required.');
        }

        this.gameDataRepository = options.gameDataRepository;
        this.document = options.document || document;
        this.tutorialManagerClass = options.tutorialManagerClass || TutorialManager;
        this.canvasTargetResolver = options.canvasTargetResolver || null;
        this.canvasFocusBoundsResolver = options.canvasFocusBoundsResolver || null;
        this.cameraFocusController = options.cameraFocusController || null;
        this.uiScaleProvider = options.uiScaleProvider || (() => this.#readUiScale());
        this.manager = null;
        this.maskLoopFrame = null;
        this.lastTriggerName = null;
        this.lastTriggerContext = null;
        this.isResetting = false;
        this.triggersBlocked = false;
    }

    initialize() {
        const initialState = this.gameDataRepository.getSavedTutorialState({
            init: () => null
        });

        this.manager = new this.tutorialManagerClass(this.getScenarios(), {
            initialState,
            onSaveState: state => this.gameDataRepository.setSavedTutorialState(state),
            onCalculateRect: highlight => this.calculateHighlightRect(highlight),
            onActionResume: () => this.#handleActionResume(),
            nextButtonSelector: '#tutorial-next-btn',
            onBeforeScenario: () => this.#handleBeforeScenario(),
            onBeforeShowPage: context => this.#handleBeforeShowPage(context),
            onAfterShowPage: () => this.#startMaskLoop(),
            onBeforeHidePage: () => this.#handleBeforeHidePage(),
            onAfterScenario: () => this.#handleAfterScenario()
        });
    }

    getScenarios() {
        return SCENARIO_DEFINITIONS.map(scenario => this.#localizeScenario(scenario));
    }

    checkTrigger(triggerName, context = {}) {
        this.#requireManager();
        if (this.triggersBlocked) {
            return false;
        }
        this.#refreshScaledScenarios();
        const shown = this.manager.checkTrigger(triggerName, context);
        if (shown) {
            this.lastTriggerName = triggerName;
            this.lastTriggerContext = { ...context };
            this.#startMaskLoop();
        }
        return shown;
    }

    willTrigger(triggerName, context = {}) {
        this.#requireManager();
        if (this.triggersBlocked) {
            return false;
        }
        this.#refreshScaledScenarios();
        return this.manager.willTrigger(triggerName, context);
    }

    setTriggersBlocked(blocked) {
        this.triggersBlocked = Boolean(blocked);
    }

    checkCurrentSceneTrigger(context = {}) {
        this.#requireManager();
        if (this.triggersBlocked) {
            return false;
        }
        this.#refreshScaledScenarios();
        if (context.currentScene === 'build') {
            return this.checkTrigger('buildScreen', { source: context.source || 'sceneResume' });
        }
        return false;
    }

    setCanvasTargetResolver(resolver) {
        this.canvasTargetResolver = resolver;
    }

    setCanvasFocusBoundsResolver(resolver) {
        this.canvasFocusBoundsResolver = resolver;
        this.cameraFocusController?.setWorldBoundsResolver?.(resolver);
    }

    setMapInteractionController(mapInteractionController) {
        this.cameraFocusController?.setMapInteractionController?.(mapInteractionController);
    }

    async reset(context = {}) {
        this.#requireManager();
        this.#stopMaskLoop();
        this.isResetting = true;
        try {
            if (this.manager.resetTutorialAsync) {
                await this.manager.resetTutorialAsync();
            } else {
                this.manager.resetTutorial();
            }
        } finally {
            this.isResetting = false;
        }
        await this.#handleAfterScenario();
        return this.checkCurrentSceneTrigger({
            currentScene: context.currentScene,
            source: 'tutorialReset'
        });
    }

    calculateHighlightRect(highlight = {}) {
        if (highlight.elementId) {
            return this.#calculateElementRect(highlight.elementId);
        }
        if (highlight.targetType) {
            return this.#calculateCanvasTargetRect(highlight);
        }
        throw new Error('[TutorialFlowController] highlight must define elementId or targetType.');
    }

    #calculateElementRect(elementId) {
        const element = this.document.getElementById(elementId);
        if (!element) {
            throw new Error(`[TutorialFlowController] Highlight target not found: ${elementId}`);
        }
        const rect = element.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };
    }

    #calculateCanvasTargetRect(highlight) {
        if (!this.canvasTargetResolver) {
            throw new Error(`[TutorialFlowController] Canvas highlight resolver is required: ${highlight.targetType}`);
        }
        const rect = this.canvasTargetResolver(highlight);
        if (!rect) {
            throw new Error(`[TutorialFlowController] Canvas highlight target not found: ${highlight.targetType}`);
        }
        return rect;
    }

    #localizeScenario(scenario) {
        if (scenario.type === 'defaults') {
            return this.#scaleHighlightVisuals({ ...scenario });
        }
        const { titleKey, pages = [], ...rest } = scenario;
        return this.#scaleHighlightVisuals({
            ...rest,
            title: this.#text(titleKey),
            pages: pages.map(page => this.#localizePage(page))
        });
    }

    #localizePage(page) {
        const { messageKey, ...rest } = page;
        return {
            ...rest,
            message: this.#text(messageKey)
        };
    }

    #scaleHighlightVisuals(scenario) {
        const scale = this.#getUiScale();
        return {
            ...scenario,
            highlightDefaults: this.#scaleHighlightDefaults(scenario.highlightDefaults, scale),
            pages: Array.isArray(scenario.pages)
                ? scenario.pages.map(page => ({
                    ...page,
                    highlightDefaults: this.#scaleHighlightDefaults(page.highlightDefaults, scale),
                    highlight: Array.isArray(page.highlight)
                        ? page.highlight.map(highlight => this.#scaleHighlight(highlight, scale))
                        : page.highlight
                }))
                : scenario.pages
        };
    }

    #scaleHighlightDefaults(defaults, scale) {
        if (!defaults || typeof defaults !== 'object') {
            return defaults;
        }
        return this.#scaleHighlight(defaults, scale);
    }

    #scaleHighlight(highlight, scale) {
        if (!highlight || typeof highlight !== 'object') {
            return highlight;
        }
        return {
            ...highlight,
            padding: this.#scalePadding(highlight.padding, scale),
            radius: this.#scaleNumber(highlight.radius, scale)
        };
    }

    #scalePadding(padding, scale) {
        if (padding === undefined) {
            return padding;
        }
        if (typeof padding === 'number') {
            return this.#scaleNumber(padding, scale);
        }
        if (padding && typeof padding === 'object') {
            return {
                ...padding,
                x: this.#scaleNumber(padding.x, scale),
                y: this.#scaleNumber(padding.y, scale)
            };
        }
        return padding;
    }

    #scaleNumber(value, scale) {
        return typeof value === 'number' ? value * scale : value;
    }

    #getUiScale() {
        const scale = Number(this.uiScaleProvider());
        return Number.isFinite(scale) && scale > 0 ? scale : 1;
    }

    #refreshScaledScenarios() {
        if (!this.manager || this.manager.isShowing) {
            return;
        }
        this.manager.scenarios = this.getScenarios();
        if (typeof this.manager.buildDisplayScenarioRawIndexes === 'function') {
            this.manager.displayScenarioRawIndexes = this.manager.buildDisplayScenarioRawIndexes();
        }
    }

    #readUiScale() {
        if (typeof window === 'undefined' || !this.document?.documentElement) {
            return 1;
        }
        const value = window.getComputedStyle(this.document.documentElement)
            .getPropertyValue('--ui-scale')
            .trim();
        return Number(value || 1);
    }

    #text(path) {
        return this.gameDataRepository.getUiText(path);
    }

    #handleBeforeScenario() {
        this.cameraFocusController?.beginScenario?.();
    }

    async #handleBeforeShowPage(context) {
        if (!this.cameraFocusController) {
            return;
        }

        if (this.canvasFocusBoundsResolver) {
            this.cameraFocusController.setWorldBoundsResolver?.(this.canvasFocusBoundsResolver);
        }
        await Promise.resolve(this.cameraFocusController.focusPage(context));
    }

    #handleBeforeHidePage() {
        this.#stopMaskLoop();
    }

    async #handleAfterScenario() {
        this.#stopMaskLoop();
        const endScenario = this.cameraFocusController?.endScenario
            || this.cameraFocusController?.restore;
        await Promise.resolve(endScenario?.call(this.cameraFocusController));
    }

    #handleActionResume() {
        if (this.isResetting || this.triggersBlocked || !this.lastTriggerName) {
            return;
        }

        const shown = this.manager.checkTrigger(this.lastTriggerName, this.lastTriggerContext || {});
        if (shown) {
            this.#startMaskLoop();
        }
    }

    #startMaskLoop() {
        this.#stopMaskLoop();
        const tick = () => {
            this.manager.updateMask();
            if (this.manager.isShowing) {
                this.maskLoopFrame = window.requestAnimationFrame(tick);
            }
        };
        tick();
    }

    #stopMaskLoop() {
        if (this.maskLoopFrame !== null) {
            window.cancelAnimationFrame(this.maskLoopFrame);
            this.maskLoopFrame = null;
        }
    }

    #requireManager() {
        if (!this.manager) {
            throw new Error('[TutorialFlowController] initialize() must be called first.');
        }
    }
}

export default TutorialFlowController;
