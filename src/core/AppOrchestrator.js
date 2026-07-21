import { DataManager } from '../../../GameWorksOAK/src/lib/core/dataManager.js';
import { setupLanguageSelector as defaultSetupLanguageSelector } from '../../../GameWorksOAK/src/lib/core/i18n.js';
import { setAppVersion } from '../../../GameWorksOAK/src/lib/utils/env.js';
import packageData from '../../package.json';
import GameDataRepository from './GameDataRepository.js';
import SessionState from '../systems/entities/SessionState.js';
import AchievementTracker from '../systems/logic/AchievementTracker.js';
import ArchiveScreenPresenter from '../systems/logic/ArchiveScreenPresenter.js';
import EconomySystem from '../systems/logic/EconomySystem.js';
import FlightRecorder from '../systems/logic/FlightRecorder.js';
import GameController from '../systems/logic/GameController.js';
import GameRecordTracker from '../systems/logic/GameRecordTracker.js';
import MapInteractionController from '../systems/logic/MapInteractionController.js';
import NavigationLoopController from '../systems/logic/NavigationLoopController.js';
import PhysicsEngine from '../systems/logic/PhysicsEngine.js';
import RankTracker from '../systems/logic/RankTracker.js';
import StorySystem from '../systems/logic/StorySystem.js';
import TrajectoryPredictor from '../systems/logic/TrajectoryPredictor.js';
import TutorialCameraFocusController from '../systems/logic/TutorialCameraFocusController.js';
import TutorialFlowController from '../systems/logic/TutorialFlowController.js';
import UIController from '../systems/ui/UIController.js';
import BackgroundManager from '../systems/core/BackgroundManager.js';
import CameraController from '../systems/core/CameraController.js';
import SoundController from '../systems/core/SoundController.js';
import TitleScreenAnimator from '../systems/core/TitleScreenAnimator.js';
import WorldRenderer from '../systems/core/WorldRenderer.js';

class AppOrchestrator {
    constructor(options = {}) {
        this.commonDataManager = options.commonDataManager || new DataManager('gravity_freight');
        this.i18nAdapter = options.i18nAdapter || {};
        this.uiController = options.uiController || null;
        this.worldRenderer = options.worldRenderer || new WorldRenderer();
        this.titleScreenAnimator = options.titleScreenAnimator || new TitleScreenAnimator();
        this.soundController = options.soundController || null;
        this.gameControllerClass = options.gameControllerClass || GameController;
        this.tutorialFlowControllerClass = options.tutorialFlowControllerClass || TutorialFlowController;
        this.gameDataRepository = null;
        this.gameController = null;
        this.replayContext = null;
        this.replayMapInteractionController = null;
        this.systems = null;
    }

    async boot() {
        setAppVersion(packageData.version);
        this.gameDataRepository = new GameDataRepository(this.commonDataManager, this.i18nAdapter);
        await this.gameDataRepository.loadAllData();
        this.soundController = this.soundController || new SoundController(this.gameDataRepository);
        this.worldRenderer.setSoundController?.(this.soundController);

        this.uiController = this.uiController || new UIController({
            gameDataRepository: this.gameDataRepository,
            soundController: this.soundController
        });
        this.systems = this.#createAppSystems();
        this.#initializePersistentSystems();

        await this.worldRenderer.initialize(
            this.uiController.getMapCanvas(),
            this.systems.cameraController,
            this.systems.backgroundManager
        );
        this.worldRenderer.setRenderLoopActive?.(false);
        this.titleScreenAnimator.initialize(
            this.uiController.getTitleCanvases(),
            this.systems.backgroundManager
        );
        this.uiController.setAppMetadata?.(this.gameDataRepository.getAppMetadata());
        this.#configureSettings();
        this.uiController.setStartHandler(() => this.startGame());
        this.uiController.setRecordHandler?.(() => this.showRecordScreen());
        this.uiController.setArchiveStoryHandler?.(storyId => this.uiController.showStoryModal?.(storyId));
        this.uiController.setReplayStartHandler?.(recordId => this.startReplay(recordId));
        this.uiController.setReplayExitHandler?.(() => this.stopReplay());
        this.uiController.setReplayProtectHandler?.(request => this.setReplayProtect(request));
        this.uiController.setReplayProtectRecordsProvider?.(() => this.systems.flightRecorder.getRecords());
        this.uiController.setManualHandler?.(() => this.uiController.showManualScreen?.());
        this.uiController.showTitleScreen();
        this.titleScreenAnimator.start();
    }

    async startGame() {
        this.titleScreenAnimator.stop();
        this.worldRenderer.setRenderLoopActive?.(true);
        this.gameController = new this.gameControllerClass({
            ...this.systems,
            uiController: this.uiController,
            worldRenderer: this.worldRenderer,
            gameDataRepository: this.gameDataRepository,
            appOrchestrator: this
        });

        await this.gameController.start();
    }

