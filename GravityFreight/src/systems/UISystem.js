import { CATEGORY_COLORS, ITEM_REGISTRY, GOAL_NAMES, ANIMATION_DURATION, hexToRgba, PARTS, RARITY, STORY_DATA, GOAL_COLORS, GAME_BALANCE } from '../core/Data.js';
import { ItemUtils } from '../utils/ItemUtils.js';
import { TitleAnimation } from '../utils/TitleAnimation.js';
import { UIComponents } from './ui/UIComponents.js';
import { ShopUI } from './ui/ShopUI.js';
import { MaintenanceUI } from './ui/MaintenanceUI.js';
import { ResultScreen } from './ui/ResultScreen.js';
import { TerminalReport } from './ui/TerminalReport.js';
import { StarInfoPanel } from './ui/StarInfoPanel.js';
import { UIAnimations } from './ui/UIAnimations.js';
import { HUDManager } from './ui/HUDManager.js';

export class UISystem {
    constructor(game) {
        this.game = game;
        // サブシステムの初期化
        this.shopUI = new ShopUI(game, this);
        this.maintenanceUI = new MaintenanceUI(game, this);
        this.resultScreen = new ResultScreen(game, this);
        this.terminalReport = new TerminalReport(game, this);
        this.starInfoPanel = new StarInfoPanel(game);
        this.hudManager = new HUDManager(game, this);

        this.titleAnimation = null;
        this.notificationTimer = null;
        this.hudManager.setupStoryListeners();
    }

    update(dt) {
        this.hudManager.update(dt);
        this.starInfoPanel.update();
    }


    // 主要なゲームプレイUI要素の取得 (ルール5.1に基づき、存在を前提とする)
    _getGameplayElements() {
        return [
            document.getElementById('terminal-panel'),
            document.getElementById('mission-hud'),
            document.getElementById('build-overlay'),
            document.getElementById('launch-btn'),
            document.getElementById('launch-control'),
            document.getElementById('event-screen'),
            document.getElementById('how-to-play-overlay'),
            document.getElementById('star-info-panel')
        ];
    }

