import { ITEM_REGISTRY, PARTS } from './Data.js';

/**
 * DataManager
 * V2におけるすべての静的マスタデータへのアクセスポイント。
 * Phase 1: Data.js のラッパーとして実装。
 */
class DataManager {
    /**
     * IDに一致するアイテム定義を取得する。
     * @param {string} id アイテムID
     * @returns {Object} ItemDefinition
     * @throws {Error} IDが見つからない場合
     */
    static getItemById(id) {
        const item = ITEM_REGISTRY[id];
        if (!item) {
            throw new Error(`[DataManager] Item not found: ${id}`);
        }
        return item;
    }

    /**
     * 指定されたカテゴリのアイテムリストを取得する。
     * @param {string} category カテゴリ名
     * @returns {Object[]} ItemDefinition[]
     */
    static getItemsByCategory(category) {
        return PARTS[category] || [];
    }

    /**
     * 全アイテムのリストを取得する。
     * @returns {Object[]} ItemDefinition[]
     */
    static getAllItems() {
        return Object.values(PARTS).flat();
    }
}

export default DataManager;
