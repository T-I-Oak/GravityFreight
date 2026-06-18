import { describe, it, expect, vi, beforeEach } from 'vitest';
import SectorProgressionController from '../../../../src/systems/logic/SectorProgressionController.js';

function createController() {
    const sessionState = {
        sectorNumber: 3,
        incrementSector: vi.fn(() => {
            sessionState.sectorNumber += 1;
        }),
        getGameResultSummary: vi.fn(() => ({
            totalScore: 3200,
            totalCoins: 90,
            completedSectors: 3,
            reachedSector: 3,
            collectedItemCount: 4
        }))
    };
    const economySystem = {
        checkGameOver: vi.fn(() => null)
    };
    const gameRecordTracker = {
        recordSectorStart: vi.fn(() => ['max_reached_sector']),
        recordGameResult: vi.fn(() => ['lifetime_contracts'])
    };
    const rankTracker = {
        recordGameResult: vi.fn(() => ({ scoreRank: 1, sectorRank: 2, collectedRank: 3 }))
    };
    const achievementTracker = {
        evaluateAchievements: vi.fn(() => [{ achievementId: 'contract', tier: 1 }])
    };
    const uiController = {
        updateHUDValue: vi.fn(),
        showSectorTitle: vi.fn(),
        showBuildScreen: vi.fn(),
        setFlightMode: vi.fn(),
        showGameEndSequence: vi.fn()
    };
    const worldRenderer = {
        setSector: vi.fn(),
        playGameEndExitAnimation: vi.fn()
    };
    const sectorFactory = vi.fn(({ sessionState: currentSession, isAnomaly }) => ({
        sectorNumber: currentSession.sectorNumber,
        isAnomaly,
        luckyDiscountRate: 0
    }));
    const controller = new SectorProgressionController({
        sessionState,
        economySystem,
        gameRecordTracker,
        rankTracker,
        achievementTracker,
        uiController,
        worldRenderer,
        sectorFactory
    });

    return {
        controller,
        sessionState,
        economySystem,
        gameRecordTracker,
        rankTracker,
        achievementTracker,
        uiController,
        worldRenderer,
        sectorFactory
    };
}

describe('SectorProgressionController', () => {
    let context;

    beforeEach(() => {
        context = createController();
    });

    it('starts the next sector and updates sector-start records', async () => {
        const sector = await context.controller.beginSectorTransition({ isAnomaly: true });

        expect(context.sessionState.sectorNumber).toBe(4);
        expect(context.sectorFactory).toHaveBeenCalledWith({
            sessionState: context.sessionState,
            isAnomaly: true
        });
        expect(sector).toMatchObject({
            sectorNumber: 4,
            isAnomaly: true,
            luckyDiscountRate: 0
        });
        expect(context.gameRecordTracker.recordSectorStart).toHaveBeenCalledWith(context.sessionState);
        expect(context.achievementTracker.evaluateAchievements).toHaveBeenCalledWith({
            source: 'game_record',
            keys: ['max_reached_sector']
        });
        expect(context.worldRenderer.setSector).toHaveBeenCalledWith(sector);
        expect(context.uiController.updateHUDValue).toHaveBeenCalledWith('sector', 4);
        expect(context.uiController.showSectorTitle).toHaveBeenCalledWith(4, true);
        expect(context.uiController.showBuildScreen).not.toHaveBeenCalled();
        expect(context.uiController.setFlightMode).not.toHaveBeenCalled();
    });

    it('returns false when the session can continue', () => {
        expect(context.controller.checkGameOverAndStartEndSequence({ completedSectors: 3 })).toBe(false);
        expect(context.uiController.showGameEndSequence).not.toHaveBeenCalled();
    });

    it('records game-end achievements and rankings when the final game-end flow starts', () => {
        const gameOver = { reason: 'NO_PARTS_REMAINING', details: ['LAUNCHER'] };
        context.economySystem.checkGameOver.mockReturnValue(gameOver);

        const ended = context.controller.checkGameOverAndStartEndSequence({ completedSectors: 3 });

        expect(ended).toBe(true);
        expect(context.sessionState.getGameResultSummary).toHaveBeenCalledWith({
            completedSectors: 3
        });
        const gameResult = context.sessionState.getGameResultSummary.mock.results.at(-1).value;
        expect(context.gameRecordTracker.recordGameResult).toHaveBeenCalledWith(gameResult);
        expect(context.rankTracker.recordGameResult).toHaveBeenCalledWith(gameResult);
        expect(gameResult.rankings).toEqual({ scoreRank: 1, sectorRank: 2, collectedRank: 3 });
        expect(context.worldRenderer.playGameEndExitAnimation).toHaveBeenCalledTimes(1);
        expect(context.uiController.showGameEndSequence).toHaveBeenCalledWith(gameResult, gameOver, {
            achievements: [{ achievementId: 'contract', tier: 1 }]
        });
    });
});
