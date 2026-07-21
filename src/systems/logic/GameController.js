import SectorProgressionController from './SectorProgressionController.js';
import SectorTransitionAnimator from './SectorTransitionAnimator.js';
import BuildScreenPresenter from './BuildScreenPresenter.js';
import BuildFlowController from './BuildFlowController.js';
import NavigationLoopController from './NavigationLoopController.js';
import FacilityFlowController from './FacilityFlowController.js';
import MapInteractionController from './MapInteractionController.js';
import TutorialCanvasTargetResolver from './TutorialCanvasTargetResolver.js';
import ShareMapViewDataFactory from './ShareMapViewDataFactory.js';
import LaunchSelectionFactory from './LaunchSelectionFactory.js';
import FlightResultViewDataFactory from './FlightResultViewDataFactory.js';

class GameController {
    constructor(infrastructure = {}) {
        this.gameDataRepository = infrastructure.gameDataRepository;
        this.sessionState = infrastructure.sessionState;
        this.economySystem = infrastructure.economySystem;
        this.gameRecordTracker = infrastructure.gameRecordTracker;
        this.achievementTracker = infrastructure.achievementTracker;
        this.flightRecorder = infrastructure.flightRecorder;
        this.storySystem = infrastructure.storySystem;
        this.trajectoryPredictor = infrastructure.trajectoryPredictor;
        this.navigationLoopController = infrastructure.navigationLoopController
            || new NavigationLoopController({
                physicsEngine: infrastructure.physicsEngine,
                gameDataRepository: infrastructure.gameDataRepository,
                uiController: infrastructure.uiController,
                worldRenderer: infrastructure.worldRenderer,
                requestFrame: infrastructure.requestFrame,
                cancelFrame: infrastructure.cancelFrame
            });
        this.uiController = infrastructure.uiController;
        this.worldRenderer = infrastructure.worldRenderer;
        this.cameraController = infrastructure.cameraController;
        this.appOrchestrator = infrastructure.appOrchestrator;
        this.tutorialFlowController = infrastructure.tutorialFlowController;
        this.currentSector = null;
        this.currentRocket = null;
        this.isFirstSectorTransition = true;
        this.lastReplayRecord = null;
        this.buildScreenPresenter = infrastructure.buildScreenPresenter
            || new BuildScreenPresenter(this.gameDataRepository);
        this.buildFlowController = infrastructure.buildFlowController
            || new BuildFlowController({
                sessionState: this.sessionState,
                uiController: this.uiController,
                buildScreenPresenter: this.buildScreenPresenter
            });
        this.facilityFlowController = infrastructure.facilityFlowController
            || new FacilityFlowController({
                gameDataRepository: this.gameDataRepository,
                sessionState: this.sessionState,
                economySystem: this.economySystem,
                gameRecordTracker: this.gameRecordTracker,
                achievementTracker: this.achievementTracker,
                uiController: this.uiController,
                buildFlowController: this.buildFlowController,
                getCurrentSector: () => this.currentSector,
                getCurrentRocket: () => this.currentRocket,
                setCurrentRocket: rocket => {
                    this.currentRocket = rocket;
                }
            });
        this.mapInteractionController = infrastructure.mapInteractionController
            || new MapInteractionController({
                gameDataRepository: this.gameDataRepository,
                sessionState: this.sessionState,
                buildFlowController: this.buildFlowController,
                trajectoryPredictor: this.trajectoryPredictor,
                uiController: this.uiController,
                worldRenderer: this.worldRenderer,
                cameraController: this.cameraController,
                getCurrentSector: () => this.currentSector,
                getLaunchPosition: angle => this.launchSelectionFactory.getLaunchPosition(angle)
            });
        this.launchSelectionFactory = infrastructure.launchSelectionFactory
            || new LaunchSelectionFactory({
                sessionState: this.sessionState,
                buildFlowController: this.buildFlowController,
                gameDataRepository: this.gameDataRepository,
                getCurrentSector: () => this.currentSector,
                getLaunchAngle: () => this.mapInteractionController.currentLaunchAngle
            });
        this.tutorialCanvasTargetResolver = infrastructure.tutorialCanvasTargetResolver
            || new TutorialCanvasTargetResolver({
                sessionState: this.sessionState,
                buildFlowController: this.buildFlowController,
                trajectoryPredictor: this.trajectoryPredictor,
                uiController: this.uiController,
                cameraController: this.cameraController,
                mapInteractionController: this.mapInteractionController,
                getCurrentSector: () => this.currentSector,
                getLaunchPosition: angle => this.launchSelectionFactory.getLaunchPosition(angle)
            });
        this.tutorialFlowController?.setCanvasTargetResolver?.(
            highlight => this.tutorialCanvasTargetResolver.calculateTargetRect(highlight)
        );
        this.tutorialFlowController?.setCanvasFocusBoundsResolver?.(
            highlight => this.tutorialCanvasTargetResolver.calculateFocusBounds(highlight)
        );
        this.tutorialFlowController?.setMapInteractionController?.(this.mapInteractionController);
        this.sectorProgressionController = infrastructure.sectorProgressionController
            || new SectorProgressionController(infrastructure);
        this.sectorTransitionAnimator = infrastructure.sectorTransitionAnimator
            || new SectorTransitionAnimator({
                worldRenderer: this.worldRenderer,
                wait: infrastructure.wait,
                durations: infrastructure.sectorTransitionDurations
            });
        this.shareMapViewDataFactory = infrastructure.shareMapViewDataFactory
            || new ShareMapViewDataFactory({ gameDataRepository: this.gameDataRepository });
        this.flightResultViewDataFactory = infrastructure.flightResultViewDataFactory
            || new FlightResultViewDataFactory({
                gameDataRepository: this.gameDataRepository,
                sessionState: this.sessionState,
                flightRecorder: this.flightRecorder,
                storySystem: this.storySystem
            });
    }

