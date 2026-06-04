import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameDataRepository from '../../../src/core/GameDataRepository.js';
import packageData from '../../../package.json';

function createCommonDataManagerStub() {
    return {
        getSavedData: vi.fn((key, migrationMap) => migrationMap.init()),
        setSavedData: vi.fn()
    };
}

describe('GameDataRepository', () => {
    let commonDataManager;
    let expandLanguageResource;
    let repository;

    beforeEach(() => {
        commonDataManager = createCommonDataManagerStub();
        expandLanguageResource = vi.fn(value => value);
        repository = new GameDataRepository(commonDataManager, { expandLanguageResource });
    });

    it('loads static master data before access', async () => {
        await repository.loadAllData();

        const setup = repository.getInitialSetup();

        expect(setup.initialCoins).toBe(200);
        expect(setup.initialInventory).toEqual(['hull_medium', 'sensor_normal', 'pad_standard_d2']);
    });

    it('maps existing config data to MasterConfigData names', async () => {
        await repository.loadAllData();

        const config = repository.getMasterConfig();

        expect(config.baseCelestialCount).toBe(5);
        expect(config.boundaryRadius).toBe(900);
        expect(config.placementLimitRadius).toBe(700);
        expect(config.minBodyDistance).toBe(180);
        expect(config.homeStarRadius).toBe(25);
        expect(config.homeStarMass).toBe(4000);
        expect(config.starRadiusMin).toBeCloseTo(16.14213562373095);
        expect(config.starRadiusMax).toBeCloseTo(30.284271247461902);
        expect(config.starDefaultRadius).toBe(20);
        expect(config.arcFacilityWidths).toEqual({
            TRADING_POST: 60,
            REPAIR_DOCK: 40,
            BLACK_MARKET: 20
        });
        expect(config.arcMaxExpansion).toBe(2.0);
        expect(config.arcMinMargin).toBe(5);
    });

    it('returns item definitions and throws for unknown ids', async () => {
        await repository.loadAllData();

        expect(repository.getItemDefinition('hull_light').id).toBe('hull_light');
        expect(() => repository.getItemDefinition('missing_item')).toThrow('[GameDataRepository] Item not found: missing_item');
    });

    it('returns i18n-expanded story, how-to-play, and achievement content', async () => {
        expandLanguageResource.mockImplementation(value => ({ expanded: value }));
        await repository.loadAllData();

        expect(repository.getStoryContent('T')).toHaveProperty('expanded');
        expect(repository.getHowToPlayContent()).toHaveProperty('expanded');
        expect(repository.getAchievementDefinitions()).toHaveProperty('expanded');
        expect(expandLanguageResource).toHaveBeenCalled();
    });

    it('returns story ids without exposing story content data', async () => {
        await repository.loadAllData();

        expect(repository.getStoryIds()).toEqual(expect.arrayContaining(['T', 'TR', 'TRB']));
        expect(repository.getStoryIds()).not.toContain('missing');
    });

    it('returns app metadata from package version', async () => {
        await repository.loadAllData();

        expect(repository.getAppMetadata()).toEqual({
            version: packageData.version,
            copyright: expect.any(String)
        });
    });

    it('provides item master data by id, category, and full list', async () => {
        await repository.loadAllData();

        expect(repository.getItemDefinition('hull_light').id).toBe('hull_light');
        expect(repository.getItemDefinitionsByCategory('chassis').length).toBeGreaterThan(0);
        expect(repository.getAllItemDefinitions().length).toBeGreaterThan(0);
        expect(repository.getItemDefinitionsByCategory('missing_category')).toEqual([]);
    });

    it('provides facility definitions by short id or facility type', async () => {
        await repository.loadAllData();

        expect(repository.getFacilityDefinition('T')).toMatchObject({
            id: 'T',
            type: 'TRADING_POST',
            className: 'trading-post'
        });
        expect(repository.getFacilityDefinition('REPAIR_DOCK')).toMatchObject({
            id: 'R',
            type: 'REPAIR_DOCK',
            className: 'repair-dock'
        });
        expect(() => repository.getFacilityDefinition('missing')).toThrow('[GameDataRepository] Facility not found: missing');
    });

    it('provides individual and full achievement definitions', async () => {
        await repository.loadAllData();

        expect(repository.getAchievementDefinition('stat_total_coins')).toMatchObject({
            id: 'stat_total_coins',
            source: 'game_record',
            key: 'total_earned_coins',
            condition: 'max',
            label: expect.any(String)
        });
        expect(repository.getAchievementDefinitions().length).toBeGreaterThan(0);
    });

    it('provides raw configuration sections used by game systems', async () => {
        await repository.loadAllData();

        expect(repository.getGameBalance()).toHaveProperty('DEFAULT_SHIP_MASS');
        expect(repository.getMapConstants()).toHaveProperty('BOUNDARY_RADIUS');
        expect(repository.getRaritySettings()).toHaveProperty('COMMON');
    });

    it('delegates user data reads and writes to common DataManager keys', () => {
        const migrationMap = { init: () => ({ ok: true }) };
        const data = { value: 1 };

        expect(repository.getSavedSEVolume(migrationMap)).toEqual({ ok: true });
        repository.setSavedSEVolume(data);
        repository.getSavedCameraState(migrationMap);
        repository.setSavedCameraState(data);
        repository.getSavedStoryProgress(migrationMap);
        repository.setSavedStoryProgress(data);
        repository.getSavedGameRecordData(migrationMap);
        repository.setSavedGameRecordData(data);
        repository.getSavedRankData(migrationMap);
        repository.setSavedRankData(data);
        repository.getSavedFlightRecordIndex(migrationMap);
        repository.setSavedFlightRecordIndex(data);

        expect(commonDataManager.getSavedData).toHaveBeenCalledWith('se_volume', migrationMap);
        expect(commonDataManager.getSavedData).toHaveBeenCalledWith('camera_state', migrationMap);
        expect(commonDataManager.getSavedData).toHaveBeenCalledWith('story_progress', migrationMap);
        expect(commonDataManager.getSavedData).toHaveBeenCalledWith('game_record_data', migrationMap);
        expect(commonDataManager.getSavedData).toHaveBeenCalledWith('rank_data', migrationMap);
        expect(commonDataManager.getSavedData).toHaveBeenCalledWith('flight_record_index', migrationMap);

        expect(commonDataManager.setSavedData).toHaveBeenCalledWith('se_volume', data);
        expect(commonDataManager.setSavedData).toHaveBeenCalledWith('camera_state', data);
        expect(commonDataManager.setSavedData).toHaveBeenCalledWith('story_progress', data);
        expect(commonDataManager.setSavedData).toHaveBeenCalledWith('game_record_data', data);
        expect(commonDataManager.setSavedData).toHaveBeenCalledWith('rank_data', data);
        expect(commonDataManager.setSavedData).toHaveBeenCalledWith('flight_record_index', data);
    });

    it('does not access localStorage directly', () => {
        const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
        const migrationMap = { init: () => ({}) };

        repository.getSavedGameRecordData(migrationMap);
        repository.setSavedGameRecordData({});

        expect(getItemSpy).not.toHaveBeenCalled();
        expect(setItemSpy).not.toHaveBeenCalled();

        getItemSpy.mockRestore();
        setItemSpy.mockRestore();
    });
});
