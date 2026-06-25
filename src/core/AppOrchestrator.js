import { DataManager } from '../../../GameWorksOAK/src/lib/core/dataManager.js';
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
import NavigationLoopController from '../systems/logic/NavigationLoopController.js';
import PhysicsEngine from '../systems/logic/PhysicsEngine.js';
import RankTracker from '../systems/logic/RankTracker.js';
import StorySystem from '../systems/logic/StorySystem.js';
import TrajectoryPredictor from '../systems/logic/TrajectoryPredictor.js';
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
        this.gameDataRepository = null;
        this.gameController = null;
        this.replayContext = null;
        this.systems = null;
    }

    async boot() {
        setAppVersion(packageData.version);
        this.gameDataRepository = new GameDataRepository(this.commonDataManager, this.i18nAdapter);
        await this.gameDataRepository.loadAllData();
        this.soundController = this.soundController || new SoundController(this.gameDataRepository);

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
        this.uiController.setStartHandler(() => this.startGame());
        this.uiController.setRecordHandler?.(() => this.showRecordScreen());
        this.uiController.setReplayStartHandler?.(recordId => this.startReplay(recordId));
        this.uiController.setReplayProtectHandler?.(request => this.setReplayProtect(request));
        this.uiController.setReplayProtectRecordsProvider?.(() => this.systems.flightRecorder.getRecords());
        this.uiController.setManualHandler?.(() => {});
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

    showRecordScreen() {
        const presenter = new ArchiveScreenPresenter({
            gameRecordTracker: this.systems.gameRecordTracker,
            rankTracker: this.systems.rankTracker,
            achievementTracker: this.systems.achievementTracker,
            flightRecorder: this.systems.flightRecorder,
            gameDataRepository: this.gameDataRepository
        });
        this.uiController.showRecordScreen(presenter.createViewData());
    }

    startReplay(recordId) {
        this.replayContext = this.systems.flightRecorder.createReplayContext(recordId);
        return this.replayContext;
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
            backgroundManager
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
    }
}

export default AppOrchestrator;
