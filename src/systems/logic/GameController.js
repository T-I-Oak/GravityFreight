const FACILITY_THEME_CLASSES = {
    TRADING_POST: 'trading-post',
    REPAIR_DOCK: 'repair-dock',
    BLACK_MARKET: 'black-market'
};

const FACILITY_LABELS = {
    TRADING_POST: 'TRADING POST',
    REPAIR_DOCK: 'REPAIR DOCK',
    BLACK_MARKET: 'BLACK MARKET'
};

class GameController {
    constructor(infrastructure = {}) {
        this.gameDataRepository = infrastructure.gameDataRepository;
        this.sessionState = infrastructure.sessionState;
        this.economySystem = infrastructure.economySystem;
        this.gameRecordTracker = infrastructure.gameRecordTracker;
        this.achievementTracker = infrastructure.achievementTracker;
        this.flightRecorder = infrastructure.flightRecorder;
        this.storySystem = infrastructure.storySystem;
        this.uiController = infrastructure.uiController;
        this.worldRenderer = infrastructure.worldRenderer;
        this.currentSector = null;
        this.currentRocket = null;
    }

    async handleNavigationEnd(result) {
        if (!this.currentRocket || !this.currentSector) {
            throw new Error('[GameController] currentRocket and currentSector are required.');
        }

        const flightData = this.currentRocket.getFlightResult();
        const settlement = this.economySystem.calculateSettlement(result, flightData, this.sessionState);
        this.sessionState.applySettlement(settlement);

        if (settlement.unlockedBranchId) {
            this.storySystem.unlockNextStep(settlement.unlockedBranchId);
        }

        const resultContext = this.#createFlightResultContext(settlement);
        const replayRecord = this.flightRecorder.recordFlightResult(resultContext);
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
                recorded: !!replayRecord,
                favorite: !!replayRecord?.favorite,
                pending: !replayRecord && !!pendingRecord
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
}

export default GameController;
