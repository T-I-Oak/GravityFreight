import itemsData from '../assets/data/items.json';
import storiesData from '../assets/data/content_stories.json';
import achievementsData from '../assets/data/content_achievements.json';
import uiData from '../assets/data/content_ui.json';
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

const APP_COPYRIGHT = {
    holder: 'T.I.OAK',
    year: '2026',
    portal: 'GameWorks OAK',
    portalUrl: 'https://t-i-oak.github.io/GameWorksOAK/'
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
        this.content = {
            ...storiesData,
            ...achievementsData,
            ...uiData
        };
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
            homeStarPosition: { ...this.config.mapConstants.HOME_STAR_POSITION },
            placementLimitRadius: 700,
            minBodyDistance: this.config.mapConstants.MIN_STAR_DISTANCE,
            placementAttemptLimit: this.config.mapConstants.PLACEMENT_ATTEMPT_LIMIT,
            homeStarRadius: this.config.mapConstants.HOME_STAR_RADIUS,
            homeStarMass: this.config.mapConstants.HOME_STAR_MASS,
            starRadiusMin: this.config.mapConstants.STAR_RADIUS_MIN,
            starRadiusMax: this.config.mapConstants.STAR_RADIUS_MAX,
            starDefaultRadius: this.config.mapConstants.STAR_DEFAULT_RADIUS,
            simulationTickSeconds: this.config.gameBalance.SIMULATION_TICK_SECONDS,
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
        return this.expandLanguageResource(item);
    }

    getItemDefinitionsByCategory(category) {
        this.#ensureLoaded();
        return this.expandLanguageResource(this.items[category] || []);
    }

    getAllItemDefinitions() {
        this.#ensureLoaded();
        return this.expandLanguageResource(Object.values(this.items).flat());
    }

    getFacilityDefinition(idOrType) {
        this.#ensureLoaded();
        const facility = this.config.facilities[idOrType]
            || Object.values(this.config.facilities).find(candidate => candidate.id === idOrType);
        if (!facility) {
            throw new Error(`[GameDataRepository] Facility not found: ${idOrType}`);
        }
        return this.expandLanguageResource(facility);
    }

    getStoryContent(id) {
        this.#ensureLoaded();
        return this.expandLanguageResource(this.#requiredById(this.content.stories, id, 'Story'));
    }

    getStoryIds() {
        this.#ensureLoaded();
        return Object.keys(this.content.stories || {});
    }

    getHowToPlayContent() {
        this.#ensureLoaded();
        return this.expandLanguageResource(this.content.howToPlay || []);
    }

    getAchievementDefinitions() {
        this.#ensureLoaded();
        return this.expandLanguageResource(Object.values(this.content.achievements || {}));
    }

    getAchievementDefinition(id) {
        this.#ensureLoaded();
        return this.expandLanguageResource(this.#requiredById(this.content.achievements, id, 'Achievement'));
    }

    getUiText(path) {
        this.#ensureLoaded();
        return this.expandLanguageResource(this.#requiredByPath(this.content.ui, path, 'UI text'));
    }

    getGameBalance() {
        this.#ensureLoaded();
        return this.config.gameBalance;
    }

    getMapConstants() {
        this.#ensureLoaded();
        return this.config.mapConstants;
    }

    getRaritySettings() {
        this.#ensureLoaded();
        return this.config.rarity;
    }

    getRarityPrices() {
        this.#ensureLoaded();
        return { ...this.config.rarityPrices };
    }

    getAppMetadata() {
        return {
            version: packageData.version,
            copyright: { ...APP_COPYRIGHT }
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

    #requiredByPath(source, path, label) {
        const value = path.split('.').reduce((current, key) => current?.[key], source);
        if (value === undefined) {
            throw new Error(`[GameDataRepository] ${label} not found: ${path}`);
        }
        return value;
    }
}

export default GameDataRepository;