    async start() {
        this.sessionState.initialize();
        this.currentSector = null;
        this.isFirstSectorTransition = true;
        this.worldRenderer?.clearSector?.();
        this.storySystem.resetSession?.();
        this.uiController.initHUD(this.sessionState);
        this.uiController.setResultHandler?.(() => this.confirmSettlement(this.lastSettlement));
        this.uiController.setMapToggleHandler?.(showMap => this.handleResultMapToggle(showMap));
        this.uiController.setMailHandler?.(index => this.handleMailClick(index));
        this.uiController.setResultStoryHandler?.(storyId => this.handleStoryOpen(storyId));
        this.uiController.setGameEndReturnHandler?.(() => this.returnToTitle());
        this.uiController.setBuildItemSelectionHandler?.(selection => {
            const viewData = this.buildFlowController.handleItemSelection(selection);
            this.mapInteractionController.refreshPredictionPath();
            this.#checkAimTutorial();
            return viewData;
        });
        this.uiController.setBuildAssembleHandler?.(
            () => this.buildFlowController.assembleRocket()
        );
        this.uiController.setLaunchHandler?.(() => this.launchSelectedRocket());
        this.uiController.setBuildTabChangeHandler?.(tabId => this.#handleBuildTabChange(tabId));
        this.uiController.setCanvasInputHandler?.(event => this.handleCanvasInput(event));

        return this.beginSectorTransition();
    }

    handleMailClick(index) {
        const story = this.storySystem.getStoryStatus()[index];
        if (!story) {
            return null;
        }

        return this.handleStoryOpen(story.id);
    }

    handleStoryOpen(storyId) {
        const storyStatus = this.storySystem.getStoryStatus();
        const index = storyStatus.findIndex(story => story.id === storyId);
        const story = storyStatus[index];
        if (!story) {
            return null;
        }

        this.uiController.showStoryModal?.(storyId);
        if (story.isUnread) {
            this.storySystem.updateReadStatus(storyId);
            const achievements = this.achievementTracker.evaluateAchievements({
                source: 'story_read',
                keys: ['total', story.type]
            });
            this.uiController.showAchievementToasts?.(achievements);
        }

        const updatedStory = this.storySystem.getStoryStatus()[index] ?? { ...story, isUnread: false };
        this.uiController.updateMailStatus?.(index, updatedStory.type, updatedStory.isUnread);
        return updatedStory;
    }

    handleCanvasInput(event) {
        this.mapInteractionController.handleInput(event);
    }

    launchSelectedRocket() {
        const rocket = this.launchSelectionFactory.createRocketFromSelection();
        return this.launchRocket(rocket);
    }

    launchRocket(rocket) {
        if (!rocket || !this.currentSector) {
            throw new Error('[GameController] rocket and currentSector are required.');
        }

        rocket.velocity = rocket.getInitialVelocity(this.sessionState.returnBonus);
        this.currentRocket = rocket;
        this.worldRenderer?.clearPredictionPath?.();
        this.worldRenderer?.clearAimRocket?.();
        this.flightRecorder.captureLaunchSnapshot(rocket, this.currentSector);
        this.uiController.setFlightMode(true);
        this.worldRenderer?.startNavigation?.(rocket);
        this.worldRenderer?.enableSonar?.();
        this.navigationLoopController.start({
            rocket,
            sector: this.currentSector,
            onNavigationEnd: result => this.handleNavigationEnd(result)
        });
        return rocket;
    }

    async handleNavigationEnd(result) {
        if (!this.currentRocket || !this.currentSector) {
            throw new Error('[GameController] currentRocket and currentSector are required.');
        }

        this.navigationLoopController.stop();
        const flightData = this.currentRocket.getFlightResult();
        const settlement = this.economySystem.calculateSettlement(result, flightData, this.sessionState);
        this.lastSettlement = settlement;
        this.sessionState.applySettlement(settlement);

        let unlockedStoryId = null;
        if (settlement.unlockedBranchId) {
            unlockedStoryId = this.storySystem.unlockNextStep(settlement.unlockedBranchId);
            this.#updateMailHud(unlockedStoryId);
        }

        const resultContext = this.flightResultViewDataFactory.createContext(settlement);
        const replayRecord = this.flightRecorder.recordFlightResult(resultContext);
        this.lastReplayRecord = replayRecord;
        let updatedRecordKeys = this.gameRecordTracker.recordFlightResult({
            completedSectors: settlement.status === 'cleared' ? 1 : 0,
            distance: flightData.ticks ?? 0,
            score: settlement.totalScore,
            earnedCoins: settlement.totalCoins,
            collectedItemCount: settlement.acquiredItems?.length ?? 0
        });
        if ((settlement.deliveryCount ?? 0) > 0) {
            updatedRecordKeys = [
                ...updatedRecordKeys,
                ...this.gameRecordTracker.recordDeliverySuccess({
                    count: settlement.deliveryCount,
                    currentContractDeliveries: this.sessionState.totalDeliveries
                })
            ];
        }
        const achievements = updatedRecordKeys.length > 0
            ? this.achievementTracker.evaluateAchievements({ source: 'game_record', keys: [...new Set(updatedRecordKeys)] })
            : [];
        this.uiController.showAchievementToasts?.(achievements);

        const shareMap = this.shareMapViewDataFactory.create({
            sector: this.currentSector,
            rocket: this.currentRocket
        });
        this.worldRenderer?.disableSonar?.();
        this.uiController.playFlightEndSE?.(settlement.status);
        await this.worldRenderer?.playFinishAnimation?.(result);

        const viewData = this.flightResultViewDataFactory.createViewData(
            settlement,
            replayRecord,
            achievements,
            unlockedStoryId,
            shareMap
        );
        this.uiController.showResultScreen(viewData);
        return viewData;
    }

    confirmSettlement(settlement) {
        if (this.currentSector) {
            this.currentSector.luckyDiscountRate = settlement.luckyDiscountRate ?? 0;
        }

        if (settlement.status === 'cleared') {
            this.enterFacility(settlement.destination);
            return;
        }

        if (!this.checkGameOverAndStartEndSequence({
            completedSectors: Math.max(0, this.sessionState.sectorNumber - 1)
        })) {
            this.uiController.setFlightMode?.(false);
            this.buildFlowController.showBuildScreen();
        }
    }

    enterFacility(type) {
        const viewData = this.facilityFlowController.enter(type);
        this.#wireFacilityHandlers();
        this.#checkFacilityTutorial(type);
        return viewData;
    }

    handleFacilityAction(action, context) {
        const delta = this.facilityFlowController.handleAction(action, context);
        this.#wireFacilityHandlers();
        return delta;
    }

    refreshCurrentView() {
        if (this.facilityFlowController.currentType) {
            const viewData = this.facilityFlowController.refreshView();
            this.#wireFacilityHandlers();
            return viewData;
        }

        const viewData = this.buildFlowController.showBuildScreen();
        this.mapInteractionController.refreshPredictionPath();
        return viewData;
    }

    getTutorialScene() {
        if (this.facilityFlowController.currentType) {
            return 'facility';
        }
        return 'build';
    }

    async leaveFacility() {
        const departedFacilityType = this.facilityFlowController.currentType;
        if (this.checkGameOverAndStartEndSequence({
            completedSectors: this.sessionState.sectorNumber
        })) {
            return true;
        }

        if (departedFacilityType === 'BLACK_MARKET') {
            this.sessionState.recordBlackMarketVisit();
        }
        this.uiController.updateHUDValue?.('coin', this.sessionState.coins);
        await this.beginSectorTransition();
        return false;
    }

    async returnToTitle() {
        this.worldRenderer?.stopWarpEffect?.(1600, { fromCurrent: true });
        this.appOrchestrator?.returnToTitle?.();
    }

    #wireFacilityHandlers() {
        this.uiController.setFacilityActionHandler?.((action, context) => this.handleFacilityAction(action, context));
        this.uiController.setFacilityDepartHandler?.(() => this.leaveFacility());
    }

