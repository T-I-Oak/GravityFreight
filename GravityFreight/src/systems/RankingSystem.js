export class RankingSystem {
    constructor(game) {
        this.game = game;
        this.STORAGE_KEY = 'gravity_freight_rankings';
        this.MAX_ENTRIES = 20;
        this.DATA_VERSION = '0.30.0';

        this.data = this._loadRankings();
    }

    _loadRankings() {
        try {
            if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
                const data = localStorage.getItem(this.STORAGE_KEY);
                if (data) {
                    const parsed = JSON.parse(data);
                    // バージョンチェック
                    if (parsed && parsed.version === this.DATA_VERSION && Array.isArray(parsed.entries)) {
                        return parsed;
                    }
                }
            }
        } catch (e) {
            console.error('Failed to load rankings:', e);
        }

        return {
            version: this.DATA_VERSION,
            entries: []
        };
    }

    _saveRankings() {
        try {
            if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
            }
        } catch (e) {
            console.error('Failed to save rankings:', e);
        }
    }

    _getFormattedDate() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return `${y}/${m}/${d} ${hh}:${mm}`;
    }

    /**
     * 新しい記録を一式追加し、不要な（どのカテゴリでも圏外の）記録を削除する
     * @param {Object} metrics { score, sector, collected }
     * @returns {Object} { scoreRank: 1-indexed, sectorRank: 1-indexed, collectedRank: 1-indexed }
     */
    addEntry(metrics) {
        const entry = {
            score: metrics.score || 0,
            sector: metrics.sector || 0,
            collected: metrics.collected || 0,
            date: this._getFormattedDate()
        };

        this.data.entries.push(entry);
        
        // データの整理（どのカテゴリでも上位に入っていないものを削除）
        this._pruneEntries();
        
        this._saveRankings();

        // 整理後のリストでランクを計算
        return {
            scoreRank: this.checkRank('score', entry.score),
            sectorRank: this.checkRank('sector', entry.sector),
            collectedRank: this.checkRank('collected', entry.collected)
        };
    }

    /**
     * いずれかのカテゴリでTOP20に入っていないエントリを削除し、データ肥大化を防ぐ
     */
    _pruneEntries() {
        const categories = ['score', 'sector', 'collected'];
        const keepSet = new Set();

        categories.forEach(cat => {
            const sortedIndices = this.data.entries
                .map((e, index) => ({ val: e[cat] || 0, index }))
                .sort((a, b) => b.val - a.val)
                .slice(0, this.MAX_ENTRIES);
            
            sortedIndices.forEach(item => keepSet.add(item.index));
        });

        // 保持すべきインデックス以外を削除した新しい配列を作成
        this.data.entries = this.data.entries.filter((_, index) => keepSet.has(index));
    }

    /**
     * 指定したカテゴリでソートされたランキングを取得する
     * @param {string} category 'score', 'sector', 'collected'
     */
    getRankings(category) {
        // pruneされているため、このリストには「いずれかで上位に入っているもの」しか残っていない
        // その中から指定カテゴリでソートして提示
        const sorted = [...this.data.entries].sort((a, b) => {
            const valA = a[category] || 0;
            const valB = b[category] || 0;
            if (valB !== valA) return valB - valA;
            // 同値なら日付が新しい順
            // YYYY/MM/DD HH:mm 形式なので文字列の辞書順比較で新しい方が大きくなる
            if (b.date > a.date) return 1;
            if (b.date < a.date) return -1;
            return 0;
        });
        return sorted.slice(0, this.MAX_ENTRIES);
    }

    /**
     * 特定の値が現在何位に相当するか確認する
     * 判定基準: 値の降順、同じ値の場合は日付の降順（新しい順）
     */
    checkRank(category, value) {
        if (value <= 0) return null;

        const sorted = this.getRankings(category);
        // 今回の値を仮に含めて、そのインデックスを探すのではない。
        // getRankings はすでに prune済みのデータに対してソートされている。
        // そのため、対象の値が「現在の上位20件」の中でどこに位置するかを正確に判定する。
        
        let rank = -1;
        for (let i = 0; i < sorted.length; i++) {
            const entryVal = sorted[i][category] || 0;
            // 降順ソートなので、今回の値がエントリ値以上になった最初の場所が順位。
            // (同じ値の場合は、最新のものが上位に来る前提なので、最初に見つかった場所でOK)
            if (value >= entryVal) {
                rank = i + 1;
                break;
            }
        }

        // リストを走査して見つからなかったが、リストに空きがある場合は最後尾に入る
        if (rank === -1 && sorted.length < this.MAX_ENTRIES) {
            rank = sorted.length + 1;
        }

        return (rank > 0 && rank <= this.MAX_ENTRIES) ? rank : null;
    }
}
