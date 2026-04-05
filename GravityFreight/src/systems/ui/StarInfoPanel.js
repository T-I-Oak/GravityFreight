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
    }

    /**
     * マウス位置に合わせてホバーパネルの表示状態と位置を更新する。
     */
    update() {
        const game = this.game;
        if (!this.starPanel || !this.starList) return;

        // 特定のステート以外では強制非表示
        const allowedStates = ['building', 'aiming', 'flying'];
        if (!allowedStates.includes(game.state)) {
            this.currentHoveredStar = null;
            this.starPanel.classList.add('hidden');
            return;
        }

        // ホバー可能な星の判定ロジックを忠実に再現
        const isHoverableStar = game.hoveredStar && (
            (!game.hoveredStar.isHome && !game.hoveredStar.isCollected) ||
            (game.hoveredStar.isHome && game.hoveredStar.items && game.hoveredStar.items.length > 0)
        ) && game.hoveredStar.items && game.hoveredStar.items.length > 0;

        if (isHoverableStar) {
            const star = game.hoveredStar;
            const currentItemCount = star.items.length;

            if (this.currentHoveredStar !== star || this.starPanel.dataset.itemCount != currentItemCount) {
                this.currentHoveredStar = star;
                this.starPanel.dataset.itemCount = currentItemCount;

                this.starTitle.textContent = star.isHome ? "STAR CORE (STORAGE)" : "STAR ITEMS";
                this.starList.innerHTML = '';

                const mergedItems = ItemUtils.groupItems(star.items);
                const isCompact = mergedItems.length > 3;
                this.starList.className = `category ${isCompact ? 'compact-list' : ''}`;

                mergedItems.forEach(item => {
                    const cardWrapper = document.createElement('div');
                    cardWrapper.className = 'tooltip-card-wrapper';
                    cardWrapper.style.marginBottom = '4px';
                    cardWrapper.innerHTML = UIComponents.generateCardHTML(item, { showInventory: true });
                    this.starList.appendChild(cardWrapper);
                });
            }

            this.starPanel.classList.remove('hidden');
            
            // 位置計算（忠実に再現）
            const offset = 20;
            const mouseX = game.mousePos.x || 0;
            const mouseY = game.mousePos.y || 0;
            
            let px = mouseX + offset;
            let py = mouseY + offset;

            const panelWidth = this.starPanel.offsetWidth || 280;
            const panelHeight = this.starPanel.offsetHeight || 0;

            if (px + panelWidth > game.canvas.width - 20) {
                px = mouseX - panelWidth - offset;
            }
            if (py + panelHeight > game.canvas.height - 20) {
                py = mouseY - panelHeight - offset;
            }
            
            px = Math.max(10, px);
            py = Math.max(10, py);

            this.starPanel.style.left = px + 'px';
            this.starPanel.style.top = py + 'px';
        } else {
            if (this.currentHoveredStar !== null) {
                this.currentHoveredStar = null;
                this.starPanel.classList.add('hidden');
            }
        }
    }
}