    #handleBuildTabChange(tabId) {
        if (tabId === 'assembly') {
            this.tutorialFlowController?.checkTrigger?.('assemblyTabReady', { currentScene: 'build' });
            return;
        }
        if (tabId === 'flight') {
            this.tutorialFlowController?.checkTrigger?.('flightTabReady', { currentScene: 'build' });
        }
    }

    #checkAimTutorial() {
        const selection = this.buildFlowController.currentBuildSelection;
        if (selection.rocket && selection.launcher && this.currentSector) {
            this.tutorialFlowController?.checkTrigger?.('aimStart', { currentScene: 'build' });
        }
    }

    #checkFacilityTutorial(type) {
        const triggerName = {
            TRADING_POST: 'facilityTradingPost',
            REPAIR_DOCK: 'facilityRepairDock',
            BLACK_MARKET: 'facilityBlackMarket'
        }[type];
        if (triggerName) {
            this.tutorialFlowController?.checkTrigger?.(triggerName, { currentScene: 'facility', facilityType: type });
        }
    }

    handleResultMapToggle(showMap) {
        if (showMap) {
            this.worldRenderer?.render?.();
        }
    }

    handleResultProtect(favorite, options = {}) {
        if (options.replaceRecordId) {
            this.flightRecorder.setFavorite(options.replaceRecordId, false);
        }

        if (this.lastReplayRecord?.id) {
            const updatedRecord = this.flightRecorder.setFavorite(this.lastReplayRecord.id, favorite);
            this.lastReplayRecord = {
                ...this.lastReplayRecord,
                ...(updatedRecord ?? {}),
                favorite: updatedRecord?.favorite ?? favorite
            };
            return this.lastReplayRecord;
        }

        if (favorite && this.flightRecorder.getPendingRecord?.()) {
            this.lastReplayRecord = this.flightRecorder.savePendingRecordAsFavorite();
            return this.lastReplayRecord;
        }

        return null;
    }

    checkGameOverAndStartEndSequence(context = {}) {
        return this.sectorProgressionController.checkGameOverAndStartEndSequence(context);
    }

    async beginSectorTransition(options = {}) {
        const previousSectorNumber = this.sessionState.sectorNumber;
        const nextSectorNumber = previousSectorNumber + 1;
        const sectorArrivalStoryId = this.storySystem.getSectorArrivalStoryId(
            previousSectorNumber,
            nextSectorNumber
        );
        this.facilityFlowController.reset();
        this.currentRocket = null;
        this.navigationLoopController.stop();
        this.worldRenderer?.clearPredictionPath?.();
        this.worldRenderer?.clearAimRocket?.();
        this.worldRenderer?.disableSonar?.();
        this.uiController.showSectorTransitionScreen?.();
        if (this.isFirstSectorTransition) {
            this.worldRenderer?.clearSector?.();
        }

        this.currentSector = await this.sectorTransitionAnimator.play(
            () => this.sectorProgressionController.beginSectorTransition({
                ...options,
                sectorTitleType: sectorArrivalStoryId ? 'home' : options.sectorTitleType
            })
        );
        this.isFirstSectorTransition = false;
        this.uiController.setFlightMode?.(false);
        this.buildFlowController.showBuildScreen();
        if (sectorArrivalStoryId) {
            this.uiController.showStoryModal?.(sectorArrivalStoryId);
            this.storySystem.updateReadStatus(sectorArrivalStoryId);
            const achievements = this.achievementTracker.evaluateAchievements({
                source: 'story_read',
                keys: ['total']
            });
            this.uiController.showAchievementToasts?.(achievements);
        }
        this.tutorialFlowController?.checkTrigger?.('buildScreen', { currentScene: 'build' });
        return this.currentSector;
    }

    #updateMailHud(storyId) {
        if (!storyId) {
            return;
        }

        const storyStatus = this.storySystem.getStoryStatus();
        const index = storyStatus.findIndex(story => story.id === storyId);
        const story = storyStatus[index];
        if (!story) {
            return;
        }

        this.uiController.updateMailStatus?.(index, story.type, story.isUnread);
    }

}

export default GameController;
