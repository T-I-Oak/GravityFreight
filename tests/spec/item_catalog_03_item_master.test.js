import { describe, it, expect, beforeAll, vi } from 'vitest';
import GameDataRepository from '../../src/core/GameDataRepository.js';
import itemCatalogRequirement from '../../docs/requirements/item_catalog.md?raw';

const NUMERIC_KEYS = [
    'mass',
    'slots',
    'power',
    'precision',
    'pickupRange',
    'precisionMultiplier',
    'pickupMultiplier',
    'gravityMultiplier',
    'powerMultiplier',
    'arcMultiplier',
    'maxCharges',
    'score',
    'coinDiscount',
    'duration'
];

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

function getDocumentedItemIds() {
    const chapter3 = itemCatalogRequirement.split('## 3. アイテム一覧管理表')[1];

    return [...chapter3.matchAll(/`([a-z0-9_]+)`/g)].map(match => match[1]).sort();
}

describe('item_catalog.md chapter 3: item master table', () => {
    it('keeps the documented item table and item master data in sync by id', () => {
        const documentedIds = getDocumentedItemIds();
        const dataIds = repository.getAllItemDefinitions().map(item => item.id).sort();

        expect(dataIds).toEqual(documentedIds);
    });

    it('keeps item ids unique across all categories', () => {
        const dataIds = repository.getAllItemDefinitions().map(item => item.id);

        expect(new Set(dataIds).size).toBe(dataIds.length);
    });

    it('uses known rarity values and finite numeric properties in item master data', () => {
        const rarityIds = Object.keys(repository.getRaritySettings()).map(value => value.toLowerCase());

        repository.getAllItemDefinitions().forEach(item => {
            expect(rarityIds).toContain(item.rarity);

            NUMERIC_KEYS.forEach(key => {
                if (item[key] !== undefined) {
                    expect(Number.isFinite(item[key])).toBe(true);
                }
            });
        });
    });
});
