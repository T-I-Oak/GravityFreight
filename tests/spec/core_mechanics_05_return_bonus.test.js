import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../src/core/GameDataRepository.js';
import Item from '../../src/systems/entities/Item.js';
import Rocket from '../../src/systems/entities/Rocket.js';
import RocketItem from '../../src/systems/entities/RocketItem.js';
import SessionState from '../../src/systems/entities/SessionState.js';

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

function item(id) {
    return new Item(id, repository);
}

function createRocket() {
    return new Rocket(
        new RocketItem(item('hull_medium'), item('sensor_normal'), []),
        item('pad_standard_d2'),
        null,
        0
    );
}

describe('core_mechanics.md chapter 5: return bonus', () => {
    it('defines return bonus as a 10 percent launch power increment per home return', () => {
        expect(repository.getGameBalance().RETURN_BONUS_INCREMENT).toBe(0.1);
    });

    it('accumulates return bonus on repeated home returns in the same sector', () => {
        const session = new SessionState(repository);
        session.initialize();

        session.applySettlement({ status: 'returned' });
        session.applySettlement({ status: 'returned' });

        expect(session.returnBonus).toBeCloseTo(0.2);
    });

    it('preserves return bonus after crashed or lost settlements in the same sector', () => {
        const session = new SessionState(repository);
        session.initialize();
        session.applySettlement({ status: 'returned' });

        session.applySettlement({ status: 'crashed' });
        session.applySettlement({ status: 'lost' });

        expect(session.returnBonus).toBeCloseTo(0.1);
    });

    it('resets return bonus when the next sector starts after mission success', () => {
        const session = new SessionState(repository);
        session.initialize();
        session.applySettlement({ status: 'returned' });

        session.incrementSector();

        expect(session.returnBonus).toBe(0);
    });

    it('applies return bonus to launch initial velocity calculations', () => {
        const rocket = createRocket();
        const baseVelocity = rocket.getInitialVelocity(0);
        const boostedVelocity = rocket.getInitialVelocity(0.2);

        expect(boostedVelocity.x).toBeCloseTo(baseVelocity.x * 1.2);
        expect(boostedVelocity.y).toBeCloseTo(0);
    });
});
