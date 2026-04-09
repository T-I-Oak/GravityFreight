import { GOAL_COLORS, GOAL_NAMES, hexToRgba } from '../core/Data.js';

export class FacilityEventSystem {
    constructor(game) {
        this.game = game;
    }

    handleEvent(goal) {
        const game = this.game;
        const screen = document.getElementById('event-screen');
        if (!screen) return;
        game.setState('event');
        
        // 割引率は MissionSystem.resolveItems によって航行終了時に確定済み

        // パネルを最小化してイベント画面を見やすくする
        document.getElementById('terminal-panel')?.classList.add('collapsed');

        const title = document.getElementById('event-location');
        const desc = document.getElementById('event-description');
        const content = document.getElementById('event-content');
        title.textContent = GOAL_NAMES[goal.id];
        const icon = document.getElementById('event-icon');
        const color = GOAL_COLORS[goal.id] || '#888';
        if (icon) {
            // 施設のイメージカラーを直接使用
            const deepColor = color; 

            icon.style.setProperty('--shop-color', deepColor);
            icon.style.setProperty('--shop-bg', hexToRgba(deepColor, 0.2));
            
            const initials = { 'TRADING_POST': 'T', 'REPAIR_DOCK': 'R', 'BLACK_MARKET': 'B' };
            icon.textContent = initials[goal.id] || '';
        }

        if (goal.id === 'TRADING_POST') {
            desc.textContent = '貨物取引やパーツの売買ができる中継基地。';
            game.uiSystem.initTradingPost(content);
        } else if (goal.id === 'REPAIR_DOCK') {
            desc.textContent = '機体の整備やパーツの解体・強化を行える高度な設備。';
            game.uiSystem.initRepairDock(content);
        } else if (goal.id === 'BLACK_MARKET') {
            game.currentStarCount++;
            desc.textContent = '通常は流通しない希少なパーツや、性能が強化された一点物のパーツが取引される取引所。';
            game.uiSystem.initBlackMarket(content);
        }
        const btn = document.getElementById('event-continue-btn');
        if (btn) {
            btn.onclick = () => {
                game.audioSystem.playTick();
                this.closeEvent();
            };
        }
        screen.classList.remove('hidden');
        game.updateUI();
    }

    closeEvent() {
        const game = this.game;
        document.getElementById('event-screen')?.classList.add('hidden');
        
        game.currentShopStock = null;
        game.tempDismantleResults = null;
        game.returnBonus = 0; // セクター移動時にボーナスをリセット
        game.selection.rocket = null;
        game.selection.launcher = null;
        game.selection.booster = null;
        game.setState('preparing');
    }

    closeResult() {
        const game = this.game;
        game.audioSystem.playTick();
        document.getElementById('result-overlay')?.classList.add('hidden');
        const status = game.flightResults.status;

        if (status === 'gameover') {
            window.location.reload();
            return;
        }

        // 成功・クリア時は施設遷移を優先（ショップでの機体購入チャンスを確保）
        if (status === 'success' || status === 'cleared') {
            if (game.lastHitGoal) { this.handleEvent(game.lastHitGoal); return; }
        } else {
            // 墜落・喪失時はリザルトを閉じた瞬間にゲームオーバー判定を行う
            if (game.missionSystem.isGameOver()) {
                game.uiSystem.showResult('gameover');
                return;
            }
        }

        if (status !== 'returned') game.selection.rocket = null;
        game.selection.launcher = null;
        game.selection.booster = null;
        // 同一セクターでのリトライ・帰還時は演出（preparing）をスキップして直接ビルド画面へ
        game.reset();
        game.setState('building');
    }
}