    returnToTitle() {
        this.gameController = null;
        this.worldRenderer.setRenderLoopActive?.(false);
        this.uiController.showTitleScreen();
        this.titleScreenAnimator.start();
    }

    showRecordScreen(options = {}) {
        const presenter = new ArchiveScreenPresenter({
            gameRecordTracker: this.systems.gameRecordTracker,
            rankTracker: this.systems.rankTracker,
            achievementTracker: this.systems.achievementTracker,
            flightRecorder: this.systems.flightRecorder,
            gameDataRepository: this.gameDataRepository,
            storySystem: this.systems.storySystem
        });
        this.uiController.showRecordScreen(presenter.createViewData(), options);
    }

    startReplay(recordId) {
        this.titleScreenAnimator.stop();
        this.systems.navigationLoopController.stop();
        this.replayContext = this.systems.flightRecorder.createReplayContext(recordId);
        this.systems.cameraController.reset({ persist: false });
        this.worldRenderer.resetMapWarp?.();
        this.uiController.hideRecordScreen?.();
        this.uiController.showReplayScreen?.(
            this.replayContext.record,
            this.#createReplayBuildViewData(this.replayContext.rocket)
        );
        this.uiController.initHUD?.({
            sectorNumber: this.replayContext.record.reachedSector,
            totalScore: 0,
            coins: 0
        });
        this.worldRenderer.setRenderLoopActive?.(true);
        this.worldRenderer.setSector?.(this.replayContext.sector);
        this.worldRenderer.clearPredictionPath?.();
        this.worldRenderer.clearAimRocket?.();
        this.#enableReplayMapViewing();
        this.worldRenderer.startNavigation?.(this.replayContext.rocket);
        this.worldRenderer.enableSonar?.();
        this.systems.navigationLoopController.start({
            rocket: this.replayContext.rocket,
            sector: this.replayContext.sector,
            onNavigationEnd: () => this.#finishReplay()
        });
        return this.replayContext;
    }

    stopReplay() {
        if (!this.replayContext) {
            return null;
        }

        this.systems.navigationLoopController.stop();
        this.#disableReplayMapViewing();
        this.worldRenderer.disableSonar?.();
        this.worldRenderer.startNavigation?.(null);
        this.uiController.hideReplayScreen?.();
        this.replayContext = null;
        this.#returnFromReplayToArchive();
        return null;
    }

    setReplayProtect(request) {
        if (request.source === 'result') {
            return this.gameController?.handleResultProtect(request.favorite, {
                replaceRecordId: request.replaceRecordId
            }) ?? null;
        }

        return this.systems.flightRecorder.setFavorite(request.recordId, request.favorite);
    }

    #createAppSystems() {
        const sessionState = new SessionState(this.gameDataRepository);
        const economySystem = new EconomySystem(this.gameDataRepository);
        const gameRecordTracker = new GameRecordTracker(this.gameDataRepository);
        const rankTracker = new RankTracker(this.gameDataRepository);
        const storySystem = new StorySystem(this.gameDataRepository);
        const achievementTracker = new AchievementTracker(
            this.gameDataRepository,
            gameRecordTracker,
            storySystem
        );
        const flightRecorder = new FlightRecorder(this.gameDataRepository);
        const physicsEngine = new PhysicsEngine(this.gameDataRepository);
        const navigationLoopController = new NavigationLoopController({
            physicsEngine,
            gameDataRepository: this.gameDataRepository,
            uiController: this.uiController,
            worldRenderer: this.worldRenderer
        });
        const trajectoryPredictor = new TrajectoryPredictor(physicsEngine);
        const cameraController = new CameraController(this.gameDataRepository);
        const backgroundManager = new BackgroundManager();
        const tutorialCameraFocusController = new TutorialCameraFocusController({
            cameraController,
            worldRenderer: this.worldRenderer
        });
        const tutorialFlowController = new this.tutorialFlowControllerClass({
            gameDataRepository: this.gameDataRepository,
            document,
            cameraFocusController: tutorialCameraFocusController
        });

