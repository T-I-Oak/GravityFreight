/**
 * LocalStorage へのアクセスをカプセル化し、例外処理および JSON パースを自動化するユーティリティクラス。
 */
export class StorageUtils {
    /**
     * 保存された値を取得します。
     * @param {string} key 保存キー
     * @param {*} defaultValue 値が存在しない、またはパースに失敗した場合のデフォルト値
     * @returns {*} 保存されていた値
     */
    static get(key, defaultValue = null) {
        try {
            const saved = localStorage.getItem(key);
            if (saved === null) return defaultValue;
            return JSON.parse(saved);
        } catch (e) {
            console.warn(`[StorageUtils] Failed to get/parse key "${key}":`, e);
            return defaultValue;
        }
    }

    /**
     * 値を JSON 形式で保存します。
     * @param {string} key 保存キー
     * @param {*} value 保存する値
     * @returns {boolean} 保存に成功したかどうか
     */
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`[StorageUtils] Failed to set key "${key}":`, e);
            return false;
        }
    }

    /**
     * 指定したキーのデータを削除します。
     * @param {string} key 削除キー
     * @returns {boolean} 削除に成功したかどうか
     */
    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`[StorageUtils] Failed to remove key "${key}":`, e);
            return false;
        }
    }

    /**
     * 生の文字列として値を取得します（JSON パースしない）。
     * @param {string} key 保存キー
     * @returns {string|null}
     */
    static getRaw(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            return null;
        }
    }

    /**
     * 生の文字列として値を保存します（JSON 化しない）。
     * @param {string} key 保存キー
     * @param {string} value 保存する文字列
     */
    static setRaw(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            console.error(`[StorageUtils] Failed to set raw key "${key}":`, e);
        }
    }
}
