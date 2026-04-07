import { ItemUtils } from '../../utils/ItemUtils.js';
import { UIComponents } from './UIComponents.js';

/**
 * 星情報のホバー表示（Tooltip）を管理するクラス。
 */
export class StarInfoPanel {
    constructor(game) {
        this.game = game;
        this.starPanel = document.getElementById('star-info-panel');
        this.starList = document.getElementById('star-info-list');
        this.starTitle = document.getElementById('star-info-title');
        this.currentHoveredStar = null;
    }

    /**
     * マウス位置に合わせてホバーパネルの表示状態と位置を更新する。
     */
    update() {
        const game = this.game;
        if (!this.starPanel || !this.starList) return;

        // 1. ステートに基づく表示可否の判定
        let isViewMapMode = false;
        if (game.state === 'result' || game.state === 'gameover') {
            const overlayId = (game.state === 'result') ? 'result-overlay' : 'receipt-overlay';
            const overlay = document.getElementById(overlayId);
            // マップ閲覧中（パネルが最小化されている時）のみ許可
            isViewMapMode = overlay && overlay.classList.contains('minimized');
        }

        const playStates = ['building', 'aiming', 'flying'];
        const isAllowed = playStates.includes(game.state) || isViewMapMode;

        // 2. ホバー対象の判定 (アイテムを持っている星のみ表示)
        const star = isAllowed ? game.hoveredStar : null;
        const hasItems = star && star.items && star.items.length > 0;

        if (!hasItems) {
            this.currentHoveredStar = null;
            this.starPanel.classList.add('hidden');
            return;
        }

        // 3. 内容の更新 (星が変わった、またはアイテム数が変わった場合のみ再描画)
        const currentItemCount = star.items.length;
        if (this.currentHoveredStar !== star || this.starPanel.dataset.itemCount != currentItemCount) {
            this.currentHoveredStar = star;
            this.starPanel.dataset.itemCount = currentItemCount;
            this._renderStarInfo(star);
        }

        // 4. 位置追従と表示
        this._updatePosition(game.mousePos);
        this.starPanel.classList.remove('hidden');
    }

    _renderStarInfo(star) {
        if (this.starTitle) {
            this.starTitle.textContent = star.isHome ? "STAR CORE (STORAGE)" : "STAR ITEMS";
        }
        this.starList.innerHTML = '';

        const mergedItems = ItemUtils.groupItems(star.items);
        const isCompact = mergedItems.length > 3;
        this.starList.className = `category ${isCompact ? 'compact-list' : ''}`;

        mergedItems.forEach(item => {
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'tooltip-card-wrapper';
            cardWrapper.style.marginBottom = '4px';
            cardWrapper.innerHTML = UIComponents.generateCardHTML(item);
            this.starList.appendChild(cardWrapper);
        });
    }

    _updatePosition(mousePos) {
        const offset = 20;
        const mouseX = mousePos.x || 0;
        const mouseY = mousePos.y || 0;
        
        let px = mouseX + offset;
        let py = mouseY + offset;

        const panelWidth = this.starPanel.offsetWidth || 280;
        const panelHeight = this.starPanel.offsetHeight || 0;

        // 画面端での折り返し
        if (px + panelWidth > this.game.canvas.width - 20) {
            px = mouseX - panelWidth - offset;
        }
        if (py + panelHeight > this.game.canvas.height - 20) {
            py = mouseY - panelHeight - offset;
        }
        
        px = Math.max(10, px);
        py = Math.max(10, py);

        this.starPanel.style.left = px + 'px';
        this.starPanel.style.top = py + 'px';
    }
}
