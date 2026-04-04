export class RankingSystem {
    constructor(game) {
        this.game = game;
        this.STORAGE_KEY = 'gravity_freight_rankings';
        this.MAX_ENTRIES = 20;

        this.rankings = this._loadRankings();
    }

    _loadRankings() {
        try {
            if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
                const data = localStorage.getItem(this.STORAGE_KEY);
                if (data) {
                    return JSON.parse(data);
                }
            }
        } catch (e) {
            console.error('Failed to load rankings:', e);
        }

        // 初期化
        return {
            sector: [],
            score: [],
            collected: []
        };
    }

    _saveRankings() {
        try {
            if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.rankings));
            }
        } catch (e) {
            console.error('Failed to save rankings:', e);
        }
    }

    /**
     * 新しい記録を追加する
     * @param {string} category 'sector', 'score', 'collected'
     * @param {number} value 値
     * @returns {Object|null} ランクインした場合は { rank: 1-based index, isBest: boolean }、そうでなければ null
     */
    addEntry(category, value) {
        if (!this.rankings[category]) return null;

        const list = this.rankings[category];
        const date = new Date().toISOString();
        
        // 追加
        list.push({ value, date });

        // 降順ソート
        list.sort((a, b) => b.value - a.value);

        // Top 20 に制限
        const wasInTop = list.findIndex(e => e.value === value && e.date === date);
        if (list.length > this.MAX_ENTRIES) {
            list.splice(this.MAX_ENTRIES);
        }

        const rankAfterTrim = list.findIndex(e => e.value === value && e.date === date);

        this._saveRankings();

        if (rankAfterTrim !== -1) {
            return {
                rank: rankAfterTrim + 1,
                isBest: rankAfterTrim === 0
            };
        }
        return null;
    }

    getRankings(category) {
        return this.rankings[category] || [];
    }

    /**
     * 特定の値が何位に相当するか確認する（保存はしない）
     */
    checkRank(category, value) {
        const list = this.rankings[category];
        const dummyList = [...list, { value }];
        dummyList.sort((a, b) => b.value - a.value);
        const rank = dummyList.findIndex(e => e.value === value);
        
        if (rank < this.MAX_ENTRIES) {
            return rank + 1;
        }
        return null;
    }
}
