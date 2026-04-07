import { GOAL_COLORS, hexToRgba, STORY_DATA } from '../../core/Data.js';
import { UIAnimations } from './UIAnimations.js';

export class HUDManager {
    constructor(game, uiSystem) {
        this.game = game;
        this.uiSystem = uiSystem;
    }

    /**
     * 数値アニメーションの更新。UISystem.update から呼ばれる。
     */
    update(dt) {
        const game = this.game;
        const scoreDiff = game.score - game.displayScore;
        const coinDiff = game.coins - game.displayCoins;

        let needsUpdate = false;
        if (Math.abs(scoreDiff) > 0.1 || Math.abs(coinDiff) > 0.1) {
            if (!game.isAnimatingScore) game.displayScore += scoreDiff * 0.1;
            if (!game.isAnimatingCoins) game.displayCoins += coinDiff * 0.1;
            needsUpdate = true;
        } else if (game.displayScore !== game.score || game.displayCoins !== game.coins) {
            game.displayScore = game.score;
            game.displayCoins = game.coins;
            needsUpdate = true;
        }

        if (needsUpdate) {
            this.refreshHUD();
        }
    }

    /**
     * HUD表示の即時同期
     */
    refreshHUD() {
        const game = this.game;
        const scoreDisplay = document.getElementById('score-display');
        const coinDisplay = document.getElementById('coin-display');
        const sectorDisplay = document.getElementById('sector-display');
        const eventCoinDisplay = document.getElementById('event-player-credits');
        
        if (scoreDisplay) scoreDisplay.textContent = Math.floor(game.displayScore || 0).toLocaleString();
        if (coinDisplay) coinDisplay.textContent = Math.floor(game.displayCoins || 0).toLocaleString();
        if (eventCoinDisplay) eventCoinDisplay.textContent = Math.floor(game.displayCoins || 0).toLocaleString();
        if (sectorDisplay) sectorDisplay.textContent = game.sector;
        
        this.updateMailIcons();
    }

    /**
     * メールアイコンの状態とテーマカラーの更新
     */
    updateMailIcons() {
        const game = this.game;
        const sessionStories = game.storySystem.sessionUnlocked;
        
        for (let i = 0; i < 3; i++) {
            const btn = document.getElementById(`mail-btn-${i}`);
            if (!btn) continue;
            const id = sessionStories[i];

            btn.classList.remove('unread', 'gray');
            btn.style.color = '';
            btn.style.borderColor = '';
            btn.style.boxShadow = '';

            if (id) {
                btn.disabled = false;
                const branch = id.charAt(i).toUpperCase();
                const goalKey = branch === 'T' ? 'TRADING_POST' : (branch === 'R' ? 'REPAIR_DOCK' : 'BLACK_MARKET');
                const color = GOAL_COLORS[goalKey];
                
                btn.style.color = color;
                btn.style.borderColor = color;
                btn.style.boxShadow = `0 0 15px ${hexToRgba(color, 0.2)}`;
                btn.classList.toggle('unread', !game.storySystem.isRead(id));
            } else {
                btn.disabled = true;
                btn.classList.add('gray');
            }
        }
    }

    /**
     * ストーリー表示のリスナー設定
     */
    setupStoryListeners() {
        for (let i = 0; i < 3; i++) {
            const btn = document.getElementById(`mail-btn-${i}`);
            if (btn) {
                btn.onclick = () => {
                    const id = this.game.storySystem.sessionUnlocked[i];
                    if (id) this.showStoryModal(id);
                };
            }
        }

        const closeBtn = document.getElementById('close-story-btn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.getElementById('story-overlay').classList.add('hidden');
            };
        }
    }

    /**
     * ストーリーモーダルの表示
     */
    showStoryModal(storyId) {
        const story = STORY_DATA[storyId];
        if (!story) return;

        const overlay = document.getElementById('story-overlay');
        const title = document.getElementById('story-title');
        const discovery = document.getElementById('story-discovery');
        const content = document.getElementById('story-content');
        const branchIcon = document.getElementById('story-branch-icon');

        if (overlay && branchIcon) {
            const branch = story.branch; // 'T', 'R', or 'B'
            const goalKey = branch === 'T' ? 'TRADING_POST' : (branch === 'R' ? 'REPAIR_DOCK' : 'BLACK_MARKET');
            
            // Data.js の定義（施設と同一）に完全に同期させる
            const color = GOAL_COLORS[goalKey]; 

            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            
            overlay.style.setProperty('--story-color', color);
            // 施設側の背景透過度 0.2 に完全に同期
            overlay.style.setProperty('--story-color-alpha', hexToRgba(color, 0.2));
            overlay.style.setProperty('--story-color-rgb', `${r}, ${g}, ${b}`);
            
            branchIcon.textContent = branch;
            title.textContent = story.title;
            discovery.textContent = story.discovery;
            content.innerHTML = story.content.replace(/\n/g, '<br>');

            overlay.classList.remove('hidden');
            this.game.storySystem.markAsRead(storyId);
            this.updateMailIcons(); 
        }
    }

    /**
     * 数値の増減アニメーション
     */
    animateCoinChange(amount) {
        const game = this.game;
        if (amount === 0) return;
        const creditsEl = document.getElementById('event-player-credits');
        const hudCoinsEl = document.getElementById('coin-display');
        const startVal = game.displayCoins;
        const endVal = game.displayCoins + amount;
        const ANIMATION_DURATION = 0.5;

        if (creditsEl) this.animateValue(creditsEl, startVal, endVal, ANIMATION_DURATION);
        if (hudCoinsEl) this.animateValue(hudCoinsEl, startVal, endVal, ANIMATION_DURATION);

        if (creditsEl && creditsEl.offsetParent !== null) {
            creditsEl.classList.add('pulse');
            setTimeout(() => creditsEl.classList.remove('pulse'), 300);
        } else if (hudCoinsEl) {
            hudCoinsEl.classList.add('pulse');
            setTimeout(() => hudCoinsEl.classList.remove('pulse'), 300);
        }
    }

    animateValue(el, start, end, duration) {
        UIAnimations.animateValue(el, start, end, duration, (val) => {
            if (el.id === 'coin-display' || el.id === 'event-player-credits') this.game.displayCoins = val;
            else if (el.id === 'score-display' || el.id === 'score-total') this.game.displayScore = val;
        });
    }
}