    updateUI() {
        const game = this.game;

        // 1. タイトルステートの早期処理 (以降のプレイ用ロジックとの干渉を遮断)
        if (game.state === 'title') {
            this._updateTitleUI();
            return;
        }

        // 定義済みプレイ系ステート以外の不正ステートは例外を投げる (ルール5.1)
        const validStates = ['building', 'aiming', 'flying', 'cleared', 'crashed', 'lost', 'returned', 'event', 'result', 'gameover'];
        if (!validStates.includes(game.state)) {
            throw new Error(`Critical: Invalid game state detected in updateUI: ${game.state}`);
        }

        // 2. 主要要素の取得 (一本化)
        const titleScreen = document.getElementById('title-screen');
        const gameplayElements = this._getGameplayElements();
        const resultOverlay = document.getElementById('result-overlay');
        const eventScreen = document.getElementById('event-screen');
        const receiptOverlay = document.getElementById('receipt-overlay');

        // 3. 表示ステータスのサニタイズ (以前のステートの残存スタイルを徹底排除)
        if (titleScreen) {
            titleScreen.classList.add('hidden');
        }
        this.titleAnimation?.stop();

        gameplayElements.forEach(el => {
            if (el) {
                el.classList.add('hidden');
            }
        });

        // 4. ステートに関わらずミッション中に表示すべき基本HUD (常時表示ガード)
        const isMission = ['building', 'aiming', 'flying', 'event', 'result', 'gameover'].includes(game.state);
        document.getElementById('terminal-panel').classList.toggle('hidden', !isMission);
        document.getElementById('mission-hud').classList.toggle('hidden', !isMission);

        // 5. ステートに基づいた決定論的な表示制御
        switch (game.state) {
            case 'building': {
                const buildOverlay = document.getElementById('build-overlay');
                const launchBtn = document.getElementById('launch-btn');
                const lc = document.getElementById('launch-control');
                
                if (buildOverlay) buildOverlay.classList.remove('hidden');
                if (launchBtn) {
                    launchBtn.classList.remove('hidden');
                    launchBtn.disabled = true;
                }
                if (lc) lc.classList.remove('hidden');

                if (eventScreen) eventScreen.classList.add('hidden');
                break;
            }
            case 'aiming': {
                const bo = document.getElementById('build-overlay');
                const lb = document.getElementById('launch-btn');
                const lc = document.getElementById('launch-control');
                
                if (bo) bo.classList.remove('hidden');
                if (lb) {
                    lb.classList.remove('hidden');
                    lb.disabled = false;
                }
                if (lc) lc.classList.remove('hidden');
                
                if (eventScreen) eventScreen.classList.add('hidden');
                break;
            }
            case 'flying': {
                const bo = document.getElementById('build-overlay');
                const lc = document.getElementById('launch-control');
                
                if (bo) bo.classList.add('hidden');
                if (lc) lc.classList.add('hidden');
                
                if (eventScreen) eventScreen.classList.add('hidden');
                break;
            }
            case 'event': {
                const be = document.getElementById('build-overlay');
                if (be) {
                    be.classList.remove('hidden');
                    be.classList.add('event-active');
                    // 【憲法 2.7】イベント開始時に一度だけ最小化する。
                    // その後ユーザーが手動で開いた場合は、updateUI で閉じ直さない。
                    if (!game.wasEventPanelMinimized) {
                        be.querySelector('.panel')?.classList.add('collapsed');
                        game.wasEventPanelMinimized = true;
                    }
                }
                if (eventScreen) eventScreen.classList.remove('hidden');
                break;
            }
            case 'gameover': {
                // 【仕様 2.6】hidden 操作は showTerminalReport() の単独責任。
                break;
            }
            case 'result': {
                // 【憲法 2.6】hidden 操作は showResult() の単独責任。
                // updateUI は result-overlay への操作も、
                // result ステートでの build-overlay 等への干渉も行わない。
                const backToResultBtn = document.getElementById('back-to-result-btn');
                const lc = document.getElementById('launch-control');
                if (backToResultBtn && !backToResultBtn.classList.contains('hidden')) {
                    if (lc) lc.classList.remove('hidden');
                }
                break;
            }
            case 'cleared':
            case 'crashed':
            case 'lost':
            case 'returned': {
                // 【憲法 2.6】hidden 操作は showResult() の単独責任。
                break;
            }
            default:
                if (eventScreen) eventScreen.classList.add('hidden');
                throw new Error(`Invalid game state: ${game.state}`);
        }

        // 5. タブ切り替え・リスト描画などの詳細処理
        const tabBtns = document.querySelectorAll('.tab-btn');
        const flightTab = document.getElementById('flight-tab');
        const factoryTab = document.getElementById('factory-tab');

        if (game.isFactoryOpen) {
            flightTab.classList.add('hidden');
            factoryTab.classList.remove('hidden');
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'factory'));
        } else {
            flightTab.classList.remove('hidden');
            factoryTab.classList.add('hidden');
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'flight'));
        }

        // 通貨・スコア表示の即時同期 (Spec 5.1/5.3 準拠)
        this.hudManager.refreshHUD();

        // リストレンダリング実行
        this.renderList('chassis-list', game.inventory.chassis, 'chassis', game.selection.chassis);
        this.renderList('logic-list', game.inventory.logic, 'logic', game.selection.logic);
        this.renderList('logic-option-list', game.inventory.modules, 'modules', game.selection.modules);
        this.renderList('acc-option-list', game.inventory.boosters, 'booster', game.selection.booster);
        this.renderList('launcher-list', game.inventory.launchers, 'launcher', game.selection.launcher);

        const buildBtn = document.getElementById('build-btn');
        buildBtn.disabled = !(game.selection.chassis && game.selection.logic);

        const rList = document.getElementById('rocket-list');
        rList.innerHTML = '';
        if (game.inventory.rockets.length === 0) {
            rList.innerHTML = `
                <div class="slot-placeholder guide" id="no-rocket-placeholder">
                    <div class="part-header"><span class="part-name">待機中のロケットなし</span></div>
                    <span class="part-info">ここをクリックしてロケットを建造してください</span>
                </div>
            `;
            const noRocket = document.getElementById('no-rocket-placeholder');
            noRocket.onclick = () => { game.isFactoryOpen = true; this.updateUI(); };
        } else {
            game.inventory.rockets.forEach(rocket => {
                const div = document.createElement('div');
                const isSelected = (game.selection.rocket && game.selection.rocket.instanceId === rocket.instanceId);
                div.className = `rocket-item ${isSelected ? 'selected' : ''}`;
                div.innerHTML = this.generateCardHTML(rocket, { isSelected });
                div.onclick = () => {
                    if (game.state === 'event') return;
                    game.selectPart('rocket', rocket.instanceId);
                };
                rList.appendChild(div);
            });
        }
    }

    /**
     * セクター開始通知を表示。
     */
    showSectorNotification(text) {
        const el = document.getElementById('sector-notification');
        if (!el) return;
        
        el.textContent = text;
        el.classList.remove('hidden', 'animate');
        void el.offsetWidth; // 強制リフロー
        el.classList.add('animate');
        
        if (this.notificationTimer) clearTimeout(this.notificationTimer);
        this.notificationTimer = setTimeout(() => {
            const currentEl = document.getElementById('sector-notification');
            if (currentEl) {
                currentEl.classList.add('hidden');
                currentEl.classList.remove('animate');
            }
            this.notificationTimer = null;
        }, GAME_BALANCE.SECTOR_NOTIFICATION_DURATION); // アニメーション時間(3.5s)より少し長く。
    }

    renderList(id, items, type, selected) {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '';

        if (items.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'slot-placeholder';
            let mainText = 'EMPTY';
            let subText = '在庫なし';

            if (type === 'chassis') { mainText = 'シャーシなし'; subText = '購入または回収してください'; }
            else if (type === 'logic') { mainText = 'ロジックなし'; subText = '購入または回収してください'; }
            else if (type === 'launcher') { mainText = '発射台なし'; subText = '購入または回収してください'; }
            else if (type === 'modules') { mainText = 'モジュールなし'; subText = '購入または回収してください'; }
            else if (type === 'booster') { mainText = 'ブースターなし'; subText = '購入または回収してください'; }

            placeholder.innerHTML = `
                <div class="part-header">
                    <span class="part-name" style="opacity: 0.5;">${mainText}</span>
                </div>
                <span class="part-info">${subText}</span>
            `;
            el.appendChild(placeholder);
            return;
        }

        const fragment = document.createDocumentFragment();
        const groups = ItemUtils.groupItems(items);
        groups.forEach(group => {
            const div = document.createElement('div');
            let isAnySelected = false;
            let selectionCount = 0;
            if (type === 'modules') {
                selectionCount = this.game.selection.modules[group.instanceId] || 0;
                isAnySelected = selectionCount > 0;
            } else {
                isAnySelected = (selected && selected.instanceId === group.instanceId);
            }

            div.className = `part-item ${isAnySelected ? 'selected' : ''}`;
            div.innerHTML = this.generateCardHTML(group, {
                isSelected: isAnySelected,
                showInventory: true,
                selectionCount: selectionCount
            });

            div.onclick = () => {
                if (this.game.state === 'event') return;
                if (type === 'modules' || type === 'booster') {
                    this.game.selectOption(type, group.instanceId);
                } else {
                    this.game.selectPart(type, group.instanceId);
                }
            };
            fragment.appendChild(div);
        });
        el.appendChild(fragment);
    }

    generateCardHTML(itemData, options = {}) {
        return UIComponents.generateCardHTML(itemData, options);
    }

    showResult(resultType) {
        // [仕様 2.4] 新しいリザルト表示開始時にクリーンアップを行う
        this.resetResultOverlay();
        this.resultScreen.show(resultType);
    }

    /**
     * 【憲法 2.7】ビルドパネルを強制的に展開（開いた状態）にする。
     * 呼び出し元: EventSystem (セクター開始時)、および初期化時
     */
    expandPanel() {
        const buildOverlay = document.getElementById('build-overlay');
        const panel = buildOverlay?.querySelector('.panel');
        if (panel && panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
            const icon = panel.querySelector('.collapse-btn .icon');
            if (icon) icon.textContent = '∧';
        }
        // イベント時の最小化済みフラグもリセットして、次のイベントに備える
        this.game.wasEventPanelMinimized = false;
    }

    ensurePanelExpanded() {
        const terminalPanel = document.getElementById('terminal-panel');
        if (terminalPanel && terminalPanel.classList.contains('collapsed')) {
            terminalPanel.classList.remove('collapsed');
            const icon = terminalPanel.querySelector('.collapse-btn .icon');
            if (icon) icon.textContent = '∧';
        }
    }

    animateValue(el, start, end, duration) {
        this.hudManager.animateValue(el, start, end, duration);
    }

    animateCoinChange(amount) {
        this.hudManager.animateCoinChange(amount);
    }

    // サブモジュールへの委譲
    initTradingPost(container) { this.shopUI.initTradingPost(container); }
    initRepairDock(container) { this.maintenanceUI.initRepairDock(container); }
    initBlackMarket(container) { this.shopUI.initBlackMarket(container); }

    _getGradeInfo(value, target, type = 'single') {
        const score = type === 'single' ? Math.sqrt(value / target) * 100 : value;
        const grades = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];
        const step = type === 'single' ? GAME_BALANCE.GRADE_STEPS.SINGLE : GAME_BALANCE.GRADE_STEPS.TOTAL;
        const index = Math.min(grades.length - 1, Math.floor(score / step));
        return {
            grade: grades[index],
            score: score,
            className: `grade-${grades[index].toLowerCase()}`
        };
    }

    showTerminalReport() {
        this.terminalReport.show();
    }

    _updateTitleUI() {
        const titleScreen = document.getElementById('title-screen');
        const gameplayElements = this._getGameplayElements();

        // ルール5.1に基づき、存在を前提とした警告なしのリセット
        // 全てのゲームプレイ UI をインラインスタイルで強制非表示
        gameplayElements.forEach(el => {
            if (!el) return;
            el.classList.add('hidden');
        });

        // 【新：責任分離後のクリーンアップ】リストに含まれないリザルト系を個別に隠蔽
        this.resetResultOverlay();
        const rec = document.getElementById('receipt-overlay');
        const back = document.getElementById('back-to-result-btn');
        [rec, back].forEach(el => {
            if (el) {
                el.classList.add('hidden');
                el.classList.remove('active', 'minimized'); // ステートのリセット
            }
        });

        // タイトル画面を最前面で表示
        titleScreen.classList.remove('hidden');

        if (!this.titleAnimation) {
            const bg = document.getElementById('title-bg-canvas');
            const fg = document.getElementById('title-fg-canvas');
            this.titleAnimation = new TitleAnimation(bg, fg);
        }
        this.titleAnimation.start();
    }

    /**
     * 【仕様 2.2】VIEW MAP モードへ移行する。
     * result-overlay / receipt-overlay に .minimized を付与し、BACK TO RESULT ボタンを表示する。
     * 呼び出し元: EventSystem（VIEW MAP ボタンクリック時）のみ
     */
    enterMapViewMode() {
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        const backToResultBtn = document.getElementById('back-to-result-btn');
        if (resultOverlay) resultOverlay.classList.add('minimized');
        if (receiptOverlay) receiptOverlay.classList.add('minimized');
        if (backToResultBtn) backToResultBtn.classList.remove('hidden');
    }

    /**
     * 【仕様 2.2】VIEW MAP モードからリザルト画面に戻る。
     * .minimized を削除し、BACK TO RESULT ボタンを非表示にする。
     * 呼び出し元: EventSystem（BACK TO RESULT ボタンクリック時）のみ
     */
    exitMapViewMode() {
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        const backToResultBtn = document.getElementById('back-to-result-btn');
        if (resultOverlay) resultOverlay.classList.remove('minimized');
        if (receiptOverlay) receiptOverlay.classList.remove('minimized');
        if (backToResultBtn) backToResultBtn.classList.add('hidden');
        this.game.updateUI();
    }

    /**
     * 【仕様 2.4】新しいリザルト表示開始時に呼び出す。
     * .minimized を削除し、BACK ボタンを初期化する。
     * 呼び出し元: showResult() のみ
     */
    resetResultOverlay() {
        this.resultScreen.reset();
    }

    _updateHUD() {
        this.hudManager.refreshHUD();
    }

    setupStoryListeners() {
        this.hudManager.setupStoryListeners();
    }

    updateMailIcon() {
        this.hudManager.updateMailIcons();
    }

    showStoryModal(storyId) {
        this.hudManager.showStoryModal(storyId);
    }

    showStatus(message, type = 'info') {
        // 現在はログ出力を抑制。将来的に UI でのメッセージ表示に使用可能。
    }
}
