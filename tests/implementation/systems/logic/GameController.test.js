import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameController from '../../../../src/systems/logic/GameController.js';

function createSettlement(overrides = {}) {
    return {
        status: 'cleared',
        destination: 'TRADING_POST',
        unlockedBranchId: 'T',
        totalScore: 3260,
        totalCoins: 30,
        luckyDiscountRate: 0.2,
        flightTicks: 260,
        entries: [
            { label: 'Flight Duration', score: 260 },
            { label: 'Goal Bonus', score: 3000, coin: 30 }
        ],
        itemReport: [],
        acquiredItems: [{ id: 'bonus_item' }],
        lostToTarget: null,
        ...overrides
    };
}

function createController(settlement = createSettlement()) {
    const gameDataRepository = {
        getUiText: vi.fn(key => ({
            'flightResult.titles.cleared': 'SECTOR {sector} COMPLETED',
            'flightResult.titles.returned': 'ROCKET RECOVERED',
            'flightResult.titles.crashed': 'SHIP CRASHED',
            'flightResult.titles.lost': 'LOST IN SPACE',
            'flightResult.titles.complete': 'FLIGHT COMPLETE',
            'flightResult.actions.toFacility': 'TO {facility}',
            'flightResult.actions.backToBase': 'BACK TO BASE',
            'flightResult.actions.continue': 'CONTINUE'
        })[key])
    };
    const currentRocket = {
        getFlightResult: vi.fn(() => ({
            ticks: 260,
            distance: 1400,
            heldCargo: [],
            rocketItem: { id: 'rocket_item' }
        }))
    };
    const currentSector = { luckyDiscountRate: 0 };
    const sessionState = {
        sectorNumber: 3,
        applySettlement: vi.fn(),
        getGameResultSummary: vi.fn(() => ({
            totalScore: 3260,
            totalCoins: 30,
            completedSectors: 1,
            reachedSector: 3,
            totalFlightTicks: 260,
            collectedItemCount: 1
        }))
    };
    const economySystem = {
        calculateSettlement: vi.fn(() => settlement)
    };
    const gameRecordTracker = {
        recordFlightResult: vi.fn(() => ['total_launches', 'total_score'])
    };
    const achievementTracker = {
        evaluateAchievements: vi.fn(() => [{ achievementId: 'stat_launches', tier: 3, value: 20 }])
    };
    const flightRecorder = {
        recordFlightResult: vi.fn(() => ({ id: 'flight_1', favorite: false })),
        getPendingRecord: vi.fn(() => null)
    };
    const storySystem = {
        unlockNextStep: vi.fn(),
        getStoryStatus: vi.fn(() => [{ id: 'T', type: 'T', isUnread: true }])
    };
    const uiController = {
        showResultScreen: vi.fn()
    };
    const worldRenderer = {
        disableSonar: vi.fn(),
        playFinishAnimation: vi.fn(() => Promise.resolve())
    };

    const controller = new GameController({
        sessionState,
        economySystem,
        gameRecordTracker,
        achievementTracker,
        flightRecorder,
        storySystem,
        uiController,
        worldRenderer,
        gameDataRepository
    });
    controller.currentRocket = currentRocket;
    controller.currentSector = currentSector;

    return {
        controller,
        currentRocket,
        currentSector,
        sessionState,
        economySystem,
        gameRecordTracker,
        achievementTracker,
        flightRecorder,
        storySystem,
        uiController,
        worldRenderer,
        gameDataRepository
    };
}

describe('GameController', () => {
    let context;

    beforeEach(() => {
        context = createController();
    });

    it('settles navigation end and shows a flight result view model', async () => {
        const collision = { type: 'arc', target: { getFacilityType: () => 'TRADING_POST' } };

        const viewData = await context.controller.handleNavigationEnd(collision);

        expect(context.currentRocket.getFlightResult).toHaveBeenCalled();
        expect(context.economySystem.calculateSettlement).toHaveBeenCalledWith(
            collision,
            expect.objectContaining({ ticks: 260 }),
            context.sessionState
        );
        expect(context.sessionState.applySettlement).toHaveBeenCalledWith(expect.objectContaining({ status: 'cleared' }));
        expect(context.storySystem.unlockNextStep).toHaveBeenCalledWith('T');
        expect(context.flightRecorder.recordFlightResult).toHaveBeenCalledWith({
            resultType: 'cleared',
            score: 3260,
            totalScore: 3260,
            reachedSector: 3,
            destinationType: 'TRADING_POST'
        });
        expect(context.gameRecordTracker.recordFlightResult).toHaveBeenCalledWith({
            completedSectors: 1,
            distance: 1400,
            score: 3260,
            earnedCoins: 30,
            collectedItemCount: 1
        });
        expect(context.achievementTracker.evaluateAchievements).toHaveBeenCalledWith({
            source: 'game_record',
            keys: ['total_launches', 'total_score']
        });
        expect(context.worldRenderer.disableSonar).toHaveBeenCalled();
        expect(context.worldRenderer.playFinishAnimation).toHaveBeenCalledWith(collision);
        expect(context.uiController.showResultScreen).toHaveBeenCalledWith(viewData);
        expect(viewData).toMatchObject({
            title: 'SECTOR 3 COMPLETED',
            status: 'cleared',
            themeClass: 'trading-post',
            actionLabel: 'TO TRADING POST',
            totalScore: 3260,
            totalCoins: 30,
            replay: {
                recorded: true,
                favorite: false,
                pending: false
            },
            achievements: [{ achievementId: 'stat_launches', tier: 3, value: 20 }],
            storyStatus: [{ id: 'T', type: 'T', isUnread: true }],
            storyCards: [{ id: 'T', type: 'T', isUnread: true }]
        });
    });

    it('keeps rejected replay records as pending in the result view', async () => {
        const { controller, flightRecorder } = createController(createSettlement({
            status: 'lost',
            destination: null,
            unlockedBranchId: null,
            totalScore: 260,
            totalCoins: 0
        }));
        flightRecorder.recordFlightResult.mockReturnValue(null);
        flightRecorder.getPendingRecord.mockReturnValue({ id: 'pending_1', favorite: false });

        const viewData = await controller.handleNavigationEnd({ type: 'boundary' });

        expect(viewData).toMatchObject({
            title: 'LOST IN SPACE',
            status: 'lost',
            themeClass: 'home',
            actionLabel: 'BACK TO BASE',
            replay: {
                recorded: false,
                favorite: false,
                pending: true
            }
        });
    });

    it('requires current rocket and sector before navigation end', async () => {
        context.controller.currentRocket = null;

        await expect(context.controller.handleNavigationEnd({ type: 'arc' }))
            .rejects
            .toThrow('[GameController] currentRocket and currentSector are required.');
    });
});
