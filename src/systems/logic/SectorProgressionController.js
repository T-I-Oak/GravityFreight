import Sector from '../world/Sector.js';

class SectorProgressionController {
    constructor(infrastructure = {}) {
        this.gameDataRepository = infrastructure.gameDataRepository;
        this.sessionState = infrastructure.sessionState;
        this.economySystem = infrastructure.economySystem;
        this.gameRecordTracker = infrastructure.gameRecordTracker;
        this.rankTracker = infrastructure.rankTracker;
        this.achievementTracker = infrastructure.achievementTracker;
        this.uiController = infrastructure.uiController;
        this.worldRenderer = infrastructure.worldRenderer;
        this.sectorFactory = infrastructure.sectorFactory || (({ sessionState, isAnomaly }) => (
            new Sector(sessionState, isAnomaly, this.gameDataRepository, this.economySystem)
        ));
    }

    checkGameOverAndStartEndSequence(context = {}) {
        const gameOver = this.economySystem.checkGameOver(this.sessionState);
        if (!gameOver) {
            return false;
        }

        const gameResult = this.sessionState.getGameResultSummary({
            completedSectors: context.completedSectors ?? this.sessionState.sectorNumber
        });
        const updatedRecordKeys = this.gameRecordTracker.recordGameResult(gameResult);
        const achievements = updatedRecordKeys.length > 0
            ? this.achievementTracker.evaluateAchievements({ source: 'game_record', keys: updatedRecordKeys })
            : [];
        const ranks = this.rankTracker?.recordGameResult?.(gameResult) ?? null;

        this.uiController.showGameEndSequence?.(gameResult, gameOver, {
            achievements,
            ranks
        });
        return true;
    }

    async beginSectorTransition(options = {}) {
        this.sessionState.incrementSector();
        const sector = this.sectorFactory({
            sessionState: this.sessionState,
            isAnomaly: options.isAnomaly ?? false
        });

        const updatedRecordKeys = this.gameRecordTracker.recordSectorStart(this.sessionState);
        if (updatedRecordKeys.length > 0) {
            this.achievementTracker.evaluateAchievements({
                source: 'game_record',
                keys: updatedRecordKeys
            });
        }

        this.worldRenderer?.setSector?.(sector);
        this.uiController.updateHUDValue?.('sector', this.sessionState.sectorNumber);
        this.uiController.showSectorTitle?.(this.sessionState.sectorNumber, sector.isAnomaly);
        this.uiController.showBuildScreen?.();
        this.uiController.setFlightMode?.(false);

        return sector;
    }
}

export default SectorProgressionController;