        return {
            sessionState,
            economySystem,
            gameRecordTracker,
            rankTracker,
            storySystem,
            achievementTracker,
            flightRecorder,
            physicsEngine,
            navigationLoopController,
            trajectoryPredictor,
            cameraController,
            soundController: this.soundController,
            backgroundManager,
            tutorialCameraFocusController,
            tutorialFlowController
        };
    }

    #initializePersistentSystems() {
        this.systems.cameraController.initialize();
        this.systems.soundController.initialize();
        this.systems.gameRecordTracker.initialize();
        this.systems.rankTracker.initialize();
        this.systems.storySystem.initialize();
        this.systems.achievementTracker.initialize();
        this.systems.flightRecorder.initialize();
        this.systems.tutorialFlowController.initialize();
    }

    #configureSettings() {
        const setupLanguageSelector = this.i18nAdapter.setupLanguageSelector || defaultSetupLanguageSelector;
        this.uiController.configureSettings?.({
            seVolume: this.systems.soundController.getSEVolume?.() ?? 0.5,
            onSEVolumeChange: volume => {
                this.systems.soundController.setSEVolume(volume);
                this.systems.soundController.playSE?.('select', volume);
            },
            onCameraReset: () => {
                this.systems.cameraController.reset();
                this.worldRenderer.render?.();
            },
            onOpen: () => {
                this.systems.tutorialFlowController.setTriggersBlocked(true);
            },
            onClose: () => {
                this.systems.tutorialFlowController.setTriggersBlocked(false);
                this.systems.tutorialFlowController.checkCurrentSceneTrigger({
                    currentScene: this.gameController?.getTutorialScene?.() ?? null,
                    source: 'settingsClose'
                });
            },
            onTutorialReset: () => {
                this.systems.tutorialFlowController.reset({
                    currentScene: this.gameController?.getTutorialScene?.() ?? null
                });
            },
            setupLanguageSelector,
            onLanguageChange: () => this.#refreshLanguageDependentUI()
        });
    }

    #refreshLanguageDependentUI() {
        this.uiController.setAppMetadata?.(this.gameDataRepository.getAppMetadata());
        this.uiController.refreshManualLanguage?.();
        this.uiController.refreshLanguageDependentUI?.();
        if (this.replayContext) {
            this.uiController.showReplayScreen?.(
                this.replayContext.record,
                this.#createReplayBuildViewData(this.replayContext.rocket)
            );
            return;
        }
        const recordScreenState = this.uiController.getRecordScreenState?.();
        if (recordScreenState?.visible) {
            this.showRecordScreen({ activeTab: recordScreenState.activeTab ?? 'analytics' });
            return;
        }
        if (this.gameController?.refreshCurrentView) {
            this.gameController.refreshCurrentView();
        }
    }

    async #finishReplay() {
        this.systems.navigationLoopController.stop();
        this.worldRenderer.disableSonar?.();
        await this.worldRenderer.playFinishAnimation?.();
        this.worldRenderer.setRenderLoopActive?.(false);
    }

    #enableReplayMapViewing() {
        this.replayMapInteractionController = new MapInteractionController({
            gameDataRepository: this.gameDataRepository,
            sessionState: this.systems.sessionState,
            buildFlowController: { currentBuildSelection: {} },
            trajectoryPredictor: null,
            uiController: this.uiController,
            worldRenderer: this.worldRenderer,
            cameraController: this.systems.cameraController,
            getCurrentSector: () => this.replayContext?.sector ?? null,
            getLaunchPosition: () => ({ x: 0, y: 0 })
        });
        this.uiController.setCanvasInputHandler?.(event => {
            this.replayMapInteractionController?.handleInput(event);
        });
    }

    #disableReplayMapViewing() {
        this.replayMapInteractionController = null;
        this.uiController.setCanvasInputHandler?.(null);
    }

    #returnFromReplayToArchive() {
        this.worldRenderer.setRenderLoopActive?.(false);
        this.uiController.showTitleScreen();
        this.titleScreenAnimator.start();
        this.showRecordScreen({ activeTab: 'replays' });
    }

    #createReplayBuildViewData(rocket) {
        const sectionIds = ['rocket', 'launcher', 'booster', 'chassis', 'logic', 'module'];
        const sections = Object.fromEntries(sectionIds.map(category => [
            category,
            this.#createReplayBuildSection(category)
        ]));

        this.#appendReplayBuildEntry(sections.rocket, rocket?.rocketItem);
        this.#appendReplayBuildEntry(sections.launcher, rocket?.launcher);
        this.#appendReplayBuildEntry(sections.booster, rocket?.booster);

        return {
            sections,
            assembly: {
                ready: false,
                label: this.gameDataRepository.getUiText('build.assemble.label'),
                subtext: this.gameDataRepository.getUiText('build.assemble.waitingSubtext')
            },
            launch: {
                ready: false,
                label: this.gameDataRepository.getUiText('build.launch.label'),
                subtext: this.gameDataRepository.getUiText('build.launch.waitingSubtext'),
                bonusText: ''
            }
        };
    }

    #createReplayBuildSection(category) {
        return {
            entries: [],
            emptyText: this.gameDataRepository.getUiText(`build.empty.${category}.text`),
            emptySubtext: this.gameDataRepository.getUiText(`build.empty.${category}.subtext`)
        };
    }

    #appendReplayBuildEntry(section, item) {
        if (!section || !item) {
            return;
        }

        section.entries.push({
            uid: item.uid,
            item,
            itemViewData: item.getViewData(),
            selected: false,
            selectedCount: 0,
            disabled: true
        });
    }
}

export default AppOrchestrator;
