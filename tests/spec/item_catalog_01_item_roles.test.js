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

function definitions(category) {
    return repository.getItemDefinitionsByCategory(category);
}

function expectPositiveNumber(value) {
    expect(Number.isFinite(value)).toBe(true);
    expect(value).toBeGreaterThan(0);
}

describe('item_catalog.md chapter 1: item categories and roles', () => {
    it('defines every role category used by rocket building, launch, and collection', () => {
        const categories = ['chassis', 'logic', 'module', 'launcher', 'booster', 'coin', 'cargo'];

        categories.forEach(category => {
            const items = definitions(category);

            expect(items.length).toBeGreaterThan(0);
            items.forEach(item => {
                expect(item.category).toBe(category);
                expect(item.id).toMatch(/^[a-z0-9_]+$/);
                expect(item.name).toBeTruthy();
                expect(item.rarity).toBeTruthy();
                expect(item.description).toBeTruthy();
            });
        });
    });

    it('keeps rocket components as permanent build parts with structural mass', () => {
        definitions('chassis').forEach(item => {
            expectPositiveNumber(item.mass);
            expectPositiveNumber(item.slots);
        });

        definitions('logic').forEach(item => {
            expectPositiveNumber(item.mass);
            expect(
                item.precisionMultiplier !== undefined
                || item.pickupRange !== undefined
                || item.pickupMultiplier !== undefined
                || item.gravityMultiplier !== undefined
            ).toBe(true);
        });

        definitions('module').forEach(item => {
            expectPositiveNumber(item.mass);
            expect(item.category).toBe('module');
        });
    });

    it('keeps launch gears separate from rocket structural components', () => {
        definitions('launcher').forEach(item => {
            expectPositiveNumber(item.power);
            expectPositiveNumber(item.maxCharges);
            expect(item.mass).toBeUndefined();
            expect(item.slots).toBeUndefined();
        });

        definitions('booster').forEach(item => {
            expect(item.mass).toBeUndefined();
            expect(item.slots).toBeUndefined();
        });
    });

    it('keeps collected resources out of rocket and launch gear stats', () => {
        definitions('coin').forEach(item => {
            expectPositiveNumber(item.score);
            expect(item.mass).toBeUndefined();
            expect(item.power).toBeUndefined();
            expect(item.maxCharges).toBeUndefined();
        });

        definitions('cargo').forEach(item => {
            expect(
                item.deliveryGoalId !== undefined
                || item.coinDiscount !== undefined
            ).toBe(true);
            expect(item.mass).toBeUndefined();
            expect(item.power).toBeUndefined();
            expect(item.maxCharges).toBeUndefined();
        });
    });
});
