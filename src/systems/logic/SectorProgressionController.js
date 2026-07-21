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
        const rankings = this.rankTracker.recordGameResult(gameResult);
        gameResult.rankings = rankings;
        const achievements = updatedRecordKeys.length > 0
            ? this.achievementTracker.evaluateAchievements({ source: 'game_record', keys: updatedRecordKeys })
            : [];
        this.uiController.showAchievementToasts?.(achievements);

        this.worldRenderer?.startWarpEffect?.(3200, { direction: 'reverse' });
        this.uiController.showGameEndSequence?.(gameResult, gameOver, {
            achievements
        });
        return true;
    }

    async beginSectorTransition(options = {}) {
        this.sessionState.incrementSector();
        const isAnomaly = options.isAnomaly ?? (this.sessionState.sectorNumber % 5 === 0);
        const sector = this.sectorFactory({
            sessionState: this.sessionState,
            isAnomaly
        });

        const updatedRecordKeys = this.gameRecordTracker.recordSectorStart(this.sessionState);
        if (updatedRecordKeys.length > 0) {
            const achievements = this.achievementTracker.evaluateAchievements({
                source: 'game_record',
                keys: updatedRecordKeys
            });
            this.uiController.showAchievementToasts?.(achievements);
        }

        this.worldRenderer?.setSector?.(sector);
        this.uiController.updateHUDValue?.('sector', this.sessionState.sectorNumber);
        this.uiController.showSectorTitle?.(
            this.sessionState.sectorNumber,
            sector.isAnomaly,
            { type: options.sectorTitleType ?? 'default' }
        );

        return sector;
    }
}

export default SectorProgressionController;
