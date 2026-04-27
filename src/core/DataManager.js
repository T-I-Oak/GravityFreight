import itemsData from '../assets/data/items.json';
import contentData from '../assets/data/content.json';
import configData from '../assets/data/config.json';

/**
 * DataManager
 * 静的マスタデータへの統一アクセスインターフェース。
 */
class DataManager {
    // --- Items API ---

    /**
     * @param {string} id
     * @throws {Error} IDが存在しない場合
     */
    static getItemById(id) {
        // 全カテゴリをフラットにして検索
        const item = this.getAllItems().find(i => i.id === id);
        if (!item) {
            throw new Error(`[DataManager] Item not found: ${id}`);
        }
        return item;
    }

    static getItemsByCategory(category) {
        return itemsData[category] || [];
    }

    static getAllItems() {
        return Object.values(itemsData).flat();
    }

    // --- Facilities API ---

    static getFacilityById(id) {
        return Object.values(configData.facilities).find(f => f.id === id);
    }

    // --- Content API ---

    static getStoryById(id) {
        return contentData.stories[id];
    }

    static getAchievementById(id) {
        return contentData.achievements[id];
    }

    static getAllAchievements() {
        return Object.values(contentData.achievements);
    }

    // --- Configuration API ---

    static getGameBalance() {
        return configData.gameBalance;
    }

    static getMapConstants() {
        return configData.mapConstants;
    }

    static getRaritySettings() {
        return configData.rarity;
    }

    // --- Setup API ---

    static getInitialSetup() {
        return configData.initialSetup;
    }
}

export default DataManager;
