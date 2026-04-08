export class RankingUI {
    constructor(game, uiSystem) {
        this.game = game;
        this.uiSystem = uiSystem;
        this.currentCategory = 'score';
        
        this._isInitialized = false;
    }

    _ensureInitialized() {
        if (this._isInitialized) return;
        
        this.overlay = document.getElementById('ranking-overlay');
        if (!this.overlay) return; // DOMがない環境（テスト等）では中断

        this.listContainer = document.getElementById('ranking-list-container');
        this._setupListeners();
        this._isInitialized = true;
    }

    _setupListeners() {
        if (!this.overlay) return;
        // タブ切り替え
        const tabs = this.overlay.querySelectorAll('.ranking-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const cat = tab.getAttribute('data-category');
                this.switchCategory(cat);
                this.game.audioSystem.playTick();
            });
        });

        // 閉じるボタン
        const closeBtn = document.getElementById('close-ranking-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
                this.game.audioSystem.playTick();
            });
        }
    }

    show() {
        this._ensureInitialized();
        if (!this.overlay) return;
        this.overlay.classList.remove('hidden');
        this.switchCategory('score'); // デフォルトはスコア
    }

    hide() {
        this._ensureInitialized();
        if (!this.overlay) return;
        this.overlay.classList.add('hidden');
    }

    switchCategory(category) {
        this._ensureInitialized();
        if (!this.overlay) return;
        this.currentCategory = category;
        
        // タブの表示更新
        const tabs = this.overlay.querySelectorAll('.ranking-tab-btn');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-category') === category);
        });

        this.render();
    }

    render() {
        this._ensureInitialized();
        if (!this.listContainer) return;
        const rankings = this.game.rankingSystem.getRankings(this.currentCategory);
        this.listContainer.innerHTML = '';

        // テーブルヘッダーの追加
        const header = document.createElement('div');
        header.className = 'ranking-header-row';
        header.innerHTML = `
            <div class="col-rank">RANK</div>
            <div class="col-score">FINAL SCORE</div>
            <div class="col-sector">SECTOR</div>
            <div class="col-items">ITEMS</div>
            <div class="col-date">MISSION DATE</div>
        `;
        this.listContainer.appendChild(header);

        if (rankings.length === 0) {
            this.listContainer.innerHTML += '<div class="no-data-msg">NO MISSION RECORDS FOUND</div>';
            return;
        }

        const isScore = this.currentCategory === 'score';
        const isSector = this.currentCategory === 'sector';
        const isCollected = this.currentCategory === 'collected';

        rankings.forEach((entry, index) => {
            const rank = index + 1;
            const div = document.createElement('div');
            div.className = `ranking-entry rank-${rank <= 3 ? rank : 'normal'} stagger-in`;
            div.style.animationDelay = `${index * 0.04}s`;

            div.innerHTML = `
                <div class="col-rank rank-number">${rank}</div>
                <div class="col-score val-main ${isScore ? 'active' : ''}">${entry.score.toLocaleString()}</div>
                <div class="col-sector val-sub ${isSector ? 'active' : ''}">${entry.sector}</div>
                <div class="col-items val-sub ${isCollected ? 'active' : ''}">${entry.collected}</div>
                <div class="col-date val-date">${entry.date}</div>
            `;
            this.listContainer.appendChild(div);
        });
    }
}
