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
import { ArchiveUI } from './ui/ArchiveUI.js';
import { TutorialUI } from './ui/TutorialUI.js';

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
        this.archiveUI = new ArchiveUI(game, this);
        this.tutorialUI = new TutorialUI(game, this);

        this.titleAnimation = null;
        this.notificationTimer = null;
        this.hudManager.setupStoryListeners();
        this._applyThemeVariables();
        this._initVersionDisplay();
    }

    /**
     * バージョン表記を実データで初期化する
     */
    _initVersionDisplay() {
        const versionEl = document.getElementById('version');
        if (versionEl) {
            versionEl.textContent = `v${this.game.version}`;
        }
    }

    /**
     * Data.js の定義色を CSS 変数としてセットする。
     */
    _applyThemeVariables() {
        const root = document.documentElement;
        Object.entries(CATEGORY_COLORS).forEach(([key, color]) => {
            const varName = `--color-${key.toLowerCase()}`;
            root.style.setProperty(varName, color);
            const rgba = hexToRgba(color, 0.2);
            root.style.setProperty(`${varName}-alpha`, rgba);
        });
    }

    update(dt) {
        this.hudManager.update(dt);
        this.starInfoPanel.update();
    }

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

        if (game.state === 'title') {
            this.archiveUI.hide();
            this._updateTitleUI();
            return;
        }

        const validStates = ['preparing', 'building', 'aiming', 'flying', 'cleared', 'crashed', 'lost', 'returned', 'event', 'result', 'gameover', 'replaying', 'archive', 'finishing'];
        if (!validStates.includes(game.state)) {
            throw new Error(`Critical: Invalid game state detected in updateUI: ${game.state}`);
        }

        const titleScreen = document.getElementById('title-screen');
        const gameplayElements = this._getGameplayElements();
        const replayOverlay = document.getElementById('replay-overlay');

        if (titleScreen) titleScreen.classList.add('hidden');
        this.titleAnimation?.stop();

        gameplayElements.forEach(el => {
            if (el) el.classList.add('hidden');
        });

        // アーカイブの表示制御
        if (game.state === 'archive') {
            this.archiveUI.show(this.archiveUI.currentTab || 'replays');
        } else {
            this.archiveUI.hide();
        }

        // リプレイHUDの表示制御
        if (replayOverlay) {
            const isReplaying = game.state === 'replaying';
            replayOverlay.classList.toggle('hidden', !isReplaying);
            
            if (isReplaying) {
                const exitBtn = document.getElementById('exit-replay-btn');
                if (exitBtn) {
                    exitBtn.onclick = (e) => {
                        e.preventDefault();
                        game.audioSystem.playTick();
                        game.stopReplayMode();
                    };
                }
            }
        }

        const isMission = ['preparing', 'building', 'aiming', 'flying', 'event', 'result', 'gameover', 'finishing'].includes(game.state);
        document.getElementById('terminal-panel').classList.toggle('hidden', !isMission);
        document.getElementById('mission-hud').classList.toggle('hidden', !isMission);

        switch (game.state) {
            case 'replaying': {
                const replayConfigList = document.getElementById('replay-config-list');
                if (replayConfigList && game.currentReplaySelection) {
                    this.renderReplayConfig(replayConfigList, game.currentReplaySelection);
                }
                break;
            }
            case 'building': {
                const buildOverlay = document.getElementById('build-overlay');
                const launchBtn = document.getElementById('launch-btn');
                const lc = document.getElementById('launch-control');
                
                if (buildOverlay) buildOverlay.classList.remove('hidden');
                if (launchBtn) {
                    launchBtn.classList.remove('hidden');
                    launchBtn.disabled = true;
                    const label = launchBtn.querySelector('.btn-label');
                    const bonusText = game.returnBonus > 0 ? `
                        <div class="part-stats">
                            <span class="stat-tag enhanced-border">
                                <span class="stat-label">POWER</span>
                                <span class="stat-val">x${(1 + game.returnBonus).toFixed(1)}</span>
                            </span>
                        </div>` : '';
                    if (label) label.innerHTML = `LAUNCH ENGINE${bonusText}`;
                }
                if (lc) lc.classList.remove('hidden');
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
                    const label = lb.querySelector('.btn-label');
                    const bonusText = game.returnBonus > 0 ? `
                        <div class="part-stats">
                            <span class="stat-tag enhanced-border">
                                <span class="stat-label">POWER</span>
                                <span class="stat-val">x${(1 + game.returnBonus).toFixed(1)}</span>
                            </span>
                        </div>` : '';
                    if (label) label.innerHTML = `LAUNCH ENGINE${bonusText}`;
                }
                if (lc) lc.classList.remove('hidden');
                break;
            }
            case 'flying':
            case 'finishing':
            case 'replaying': {
                const bo = document.getElementById('build-overlay');
                const lc = document.getElementById('launch-control');
                if (bo) bo.classList.add('hidden');
                if (lc) lc.classList.add('hidden');
                break;
            }
            case 'event': {
                const be = document.getElementById('build-overlay');
                if (be) {
                    be.classList.remove('hidden');
                    be.classList.add('event-active');
                    if (!game.wasEventPanelMinimized) {
                        be.querySelector('.panel')?.classList.add('collapsed');
                        game.wasEventPanelMinimized = true;
                    }
                }
                const es = document.getElementById('event-screen');
                if (es) es.classList.remove('hidden');
                break;
            }
            case 'gameover': break;
            case 'result': {
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
            case 'returned':
            case 'preparing':
            case 'archive': break;
            default:
                throw new Error(`Invalid game state: ${game.state}`);
        }

        const tabBtns = document.querySelectorAll('.tab-btn');
        const flightTab = document.getElementById('flight-tab');
        const factoryTab = document.getElementById('factory-tab');

        if (game.isFactoryOpen) {
            if (flightTab) flightTab.classList.add('hidden');
            if (factoryTab) factoryTab.classList.remove('hidden');
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'factory'));
        } else {
            if (flightTab) flightTab.classList.remove('hidden');
            if (factoryTab) factoryTab.classList.add('hidden');
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'flight'));
        }

        this.hudManager.refreshHUD();

        this.renderList('chassis-list', game.inventory.chassis, 'chassis', game.selection.chassis);
        this.renderList('logic-list', game.inventory.logic, 'logic', game.selection.logic);
        this.renderList('logic-option-list', game.inventory.modules, 'modules', game.selection.modules);
        this.renderList('acc-option-list', game.inventory.boosters, 'booster', game.selection.booster);
        this.renderList('launcher-list', game.inventory.launchers, 'launcher', game.selection.launcher);

        const buildBtn = document.getElementById('build-btn');
        if (buildBtn) buildBtn.disabled = !(game.selection.chassis && game.selection.logic);

        const rList = document.getElementById('rocket-list');
        if (rList) {
            rList.innerHTML = '';
            if (game.inventory.rockets.length === 0) {
                rList.innerHTML = `
                    <div class="slot-placeholder guide" id="no-rocket-placeholder">
                        <div class="part-header"><span class="part-name">待機中のロケットなし</span></div>
                        <span class="part-info">ここをクリックしてロケットを建造してください</span>
                    </div>
                `;
                const noRocket = document.getElementById('no-rocket-placeholder');
                if (noRocket) noRocket.onclick = () => {
                    game.audioSystem.playTick();
                    game.isFactoryOpen = true; 
                    this.updateUI(); 
                };
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
    }

    showSectorNotification(text, isReverse = false) {
        const el = document.getElementById('sector-notification');
        if (!el) return;
        el.textContent = text;
        el.classList.remove('hidden', 'animate', 'reverse');
        if (isReverse) el.classList.add('reverse');
        void el.offsetWidth;
        el.classList.add('animate');
        if (this.notificationTimer) clearTimeout(this.notificationTimer);
        this.notificationTimer = setTimeout(() => {
            const currentEl = document.getElementById('sector-notification');
            if (currentEl) {
                currentEl.classList.add('hidden');
                currentEl.classList.remove('animate');
            }
            this.notificationTimer = null;
        }, GAME_BALANCE.SECTOR_NOTIFICATION_DURATION);
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
            placeholder.innerHTML = `<div class="part-header"><span class="part-name" style="opacity: 0.5;">${mainText}</span></div><span class="part-info">${subText}</span>`;
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
                const modules = this.game.selection.modules || {};
                selectionCount = modules[group.instanceId] || 0;
                isAnySelected = selectionCount > 0;
            } else {
                isAnySelected = (selected && selected.instanceId === group.instanceId);
            }
            div.className = `part-item ${isAnySelected ? 'selected' : ''}`;
            div.innerHTML = this.generateCardHTML(group, { isSelected: isAnySelected, selectionCount: selectionCount });
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
        this.resetResultOverlay();
        this.resultScreen.show(resultType);
    }

    expandPanel() {
        const buildOverlay = document.getElementById('build-overlay');
        const panel = buildOverlay?.querySelector('.panel');
        if (panel && panel.classList.contains('collapsed')) {
            panel.classList.remove('collapsed');
            const icon = panel.querySelector('.collapse-btn .icon');
            if (icon) icon.textContent = '∧';
        }
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

    animateValue(el, start, end, duration) { this.hudManager.animateValue(el, start, end, duration); }
    animateCoinChange(amount) { this.hudManager.animateCoinChange(amount); }
    initTradingPost(container) { this.shopUI.initTradingPost(container); }
    initRepairDock(container) { this.maintenanceUI.initRepairDock(container); }
    initBlackMarket(container) { this.shopUI.initBlackMarket(container); }

    showTerminalReport() { this.terminalReport.show(); }

    _updateTitleUI() { this.showTitle(); }

    showTitle() {
        const titleScreen = document.getElementById('title-screen');
        const gameplayElements = this._getGameplayElements();
        gameplayElements.forEach(el => { if (el) el.classList.add('hidden'); });
        this.resetResultOverlay();
        const rec = document.getElementById('receipt-overlay');
        const back = document.getElementById('back-to-result-btn');
        [rec, back].forEach(el => { if (el) { el.classList.add('hidden'); el.classList.remove('active', 'minimized'); } });
        if (titleScreen) titleScreen.classList.remove('hidden');
        if (!this.titleAnimation) {
            const bg = document.getElementById('title-bg-canvas');
            const fg = document.getElementById('title-fg-canvas');
            this.titleAnimation = new TitleAnimation(bg, fg);
        }
        this.titleAnimation.start();
    }

    hideTitle() {
        const titleScreen = document.getElementById('title-screen');
        if (titleScreen) titleScreen.classList.add('hidden');
        if (this.titleAnimation) this.titleAnimation.stop();
    }

    enterMapViewMode() {
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        const backToResultBtn = document.getElementById('back-to-result-btn');
        if (resultOverlay) resultOverlay.classList.add('minimized');
        if (receiptOverlay) receiptOverlay.classList.add('minimized');
        if (backToResultBtn) backToResultBtn.classList.remove('hidden');
    }

    exitMapViewMode() {
        const resultOverlay = document.getElementById('result-overlay');
        const receiptOverlay = document.getElementById('receipt-overlay');
        const backToResultBtn = document.getElementById('back-to-result-btn');
        if (resultOverlay) resultOverlay.classList.remove('minimized');
        if (receiptOverlay) receiptOverlay.classList.remove('minimized');
        if (backToResultBtn) backToResultBtn.classList.add('hidden');
        this.game.updateUI();
    }

    resetResultOverlay() { this.resultScreen.reset(); }
    _updateHUD() { this.hudManager.refreshHUD(); }
    setupStoryListeners() { this.hudManager.setupStoryListeners(); }
    updateMailIcon() { this.hudManager.updateMailIcons(); }
    showStoryModal(storyId) { this.hudManager.showStoryModal(storyId); }
    showArchive(tab = 'ranking') {
        if (this.archiveUI) {
            this.archiveUI.currentTab = tab;
            this.game.setState('archive');
        }
    }
    hideArchive() {
        this.game.setState('title');
    }
    showStatus(message, type = 'info') {}
    showTutorial() { if (this.tutorialUI) this.tutorialUI.show(); }
    hideTutorial() { if (this.tutorialUI) this.tutorialUI.hide(); }
    nextTutorialSlide() { if (this.tutorialUI) this.tutorialUI.nextSlide(); }
    prevTutorialSlide() { if (this.tutorialUI) this.tutorialUI.prevSlide(); }

    showAchievementToast(data, callback) {
        const container = document.getElementById('achievement-toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML = `<div class="achievement-icon-box">✦</div><div class="achievement-info"><span class="description">実績解除: ${data.label}</span><span class="title">${data.title}</span></div>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('exit');
            toast.addEventListener('animationend', () => { toast.remove(); if (callback) callback(); });
        }, 3000); 
    }

    renderReplayConfig(container, selection) {
        if (!selection) return;
        container.innerHTML = '';
        const createSection = (title, item) => {
            if (!item) return '';
            return `<div class="category"><h3>${title}</h3>${this.generateCardHTML(item, { isSelected: true, clickable: false })}</div>`;
        };
        let html = '';
        if (selection.rocket) html += createSection('ROCKET', selection.rocket);
        else if (selection.chassis) html += createSection('CHASSIS', selection.chassis);
        if (selection.launcher) html += createSection('LAUNCHER', selection.launcher);
        if (selection.booster) html += createSection('BOOSTER', selection.booster);
        container.innerHTML = html;
    }

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

    /**
     * お気に入り上限時に表示する入れ替え選択ダイアログ
     * @param {string|object} candidate 登録候補のID、または新規レコードデータ {score, recordData}
     * @param {Function} onComplete 入れ替え完了後に実行するコールバック
     * @param {Function} onCancel キャンセル時に実行するコールバック
     */
    showFavoriteReplacementDialog(candidate, onComplete, onCancel) {
        const isNewData = typeof candidate === 'object';
        const candidateId = isNewData ? null : candidate;
        
        // 現在のお気に入り（候補が既存の場合はそれを除く）を取得
        const favorites = this.game.replaySystem.getRecords().filter(r => r.isFavorite && r.id !== candidateId);
        
        const overlay = document.createElement('div');
        overlay.className = 'fav-replace-overlay';
        overlay.style.zIndex = '11000';
        
        const modal = document.createElement('div');
        modal.className = 'fav-replace-modal';
        
        modal.innerHTML = `
            <h3>FAVORITE LIMIT REACHED</h3>
            <p>お気に入りの保存上限(5件)に達しています。<br>入れ替える記録を選択してください。</p>
            <div class="fav-list-mini"></div>
            <button class="fav-replace-cancel">CANCEL</button>
        `;
        
        const list = modal.querySelector('.fav-list-mini');
        favorites.forEach(fav => {
            const d = new Date(fav.timestamp);
            const dateStr = `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
            
            const item = document.createElement('div');
            item.className = 'fav-item-mini';
            item.innerHTML = `
                <div class="info">
                    <div class="date">${dateStr}</div>
                    <div class="score">${fav.score.toLocaleString()}</div>
                </div>
                <div class="replace-label">REPLACE</div>
            `;
            
            item.onclick = () => {
                // 1. 選択された古い記録を解除
                this.game.replaySystem.toggleFavorite(fav.id);
                
                // 2. 新しい記録を登録
                if (isNewData) {
                    // リザルト画面からの新規データ保存
                    const newId = this.game.replaySystem.saveAsFavorite(candidate.score, candidate.recordData);
                    if (onComplete) onComplete(newId);
                } else {
                    // アーカイブ画面内の既存レコードのお気に入り化
                    this.game.replaySystem.toggleFavorite(candidateId);
                    if (onComplete) onComplete();
                }
                
                this.game.audioSystem.playTick();
                document.body.removeChild(overlay);
            };
            
            list.appendChild(item);
        });
        
        modal.querySelector('.fav-replace-cancel').onclick = () => {
            document.body.removeChild(overlay);
            if (onCancel) onCancel();
        };
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    }
}
