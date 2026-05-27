import itemsData from '../assets/data/items.json';
import contentData from '../assets/data/content.json';
import configData from '../assets/data/config.json';
import packageData from '../../package.json';
import { expandLanguageResource as defaultExpandLanguageResource } from '../../../GameWorksOAK/src/lib/core/i18n.js';

const SAVE_KEYS = {
    seVolume: 'se_volume',
    cameraState: 'camera_state',
    storyProgress: 'story_progress',
    gameRecordData: 'game_record_data',
    rankData: 'rank_data',
    flightRecordIndex: 'flight_record_index'
};

const ARC_FACILITY_WIDTHS = {
    TRADING_POST: 60,
    REPAIR_DOCK: 40,
    BLACK_MARKET: 20
};

class GameDataRepository {
    constructor(commonDataManager, i18nAdapter = {}) {
        if (!commonDataManager) {
            throw new Error('[GameDataRepository] commonDataManager is required.');
        }

        this.commonDataManager = commonDataManager;
        this.expandLanguageResource = i18nAdapter.expandLanguageResource || defaultExpandLanguageResource;
        this.loaded = false;
        this.items = null;
        this.content = null;
        this.config = null;
    }

    async loadAllData() {
        this.items = itemsData;
        this.content = contentData;
        this.config = configData;
        this.loaded = true;
    }

    getInitialSetup() {
        this.#ensureLoaded();
        return this.config.initialSetup;
    }

    getMasterConfig() {
        this.#ensureLoaded();
        return {
            baseCelestialCount: 5,
            boundaryRadius: this.config.mapConstants.BOUNDARY_RADIUS,
            placementLimitRadius: 700,
            minBodyDistance: this.config.mapConstants.MIN_STAR_DISTANCE,
            homeStarRadius: this.config.mapConstants.HOME_STAR_RADIUS,
            homeStarMass: this.config.mapConstants.HOME_STAR_MASS,
            arcFacilityWidths: { ...ARC_FACILITY_WIDTHS },
            arcMaxExpansion: 2.0,
            arcMinMargin: 5
        };
    }

    getItemDefinition(id) {
        this.#ensureLoaded();
        const item = Object.values(this.items).flat().find(candidate => candidate.id === id);
        if (!item) {
            throw new Error(`[GameDataRepository] Item not found: ${id}`);
        }
        return item;
    }

    getStoryContent(id) {
        this.#ensureLoaded();
        return this.expandLanguageResource(this.#requiredById(this.content.stories, id, 'Story'));
    }

    getHowToPlayContent() {
        this.#ensureLoaded();
        return this.expandLanguageResource(this.content.howToPlay || []);
    }

    getAchievementDefinitions() {
        this.#ensureLoaded();
        return this.expandLanguageResource(Object.values(this.content.achievements || {}));
    }

    getAppMetadata() {
        return {
            version: packageData.version,
            copyright: 'Copyright (c) GameWorks OAK'
        };
    }

    getSavedSEVolume(migrationMap) {
        return this.#getSaved(SAVE_KEYS.seVolume, migrationMap);
    }

    setSavedSEVolume(data) {
        this.#setSaved(SAVE_KEYS.seVolume, data);
    }

    getSavedCameraState(migrationMap) {
        return this.#getSaved(SAVE_KEYS.cameraState, migrationMap);
    }

    setSavedCameraState(data) {
        this.#setSaved(SAVE_KEYS.cameraState, data);
    }

    getSavedStoryProgress(migrationMap) {
        return this.#getSaved(SAVE_KEYS.storyProgress, migrationMap);
    }

    setSavedStoryProgress(data) {
        this.#setSaved(SAVE_KEYS.storyProgress, data);
    }

    getSavedGameRecordData(migrationMap) {
        return this.#getSaved(SAVE_KEYS.gameRecordData, migrationMap);
    }

    setSavedGameRecordData(data) {
        this.#setSaved(SAVE_KEYS.gameRecordData, data);
    }

    getSavedRankData(migrationMap) {
        return this.#getSaved(SAVE_KEYS.rankData, migrationMap);
    }

    setSavedRankData(data) {
        this.#setSaved(SAVE_KEYS.rankData, data);
    }

    getSavedFlightRecordIndex(migrationMap) {
        return this.#getSaved(SAVE_KEYS.flightRecordIndex, migrationMap);
    }

    setSavedFlightRecordIndex(data) {
        this.#setSaved(SAVE_KEYS.flightRecordIndex, data);
    }

    #getSaved(key, migrationMap) {
        return this.commonDataManager.getSavedData(key, migrationMap);
    }

    #setSaved(key, data) {
        this.commonDataManager.setSavedData(key, data);
    }

    #ensureLoaded() {
        if (!this.loaded) {
            throw new Error('[GameDataRepository] loadAllData() must be called before accessing master data.');
        }
    }

    #requiredById(source, id, label) {
        const value = source?.[id];
        if (!value) {
            throw new Error(`[GameDataRepository] ${label} not found: ${id}`);
        }
        return value;
    }
}

export default GameDataRepository;
