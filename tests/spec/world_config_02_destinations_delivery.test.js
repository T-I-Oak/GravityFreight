import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../src/core/GameDataRepository.js';

let repository;

beforeAll(async () => {
    repository = new GameDataRepository({
        getSavedData: vi.fn(),
        setSavedData: vi.fn()
    }, {
        expandLanguageResource: value => value
    });
    await repository.loadAllData();
});

describe('world_config.md chapter 2: destinations and cargo delivery', () => {
    it('defines exit arc widths and facility arrival rewards', () => {
        const config = repository.getMasterConfig();

        expect(config.arcFacilityWidths).toEqual({
            TRADING_POST: 60,
            REPAIR_DOCK: 40,
            BLACK_MARKET: 20
        });

        expect(repository.getFacilityDefinition('TRADING_POST')).toMatchObject({
            rewardScore: 2000,
            rewardCoins: 20,
            bonusItemCount: 1
        });
        expect(repository.getFacilityDefinition('REPAIR_DOCK')).toMatchObject({
            rewardScore: 3000,
            rewardCoins: 30,
            bonusItemCount: 2
        });
        expect(repository.getFacilityDefinition('BLACK_MARKET')).toMatchObject({
            rewardScore: 5000,
            rewardCoins: 50,
            bonusItemCount: 3
        });
    });

    it('defines matched and unmatched cargo delivery reward values', () => {
        const balance = repository.getGameBalance();

        expect(balance.DELIVERY_REWARD).toEqual({ SCORE: 1500, COINS: 100 });
        expect(balance.UNMATCHED_DELIVERY_REWARD).toEqual({ SCORE: 0, COINS: 10 });
    });

    it('maps deliverable cargo to the matching destination and keeps lucky cargo destination-free', () => {
        expect(repository.getItemDefinition('cargo_safe')).toMatchObject({
            category: 'cargo',
            deliveryGoalId: 'TRADING_POST'
        });
        expect(repository.getItemDefinition('cargo_normal')).toMatchObject({
            category: 'cargo',
            deliveryGoalId: 'REPAIR_DOCK'
        });
        expect(repository.getItemDefinition('cargo_danger')).toMatchObject({
            category: 'cargo',
            deliveryGoalId: 'BLACK_MARKET'
        });
        expect(repository.getItemDefinition('cargo_lucky')).toMatchObject({
            category: 'cargo',
            coinDiscount: 0.1
        });
        expect(repository.getItemDefinition('cargo_lucky').deliveryGoalId).toBeUndefined();
        expect(repository.getGameBalance().MAX_COIN_DISCOUNT).toBe(0.5);
    });
});
