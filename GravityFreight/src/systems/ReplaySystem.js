import { StorageUtils } from '../utils/StorageUtils.js';

export class ReplaySystem {
    constructor(game) {
        this.game = game;
        this.STORAGE_KEY = 'gravity_freight_replays';
        this.MAX_AUTO_RECORDS = 10;
        this.MAX_FAVORITES = 5;
        this.DATA_VERSION = '1.2.0';

        this.records = this._loadRecords();
    }

    _loadRecords() {
        const data = StorageUtils.get(this.STORAGE_KEY);
        if (data && Array.isArray(data.records)) {
            // 将来的なマイグレーションが必要な場合はここで処理
            // if (data.version !== this.DATA_VERSION) { ... }
            return data.records;
        }

        return [];
    }

    _saveRecords() {
        StorageUtils.set(this.STORAGE_KEY, {
            version: this.DATA_VERSION,
            records: this.records
        });
    }

    /**
     * 新しいリプレイ記録を追加する
     * @param {number} score 獲得スコア
     * @param {object} recordData フライト再現に必要なシードやパラメータデータ
     * @returns {object|null} 記録が完了した場合は作成されたレコードオブジェクト、TOP10枠外で破棄された場合は null
     */
    addRecord(score, recordData) {
        const newRecord = {
            id: `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            score: score,
            isFavorite: false,
            recordData: recordData
        };

        // 仮追加してソート
        this.records.push(newRecord);
        this._sortRecords();

        // 刈り込み処理
        const wasKept = this._pruneRecords(newRecord.id);

        if (wasKept) {
            this._saveRecords();
            return newRecord;
        }
        
        return null; // Top10外かつお気に入りでもないので破棄された
    }

    /**
     * トップ10圏外でも、手動で直接お気に入りとしてレコードを追加する
     * @param {number} score 獲得スコア
     * @param {object} recordData フライト再現に必要なシードやパラメータデータ
     * @returns {string|null} 成功時はレコードID、お気に入り上限に達している場合は null
     */
    saveAsFavorite(score, recordData) {
        const currentFavoritesCount = this.records.filter(r => r.isFavorite).length;
        if (currentFavoritesCount >= this.MAX_FAVORITES) {
            return null; // 上限到達
        }

        const newRecord = {
            id: `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            score: score,
            isFavorite: true,
            recordData: recordData
        };

        this.records.push(newRecord);
        this._sortRecords();
        this._pruneRecords(newRecord.id);
        this._saveRecords();
        
        return newRecord.id;
    }

    /**
     * 全レコードをスコア降順、同スコアなら日時降順（新しい順）で取得する
     */
    getRecords() {
        return [...this.records];
    }

    /**
     * 特定のレコードのお気に入り状態をトグルする
     * @param {string} id レコードID
     * @returns {boolean} トグルに成功した場合はtrue、お気に入り上限に達していてONに失敗した場合はfalse
     */
    toggleFavorite(id) {
        const record = this.records.find(r => r.id === id);
        if (!record) return false;

        // OFF -> ON の場合の上限チェック
        if (!record.isFavorite) {
            const currentFavoritesCount = this.records.filter(r => r.isFavorite).length;
            if (currentFavoritesCount >= this.MAX_FAVORITES) {
                return false; // 上限到達
            }
            record.isFavorite = true;
        } else {
            // ON -> OFF
            record.isFavorite = false;
        }

        this._saveRecords();
        return true;
    }

    /**
     * 手動でレコードを削除する
     */
    deleteRecord(id) {
        const idx = this.records.findIndex(r => r.id === id);
        if (idx !== -1) {
            this.records.splice(idx, 1);
            this._saveRecords();
            return true;
        }
        return false;
    }

    _sortRecords() {
        this.records.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // スコア降順
            }
            return b.timestamp - a.timestamp; // スコアが同じなら新しい順
        });
    }

    /**
     * レコードの刈り込み(Top 10維持、お気に入りは別枠保護)
     * @param {string} newlyAddedId 新しく追加されたレコードID。これが消されたか判定するため
     * @returns {boolean} 新規追加されたレコードが生き残ったかどうか
     */
    _pruneRecords(newlyAddedId) {
        // お気に入りではないレコードだけを「自動記録の対象」としてTop10に残す。
        // もしくは、「全体の中でTop10」を自動記録とし、そこから漏れたものでも「お気に入り」なら残す。
        // 要件: 「高いものから最大10回分のプレイを自動記録する」「お気に入りは自動削除の対象外になる」
        // 最も素直な解釈：【お気に入りでない一般レコード】をスコア順で最大10件残す

        const favorites = this.records.filter(r => r.isFavorite);
        const autoRecords = this.records.filter(r => !r.isFavorite);

        // autoRecords はすでに _sortRecords() によりスコア降順にソートされているはず
        const keptAutoRecords = autoRecords.slice(0, this.MAX_AUTO_RECORDS);

        this.records = [...favorites, ...keptAutoRecords];
        this._sortRecords(); // 再度マージしてソート

        // 新規追加されたIDが残っているか？
        return this.records.some(r => r.id === newlyAddedId);
    }
}
