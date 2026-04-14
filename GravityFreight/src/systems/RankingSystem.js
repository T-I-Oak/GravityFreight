import { StorageUtils } from '../utils/StorageUtils.js';

export class RankingSystem {
    constructor(game) {
        this.game = game;
        this.STORAGE_KEY = 'gravity_freight_rankings';
        this.MAX_ENTRIES = 20;
        this.DATA_VERSION = '1.2.0';

        this.data = this._loadRankings();
    }

    _loadRankings() {
        const data = StorageUtils.get(this.STORAGE_KEY);
        
        if (data && Array.isArray(data.entries)) {
            // バージョンが古い場合のマイグレーション
            if (data.version !== this.DATA_VERSION) {
                data.entries.forEach(entry => {
                    if (entry.date && !entry.timestamp) {
                        entry.timestamp = new Date(entry.date).getTime();
                        delete entry.date;
                    }
                });
                data.version = this.DATA_VERSION;
            }
            return data;
        }

        return {
            version: this.DATA_VERSION,
            entries: []
        };
    }

    _saveRankings() {
        StorageUtils.set(this.STORAGE_KEY, this.data);
    }

    /**
     * 表示用の日時フォーマット（UI側で呼び出す）
     * @param {number} timestamp 
     * @returns {string} YYYY/MM/DD HH:MM
     */
    formatDate(timestamp) {
        if (!timestamp) return '';
        const now = new Date(timestamp);
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return `${y}/${m}/${d} ${hh}:${mm}`;
    }

    /**
     * 新しい記録を一式追加し、不要な（どのカテゴリでも圏外の）記録を削除する
     * @param {Object} metrics { score, sector, collected, timestamp (省略時は現在時刻) }
     * @returns {Object} { scoreRank: 1-indexed, sectorRank: 1-indexed, collectedRank: 1-indexed }
     */
    addEntry(metrics) {
        const entry = {
            score: metrics.score !== undefined ? metrics.score : 0,
            sector: metrics.sector !== undefined ? metrics.sector : 0,
            collected: metrics.collected !== undefined ? metrics.collected : 0,
            timestamp: metrics.timestamp !== undefined ? metrics.timestamp : Date.now()
        };

        this.data.entries.push(entry);
        this.latestEntryTimestamp = entry.timestamp;
        
        // データの整理（どのカテゴリでも上位に入っていないものを削除）
        this._pruneEntries();
        
        this._saveRankings();

        // 整理後のリストでランクを計算
        const ranks = {
            scoreRank: this.checkRank('score', entry.score, entry.timestamp),
            sectorRank: this.checkRank('sector', entry.sector, entry.timestamp),
            collectedRank: this.checkRank('collected', entry.collected, entry.timestamp)
        };
        
        return ranks;
    }

    /**
     * いずれかのカテゴリでTOP20に入っていないエントリを削除し、データ肥大化を防ぐ
     */
    _pruneEntries() {
        // 全カテゴリのランキングを取得し、それらに含まれるエントリのみを保持
        const keepSet = new Set();
        const categories = ['score', 'sector', 'collected'];
        
        categories.forEach(cat => {
            const sorted = this.getRankings(cat);
            sorted.forEach(entry => {
                // オブジェクトの参照で管理（またはIDがあればID）
                keepSet.add(entry);
            });
        });

        // 保持すべきエントリ以外を削除した新しい配列を作成
        this.data.entries = this.data.entries.filter(entry => keepSet.has(entry));
    }

    /**
     * 指定したカテゴリでソートされたランキングを取得する
     * @param {string} category 'score', 'sector', 'collected'
     */
    getRankings(category) {
        // 降順ソート
        const sorted = [...this.data.entries].sort((a, b) => {
            const valA = a[category] || 0;
            const valB = b[category] || 0;
            if (valB !== valA) return valB - valA;
            // 同値なら日付が新しい順 (降順)
            const timeA = a.timestamp || 0;
            const timeB = b.timestamp || 0;
            if (timeB > timeA) return 1;
            if (timeB < timeA) return -1;
            return 0;
        });
        return sorted.slice(0, this.MAX_ENTRIES);
    }

    /**
     * 特定の値が現在何位に相当するか確認する
     * 判定基準: 値の降順、同じ値の場合は日付の降順（新しい順）
     * @param {string} category
     * @param {number} value
     * @param {number} timestamp 今回の値の日付（最新判定用）
     */
    checkRank(category, value, timestamp) {
        const currentRankings = this.getRankings(category);
        
        // すでにランキングに含まれているエントリの中から一致するものを探す
        const index = currentRankings.findIndex(e => (e[category] || 0) === value && e.timestamp === timestamp);
        
        if (index !== -1) {
            return index + 1;
        }

        // 含まれていない場合（まだ addEntry されていないテスト時など）
        // 降順ソートなので、今回の値がエントリ値以上になった最初の場所が順位。
        let rank = -1;
        for (let i = 0; i < currentRankings.length; i++) {
            const entryVal = currentRankings[i][category] || 0;
            if (value > entryVal) {
                rank = i + 1;
                break;
            } else if (value === entryVal) {
                // 同値の場合は日付（今回は最新と仮定）で新しい方が上
                rank = i + 1;
                break;
            }
        }

        if (rank === -1 && currentRankings.length < this.MAX_ENTRIES) {
            rank = currentRankings.length + 1;
        }

        return (rank > 0 && rank <= this.MAX_ENTRIES) ? rank : null;
    }
}
