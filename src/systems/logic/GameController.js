import SectorProgressionController from './SectorProgressionController.js';
import SectorTransitionAnimator from './SectorTransitionAnimator.js';
import BuildScreenPresenter from './BuildScreenPresenter.js';
import BuildFlowController from './BuildFlowController.js';
import NavigationLoopController from './NavigationLoopController.js';
import Rocket from '../entities/Rocket.js';
import { FACILITY_LABELS, FACILITY_THEME_CLASSES } from './facilityViewConstants.js';

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
        this.currentSector = null;
        this.currentRocket = null;
        this.currentLaunchAngle = 0;
        this.mapInteraction = null;
        this.lastReplayRecord = null;
        this.buildScreenPresenter = infrastructure.buildScreenPresenter
            || new BuildScreenPresenter(this.gameDataRepository);
        this.buildFlowController = infrastructure.buildFlowController
            || new BuildFlowController({
                sessionState: this.sessionState,
                uiController: this.uiController,
                buildScreenPresenter: this.buildScreenPresenter
            });
        this.repairDockDismantleCount = 0;
        this.currentFacilityType = null;
        this.currentFacilityViewData = null;
        this.currentTradingPostStock = null;
        this.sectorProgressionController = infrastructure.sectorProgressionController
            || new SectorProgressionController(infrastructure);
        this.sectorTransitionAnimator = infrastructure.sectorTransitionAnimator
            || new SectorTransitionAnimator({
                worldRenderer: this.worldRenderer,
                wait: infrastructure.wait,
                durations: infrastructure.sectorTransitionDurations
            });
    }

    async start() {
        this.sessionState.initialize();
        this.storySystem.resetSession?.();
        this.uiController.initHUD(this.sessionState);
        this.uiController.setResultHandler?.(() => this.confirmSettlement(this.lastSettlement));
        this.uiController.setMapToggleHandler?.(showMap => this.handleResultMapToggle(showMap));
        this.uiController.setGameEndReturnHandler?.(() => this.returnToTitle());
        this.uiController.setBuildItemSelectionHandler?.(selection => {
            const viewData = this.buildFlowController.handleItemSelection(selection);
            this.#refreshPredictionPath();
            return viewData;
        });
        this.uiController.setBuildAssembleHandler?.(
            () => this.buildFlowController.assembleRocket()
        );
        this.uiController.setLaunchHandler?.(() => this.launchSelectedRocket());
        this.uiController.setCanvasInputHandler?.(event => this.handleCanvasInput(event));

        return this.beginSectorTransition();
    }

    handleCanvasInput(event) {
        if (!this.cameraController || !event) {
            return;
        }

        if (event.type === 'pointerdown') {
            this.#beginMapInteraction(event);
            return;
        }

        if (event.type === 'pointermove') {
            this.#continueMapInteraction(event);
            return;
        }

        if (event.type === 'pinch') {
            this.#handlePinch(event);
            return;
        }

        if (event.type === 'wheel') {
            this.#handleWheel(event);
            return;
        }

        if (event.type === 'hover') {
            this.#handleBodyHover(event);
            return;
        }

        if (event.type === 'hoverleave') {
            this.uiController.hideStarInfo?.();
            return;
        }

        if (event.type === 'pointerup') {
            this.#endMapInteraction();
        }
    }

    launchSelectedRocket() {
        const rocket = this.#createRocketFromFlightSelection();
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

        if (settlement.unlockedBranchId) {
            this.storySystem.unlockNextStep(settlement.unlockedBranchId);
        }

        const resultContext = this.#createFlightResultContext(settlement);
        const replayRecord = this.flightRecorder.recordFlightResult(resultContext);
        this.lastReplayRecord = replayRecord;
        const updatedRecordKeys = this.gameRecordTracker.recordFlightResult({
            completedSectors: settlement.status === 'cleared' ? 1 : 0,
            distance: result.distance ?? flightData.distance ?? 0,
            score: settlement.totalScore,
            earnedCoins: settlement.totalCoins,
            collectedItemCount: settlement.acquiredItems?.length ?? 0
        });
        const achievements = updatedRecordKeys.length > 0
            ? this.achievementTracker.evaluateAchievements({ source: 'game_record', keys: updatedRecordKeys })
            : [];

        this.worldRenderer?.disableSonar?.();
        await this.worldRenderer?.playFinishAnimation?.(result);

        const viewData = this.#createFlightResultViewData(settlement, replayRecord, achievements);
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
            this.uiController.showBuildScreen?.();
        }
    }

    enterFacility(type) {
        this.currentFacilityType = type;
        this.currentTradingPostStock = type === 'TRADING_POST'
            ? this.economySystem.generateTradingPostStock(this.sessionState)
            : null;
        const viewData = this.#createFacilityViewData(type);
        this.#showFacilityView(type, viewData);
        return viewData;
    }

    handleFacilityAction(action, context) {
        const transaction = this.#createFacilityTransaction(action, context);
        const delta = this.sessionState.applyTransaction(transaction);

        this.#afterFacilityTransaction(action, context, delta);
        return delta;
    }

    async leaveFacility() {
        if (this.checkGameOverAndStartEndSequence({
            completedSectors: this.sessionState.sectorNumber
        })) {
            return true;
        }

        await this.beginSectorTransition();
        return false;
    }

    async returnToTitle() {
        await this.worldRenderer?.stopGameEndExitAnimation?.();
        this.appOrchestrator?.returnToTitle?.();
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
        this.currentFacilityType = null;
        this.currentFacilityViewData = null;
        this.currentTradingPostStock = null;
        this.currentRocket = null;
        this.navigationLoopController.stop();
        this.worldRenderer?.clearPredictionPath?.();
        this.worldRenderer?.clearAimRocket?.();
        this.worldRenderer?.disableSonar?.();
        this.uiController.showSectorTransitionScreen?.();

        this.currentSector = await this.sectorTransitionAnimator.play(
            () => this.sectorProgressionController.beginSectorTransition(options)
        );
        this.uiController.setFlightMode?.(false);
        this.buildFlowController.showBuildScreen();
        return this.currentSector;
    }

    #createFlightResultContext(settlement) {
        return {
            resultType: settlement.status,
            score: settlement.totalScore,
            totalScore: settlement.totalScore,
            reachedSector: this.sessionState.sectorNumber,
            destinationType: settlement.destination ?? null
        };
    }

    #createFlightResultViewData(settlement, replayRecord, achievements) {
        const pendingRecord = this.flightRecorder.getPendingRecord();
        const storyStatus = this.storySystem.getStoryStatus();

        return {
            title: this.#getTitle(settlement),
            status: settlement.status,
            themeClass: this.#getThemeClass(settlement),
            totalScore: settlement.totalScore,
            totalCoins: settlement.totalCoins,
            actionLabel: this.#getActionLabel(settlement),
            entries: settlement.entries || [],
            itemReport: settlement.itemReport || [],
            replay: {
                id: replayRecord?.id ?? pendingRecord?.id ?? null,
                recorded: !!replayRecord,
                favorite: !!replayRecord?.favorite,
                pending: !replayRecord && !!pendingRecord,
                score: settlement.totalScore,
                reachedSector: this.sessionState.sectorNumber,
                createdAt: replayRecord?.createdAt ?? pendingRecord?.createdAt ?? null
            },
            achievements,
            storyStatus,
            storyCards: storyStatus
        };
    }

    #getThemeClass(settlement) {
        if (settlement.destination) {
            return FACILITY_THEME_CLASSES[settlement.destination] || 'home';
        }

        return 'home';
    }

    #getActionLabel(settlement) {
        if (settlement.status === 'cleared' && settlement.destination) {
            return this.#formatText(
                this.gameDataRepository.getUiText('flightResult.actions.toFacility'),
                { facility: FACILITY_LABELS[settlement.destination] || settlement.destination }
            );
        }

        if (settlement.status === 'returned' || settlement.status === 'crashed' || settlement.status === 'lost') {
            return this.gameDataRepository.getUiText('flightResult.actions.backToBase');
        }

        return this.gameDataRepository.getUiText('flightResult.actions.continue');
    }

    #getTitle(settlement) {
        const titleKey = settlement.status
            ? `flightResult.titles.${settlement.status}`
            : 'flightResult.titles.complete';
        const title = this.gameDataRepository.getUiText(titleKey);

        return this.#formatText(title, { sector: this.sessionState.sectorNumber });
    }

    #formatText(template, values) {
        return Object.entries(values).reduce(
            (text, [key, value]) => text.replaceAll(`{${key}}`, value),
            template
        );
    }

    #createFacilityViewData(type) {
        const facility = this.gameDataRepository.getFacilityDefinition(type);
        const luckyDiscount = this.currentSector?.luckyDiscountRate ?? 0;

        return {
            type,
            name: facility.name,
            icon: facility.icon,
            themeClass: facility.className || FACILITY_THEME_CLASSES[type] || 'home',
            description: this.#getFacilityText(type, 'descriptions'),
            coins: this.sessionState.coins,
            luckyDiscountRate: luckyDiscount,
            creditsLabel: this.gameDataRepository.getUiText('facility.common.credits'),
            departLabel: this.gameDataRepository.getUiText('facility.common.depart'),
            sections: this.#createFacilitySections(type, luckyDiscount)
        };
    }

    #createFacilitySections(type, luckyDiscount) {
        if (type === 'TRADING_POST') {
            return this.#createTradingPostSections(luckyDiscount);
        }
        if (type === 'REPAIR_DOCK') {
            return this.#createRepairDockSections(luckyDiscount);
        }
        if (type === 'BLACK_MARKET') {
            return this.#createBlackMarketSections(luckyDiscount);
        }

        throw new Error(`[GameController] Unknown facility type: ${type}`);
    }

    #createTradingPostSections(luckyDiscount) {
        const stockEntries = this.currentTradingPostStock
            .map(stock => this.#createTradeEntry({
                action: 'buy',
                actionLabel: this.gameDataRepository.getUiText('facility.actions.buy'),
                item: stock.item,
                price: this.economySystem.calculateFinalPrice(stock.originalPrice, luckyDiscount, stock.itemDiscount),
                discountRate: luckyDiscount + stock.itemDiscount
            }));
        const sellEntries = this.sessionState.inventory.stacks
            .filter(stack => !['cargo', 'coin'].includes(stack.representative.category))
            .map(stack => this.#createTradeEntry({
                action: 'sell',
                actionLabel: this.gameDataRepository.getUiText('facility.actions.sell'),
                item: stack.representative,
                price: this.economySystem.calculateAppraisalValue(stack.representative),
                uid: stack.uid
            }));

        return [
            this.#createFacilitySection('buy', 'tradingPostBuy', stockEntries),
            this.#createFacilitySection('sell', 'tradingPostSell', sellEntries)
        ];
    }

    #createRepairDockSections(luckyDiscount) {
        const repairEntries = this.sessionState.inventory.getItemsByCategory('launcher')
            .flatMap(stack => stack.items)
            .filter(item => item.charges < item.maxCharges)
            .map(item => this.#createTradeEntry({
                action: 'repair',
                actionLabel: this.gameDataRepository.getUiText('facility.actions.repair'),
                item,
                price: this.economySystem.calculateRepairCost(item, luckyDiscount)
            }));
        const rocketItem = this.currentRocket?.rocketItem;
        const dismantleEntries = rocketItem ? [
            this.#createTradeEntry({
                action: 'dismantle',
                actionLabel: this.gameDataRepository.getUiText('facility.actions.dismantle'),
                item: rocketItem,
                price: this.economySystem.calculateDismantleCost(this.repairDockDismantleCount, luckyDiscount)
            })
        ] : [];

        return [
            this.#createFacilitySection('repair', 'repairDockRepair', repairEntries),
            this.#createFacilitySection('dismantle', 'repairDockDismantle', dismantleEntries),
            this.#createFacilitySection('received', 'repairDockReceived', [])
        ];
    }

    #createBlackMarketSections(luckyDiscount) {
        const entries = [
            this.#createMenuEntry(
                'black_market_normal',
                this.gameDataRepository.getUiText('facility.blackMarket.normalName'),
                this.gameDataRepository.getUiText('facility.blackMarket.normalDescription'),
                'black-market',
                'buy_normal',
                this.gameDataRepository.getUiText('facility.actions.buy'),
                this.economySystem.calculateFinalPrice(100, luckyDiscount)
            ),
            this.#createMenuEntry(
                'black_market_premium',
                this.gameDataRepository.getUiText('facility.blackMarket.premiumName'),
                this.gameDataRepository.getUiText('facility.blackMarket.premiumDescription'),
                'black-market',
                'buy_premium',
                this.gameDataRepository.getUiText('facility.actions.buy'),
                this.economySystem.calculateFinalPrice(500, luckyDiscount)
            )
        ];

        return [
            this.#createFacilitySection('black-market', 'blackMarketStock', entries),
            this.#createFacilitySection('acquired', 'blackMarketAcquired', [])
        ];
    }

    #createTradeEntry({ action, actionLabel, item, price, uid = item.uid, discountRate = 0 }) {
        return {
            action,
            actionLabel,
            uid,
            item,
            itemViewData: item.getViewData(),
            price,
            discountPercent: Math.round(Math.min(0.5, discountRate) * 100),
            disabled: this.sessionState.coins < price
        };
    }

    #createMenuEntry(id, name, description, category, action, actionLabel, price) {
        return {
            action,
            actionLabel,
            uid: id,
            itemViewData: {
                uid: id,
                id,
                name,
                category,
                description,
                stats: {}
            },
            price,
            discountPercent: 0,
            disabled: this.sessionState.coins < price
        };
    }

    #createFacilitySection(id, resourceKey, entries) {
        return {
            id,
            title: this.gameDataRepository.getUiText(`facility.sections.${resourceKey}.title`),
            subtitle: this.gameDataRepository.getUiText(`facility.sections.${resourceKey}.subtitle`),
            entries,
            emptyText: this.gameDataRepository.getUiText('facility.common.emptyText'),
            emptySubtext: this.gameDataRepository.getUiText('facility.common.emptySubtext'),
            themeClass: 'home'
        };
    }

    #getFacilityText(type, group) {
        const key = {
            TRADING_POST: 'tradingPost',
            REPAIR_DOCK: 'repairDock',
            BLACK_MARKET: 'blackMarket'
        }[type];

        return this.gameDataRepository.getUiText(`facility.${group}.${key}`);
    }

    #showFacilityView(type, viewData) {
        this.currentFacilityViewData = viewData;
        this.uiController.showFacilityScreen(type, viewData);
        this.uiController.setFacilityActionHandler?.((action, context) => this.handleFacilityAction(action, context));
        this.uiController.setFacilityDepartHandler?.(() => this.leaveFacility());
    }

    #refreshFacilityView() {
        const viewData = this.#createFacilityViewData(this.currentFacilityType);
        this.#showFacilityView(this.currentFacilityType, viewData);
    }

    #createFacilityTransaction(action, context = {}) {
        if (this.currentFacilityType === 'TRADING_POST' && action === 'buy') {
            const entry = this.#findFacilityEntry(action, context.uid);
            return {
                spentCoins: entry.price,
                earnedCoins: 0,
                acquiredItems: [entry.item]
            };
        }

        if (this.currentFacilityType === 'TRADING_POST' && action === 'sell') {
            const stack = this.sessionState.inventory.stacks.find(candidate => candidate.uid === context.uid);
            if (!stack) {
                throw new Error(`[GameController] Sell target not found: ${context.uid}`);
            }
            const item = stack.items[stack.items.length - 1];
            return {
                spentCoins: 0,
                earnedCoins: this.economySystem.calculateAppraisalValue(stack.representative),
                removedItems: [item]
            };
        }

        if (this.currentFacilityType === 'REPAIR_DOCK' && action === 'repair') {
            return this.economySystem.createRepairTransaction(
                this.#findInventoryItemByUid(context.uid),
                this.currentSector?.luckyDiscountRate ?? 0
            );
        }

        if (this.currentFacilityType === 'REPAIR_DOCK' && action === 'dismantle') {
            const entry = this.#findFacilityEntry(action, context.uid);
            return this.economySystem.createDismantleTransaction(
                entry.item,
                this.repairDockDismantleCount,
                this.currentSector?.luckyDiscountRate ?? 0
            );
        }

        if (this.currentFacilityType === 'BLACK_MARKET' && action === 'buy_normal') {
            return this.economySystem.drawBlackMarketGacha('normal', this.sessionState, this.currentSector?.luckyDiscountRate ?? 0);
        }

        if (this.currentFacilityType === 'BLACK_MARKET' && action === 'buy_premium') {
            return this.economySystem.drawBlackMarketGacha('premium', this.sessionState, this.currentSector?.luckyDiscountRate ?? 0);
        }

        throw new Error(`[GameController] Unknown facility action: ${action}`);
    }

    #afterFacilityTransaction(action, context, delta) {
        if (this.currentFacilityType === 'TRADING_POST' && action === 'buy') {
            this.currentTradingPostStock = this.currentTradingPostStock
                .filter(stock => stock.item.uid !== context.uid);
        }

        if (this.currentFacilityType === 'REPAIR_DOCK' && action === 'dismantle') {
            this.currentRocket = null;
            this.repairDockDismantleCount += 1;
        }

        const updatedKeys = this.gameRecordTracker.recordTransaction(delta, {
            currentCoins: this.sessionState.coins
        });
        if (updatedKeys.length > 0) {
            this.achievementTracker.evaluateAchievements({
                source: 'game_record',
                keys: updatedKeys
            });
        }

        this.uiController.updateFacilityCredits?.(this.sessionState.coins);
        this.#refreshFacilityView();
    }

    #findFacilityEntry(action, uid) {
        const entry = this.currentFacilityViewData?.sections
            .flatMap(section => section.entries)
            .find(candidate => candidate.action === action && candidate.uid === uid);
        if (!entry) {
            throw new Error(`[GameController] Facility entry not found: ${action} (${uid})`);
        }
        return entry;
    }

    #findInventoryItemByUid(uid) {
        const item = this.sessionState.inventory.stacks
            .flatMap(stack => stack.items)
            .find(candidate => candidate.uid === uid);
        if (!item) {
            throw new Error(`[GameController] Inventory item not found: ${uid}`);
        }
        return item;
    }

    #createRocketFromFlightSelection() {
        const selection = this.buildFlowController.currentBuildSelection;
        if (!selection.rocket || !selection.launcher) {
            throw new Error('[GameController] rocket and launcher selections are required.');
        }

        const rocketItem = this.#popSelectedStack(selection.rocket, 'rocket');
        const launcher = this.#popSelectedStack(selection.launcher, 'launcher');
        const booster = selection.booster
            ? this.#popSelectedStack(selection.booster, 'booster')
            : null;
        const angle = this.currentLaunchAngle;
        const rocket = new Rocket(
            rocketItem,
            launcher,
            booster,
            angle,
            this.#getLaunchPosition(angle)
        );

        this.#consumeLaunchPart(launcher, !booster?.preventsLauncherWear);
        this.#consumeLaunchPart(booster, true);
        this.buildFlowController.resetFlightSelection();
        this.buildFlowController.showBuildScreen();
        return rocket;
    }

    #popSelectedStack(uid, category) {
        const item = this.sessionState.inventory.popItemByUid(uid);
        if (!item) {
            throw new Error(`[GameController] selected ${category} is not available.`);
        }
        return item;
    }

    #consumeLaunchPart(item, shouldConsume) {
        if (!item) {
            return;
        }

        if (shouldConsume) {
            item.consumeCharge?.(1);
        }

        if ((item.maxCharges ?? 0) === 0 || (item.charges ?? 0) > 0) {
            this.sessionState.inventory.addItem(item);
        }
    }

    #getLaunchPosition(angle) {
        const home = this.currentSector?.bodies?.find(body => body.isHome) ?? {
            position: { x: 0, y: 0 },
            radius: 0
        };

        return {
            x: home.position.x + Math.cos(angle) * this.#getLaunchRadius(home),
            y: home.position.y + Math.sin(angle) * this.#getLaunchRadius(home)
        };
    }

    #getLaunchRadius(home) {
        if (!Number.isFinite(home.radius)) {
            throw new Error('[GameController] home body radius must be a finite number.');
        }

        const offset = this.gameDataRepository.getGameBalance().SHIP_START_OFFSET;
        if (!Number.isFinite(offset)) {
            throw new Error('[GameController] gameBalance.SHIP_START_OFFSET must be a finite number.');
        }

        return home.radius + offset;
    }

    #beginMapInteraction(event) {
        const mode = this.#resolveMapInteractionMode(event);
        this.mapInteraction = {
            mode,
            lastPoint: { ...event.point }
        };

        if (mode === 'aim') {
            this.#updateLaunchAngle(event.point);
        }
    }

    #continueMapInteraction(event) {
        if (!this.mapInteraction) {
            return;
        }

        const delta = {
            x: event.point.x - this.mapInteraction.lastPoint.x,
            y: event.point.y - this.mapInteraction.lastPoint.y
        };

        if (this.mapInteraction.mode === 'aim') {
            this.#updateLaunchAngle(event.point);
        } else if (this.mapInteraction.mode === 'rotate') {
            this.cameraController.rotate(this.mapInteraction.lastPoint, delta);
            this.#renderCameraChange();
        } else {
            this.cameraController.pan(delta);
            this.#renderCameraChange();
        }

        this.mapInteraction.lastPoint = { ...event.point };
    }

    #handlePinch(event) {
        this.mapInteraction = {
            mode: 'pinch',
            lastPoint: { ...event.point }
        };
        this.cameraController.pan(event.delta);
        if (Number.isFinite(event.scale) && Math.abs(event.scale - 1) > 0.01) {
            this.cameraController.zoom(event.scale, event.point);
        }
        this.#renderCameraChange();
    }

    #handleWheel(event) {
        const zoomSpeed = 0.001;
        const factor = 1 - event.deltaY * zoomSpeed;
        this.cameraController.zoom(Math.max(0.1, Math.min(2, factor)), event.point);
        this.#renderCameraChange();
        this.cameraController.save?.();
    }

    #handleBodyHover(event) {
        const body = this.#findHoveredBody(event.point);
        if (body?.items?.length > 0) {
            this.uiController.showStarInfo?.(body, event.displayPoint ?? event.point);
            return;
        }

        this.uiController.hideStarInfo?.();
    }

    #endMapInteraction() {
        if (this.mapInteraction?.mode !== 'aim') {
            this.cameraController?.save?.();
        }
        this.mapInteraction = null;
    }

    #resolveMapInteractionMode(event) {
        if (event.shiftKey || event.ctrlKey) {
            return 'pan';
        }

        if (!this.cameraController.isInMapArea(event.point)) {
            return 'rotate';
        }

        if (this.#canAim()) {
            return 'aim';
        }

        return 'pan';
    }

    #findHoveredBody(screenPoint) {
        if (!this.currentSector || !this.cameraController) {
            return null;
        }

        const worldPoint = this.cameraController.toWorld(screenPoint);
        const hitMargin = this.gameDataRepository.getMapConstants().STAR_HIT_MARGIN;
        const zoomLevel = this.cameraController.zoomLevel || 1;

        return this.currentSector.bodies.findLast(body => {
            const distance = Math.hypot(
                worldPoint.x - body.position.x,
                worldPoint.y - body.position.y
            );
            return distance <= body.radius + hitMargin / zoomLevel;
        }) ?? null;
    }

    #canAim() {
        const selection = this.buildFlowController.currentBuildSelection;
        return !!(selection.rocket && selection.launcher && this.currentSector);
    }

    #updateLaunchAngle(screenPoint) {
        const home = this.currentSector?.bodies?.find(body => body.isHome);
        if (!home) {
            return;
        }

        const worldPoint = this.cameraController.toWorld(screenPoint);
        this.currentLaunchAngle = Math.atan2(
            worldPoint.y - home.position.y,
            worldPoint.x - home.position.x
        );
        this.#refreshPredictionPath();
    }

    #renderCameraChange() {
        this.worldRenderer?.render?.();
    }

    #refreshPredictionPath() {
        if (!this.#canAim() || !this.trajectoryPredictor) {
            this.worldRenderer?.clearPredictionPath?.();
            this.worldRenderer?.clearAimRocket?.();
            this.worldRenderer?.disableSonar?.();
            this.worldRenderer?.render?.();
            return;
        }

        const previewRocket = this.#createPreviewRocketFromFlightSelection();
        if (!previewRocket) {
            this.worldRenderer?.clearPredictionPath?.();
            this.worldRenderer?.clearAimRocket?.();
            this.worldRenderer?.disableSonar?.();
            this.worldRenderer?.render?.();
            return;
        }

        previewRocket.velocity = previewRocket.getInitialVelocity(this.sessionState.returnBonus);
        const predictedRocket = this.trajectoryPredictor.predictPath(previewRocket, this.currentSector);
        const predictionPath = this.#createPredictionPath(previewRocket, predictedRocket.actualTrail);

        this.worldRenderer?.setAimRocket?.(previewRocket);
        this.worldRenderer?.enableSonar?.();
        this.worldRenderer?.setPredictionPath?.(predictionPath);
    }

    #createPredictionPath(previewRocket, predictedTrail) {
        if (!Array.isArray(predictedTrail) || predictedTrail.length === 0) {
            throw new Error('[GameController] AIM-ready prediction must return at least one trail point.');
        }

        const path = [
            previewRocket.position,
            ...predictedTrail
        ];
        return path;
    }

    #createPreviewRocketFromFlightSelection() {
        const selection = this.buildFlowController.currentBuildSelection;
        const rocketItem = this.#peekSelectedStack(selection.rocket, 'rocket');
        const launcher = this.#peekSelectedStack(selection.launcher, 'launcher');
        const booster = selection.booster
            ? this.#peekSelectedStack(selection.booster, 'booster')
            : null;

        if (!rocketItem || !launcher) {
            return null;
        }

        return new Rocket(
            rocketItem,
            launcher,
            booster,
            this.currentLaunchAngle,
            this.#getLaunchPosition(this.currentLaunchAngle)
        );
    }

    #peekSelectedStack(uid, category) {
        if (!uid) {
            return null;
        }

        const stack = this.sessionState.inventory.getItemsByCategory(category)
            .find(candidate => candidate.uid === uid);
        return stack?.items?.at(-1) ?? null;
    }
}

export default GameController;
