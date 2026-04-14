import { GOAL_NAMES, STORY_DATA } from '../../core/Data.js';
import { UIComponents } from './UIComponents.js';
import { UIAnimations } from './UIAnimations.js';

/**
 * リザルト画面（result-overlay）の表示と制御を担当するクラス。
 */
export class ResultScreen {
    constructor(game, uiSystem) {
        this.game = game;
        this.uiSystem = uiSystem;
        this._resultDelay = 0.1;
        this.ANIMATION_DURATION = 1.0;
    }

    /**
     * リザルト画面の状態を完全に初期化する。
     */
    reset() {
        const resultOverlay = document.getElementById('result-overlay');
        const backToResultBtn = document.getElementById('back-to-result-btn');
        
        // 内容のクリア
        const elements = ['result-title', 'result-subtitle', 'result-stats-list', 'result-items-list'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = (id === 'result-title' || id === 'result-subtitle') ? '' : '';
        });

        if (resultOverlay) {
            resultOverlay.classList.remove('minimized');
            resultOverlay.classList.add('hidden');
            resultOverlay.removeAttribute('data-result-type');
            void resultOverlay.offsetWidth; // 強制リフロー
        }
        if (backToResultBtn) backToResultBtn.classList.add('hidden');
    }

    /**
     * 指定された結果タイプでリザルト画面を表示する。
     */
    show(resultType) {
        const game = this.game;
        const overlay = document.getElementById('result-overlay');
        if (!overlay) return;

        const currentShowingType = overlay.getAttribute('data-result-type');
        
        // 【重要】既に同じ結果を表示中、あるいはアニメーション中であれば重複呼び出しを無視する
        // これにより、ストーリー解放時に走る「早出し」とタイマーによる「正規表示」の競合を防ぐ
        if (!overlay.classList.contains('hidden') && currentShowingType === resultType) return;
        
        // ターミナルレポート（gameover）への移行は常に許可する
        if (resultType !== 'gameover' && currentShowingType === 'gameover') return;

        // reset() は UISystem.showResult() 内で resetResultOverlay() を通じて既に実行済み
        overlay.setAttribute('data-result-type', resultType);
        this._resultDelay = 0.1;

        const titleEl = document.getElementById('result-title');
        const subtitleEl = document.getElementById('result-subtitle');
        const statsList = document.getElementById('result-stats-list');
        const itemsList = document.getElementById('result-items-list');
        const scoreTotalEl = document.getElementById('result-total-score');
        const coinTotalEl = document.getElementById('result-total-coin');

        // アニメーション開始前の初期表示
        if (scoreTotalEl) scoreTotalEl.textContent = (game.launchScore || 0).toLocaleString();
        if (coinTotalEl) coinTotalEl.textContent = (game.launchCoins || 0).toLocaleString();

        const statusText = { 
            'success': `SECTOR ${game.totalSectorsCompleted} COMPLETED`, 
            'cleared': `SECTOR ${game.totalSectorsCompleted} COMPLETED`, 
            'returned': 'ROCKET RECOVERED', 
            'crashed': 'SHIP CRASHED', 
            'lost': 'LOST IN SPACE',
            'gameover': 'TERMINAL REPORT'
        };
        if (titleEl) titleEl.textContent = statusText[resultType] || 'MISSION END';
        if (subtitleEl) {
            subtitleEl.textContent = '';
            subtitleEl.style.display = 'none';
        }

        this._setupCloseButton(resultType);

        if (game.flightResults) game.flightResults.status = resultType;
        overlay.classList.remove('success-theme', 'failure-theme');
        if (resultType === 'gameover') {
            overlay.classList.add('failure-theme');
        } else {
            overlay.classList.add((resultType === 'success' || resultType === 'cleared' || resultType === 'returned') ? 'success-theme' : 'failure-theme');
        }

        // データの同期とステート更新 (オリジナルのタイミングを維持)
        if (game.state !== 'result' && game.state !== 'gameover') {
            game.setState('result');
        }

        // フライト成果の取得（内訳管理APIを使用）
        const durationScore = game.flightResults.durationScore || 0;

        // 実績・統計の更新
        // ※ステップスコア相当分を統計に計上
        game.achievementSystem.updateStat('stat_max_dist', durationScore);
        game.achievementSystem.updateStat('stat_distance', durationScore);
        
        // 統計リストの生成
        if (resultType === 'gameover') {
            this._renderGameOverStats(statsList);
        } else {
            this._renderFlightStats(statsList, durationScore);
        }

        // アイテムリストの生成
        this._renderItems(itemsList, resultType);

        // 数値アニメーションの基準点をセット（ここからHUDManagerが自動で追いかける）
        game.displayScore = game.launchScore;
        game.displayCoins = game.launchCoins;

        // 表示の実行
        if (resultType !== 'gameover') {
            requestAnimationFrame(() => {
                overlay.classList.remove('hidden');
                game.updateUI();
                this._setupRecordingControls();
            });
        } else {
            overlay.classList.remove('hidden');
            game.updateUI();
            this._setupRecordingControls();
            this.uiSystem.showTerminalReport();
        }
    }

    _setupCloseButton(resultType) {
        const closeBtn = document.getElementById('result-close-btn');
        if (!closeBtn) return;

        let label = 'CONTINUE';
        closeBtn.classList.remove('btn-grad-green', 'btn-grad-blue', 'btn-grad-red', 'btn-grad-orange');
        
        if (resultType === 'success' || resultType === 'cleared') {
            const goalType = this.game.lastHitGoal?.id;
            const colorClasses = {
                'TRADING_POST': 'btn-grad-green',
                'REPAIR_DOCK': 'btn-grad-blue',
                'BLACK_MARKET': 'btn-grad-red'
            };
            label = `TO ${GOAL_NAMES[goalType] || 'NEXT SECTOR'}`;
            closeBtn.classList.add(colorClasses[goalType] || 'btn-grad-green');
        } else if (resultType === 'returned') {
            label = 'BACK TO BASE';
            closeBtn.classList.add('btn-grad-green');
        } else if (resultType === 'gameover') {
            label = 'RESTART ADVENTURE';
            closeBtn.classList.add('btn-grad-orange');
        } else if (this.game.isGameOver()) {
            label = 'ABANDON MISSION';
            closeBtn.classList.add('btn-grad-orange');
        } else {
            label = 'RETRY MISSION';
            closeBtn.classList.add('btn-grad-orange');
        }
        closeBtn.textContent = label;
    }

    _setupRecordingControls() {
        const header = document.getElementById('result-header');
        if (!header) return;

        // 既存のコントロールがあれば削除
        const existing = document.getElementById('recording-controls-container');
        if (existing) existing.remove();

        const game = this.game;
        if (!game.flightResults) return;

        const container = document.createElement('div');
        container.id = 'recording-controls-container';
        container.className = 'recording-controls active stagger-in';
        container.style.animationDelay = `${this._resultDelay}s`;
        this._resultDelay += 0.1;

        const recBadge = document.createElement('div');
        recBadge.className = 'rec-badge';
        recBadge.textContent = 'RECORDED';
        
        const favBtn = document.createElement('button');
        favBtn.className = 'favorite-toggle-btn';

        const updateUI = () => {
            const isSaved = game.flightResults.savedAsBestShot;
            const recordId = game.flightResults.savedRecordId;
            
            // バッジの表示制御
            recBadge.style.display = isSaved ? 'inline-flex' : 'none';

            if (!isSaved) {
                // 未保存状態（ランキング圏外かつ未保存）
                favBtn.classList.remove('active');
                favBtn.innerHTML = `<span class="icon">☆</span> SAVE REPLAY`;
            } else {
                // 保存済み状態（録画が存在する）
                const record = game.replaySystem.getRecords().find(r => r.id === recordId);
                if (record && record.isFavorite) {
                    favBtn.classList.add('active');
                    favBtn.innerHTML = `<span class="icon">★</span> PROTECTED`;
                } else {
                    favBtn.classList.remove('active');
                    favBtn.innerHTML = `<span class="icon">☆</span> PROTECT RECORD`;
                    
                    // ランキング圏外で、かつお気に入りも外された場合は「未保存」に戻す
                    // ※ ReplaySystem.toggleFavorite ですでにレコード自体が消えている可能性がある
                    if (!record) {
                        game.flightResults.savedAsBestShot = false;
                        game.flightResults.savedRecordId = null;
                        // pendingRecordDataは元のデータを復元しておく必要があるが、
                        // 面倒なので再描画して初期状態に戻す
                        updateUI();
                    }
                }
            }
        };

        favBtn.addEventListener('click', () => {
            if (!game.flightResults.savedAsBestShot) {
                // 【新規保存】
                const score = game.flightResults.pendingScore;
                const data = game.flightResults.pendingRecordData;
                const newId = game.replaySystem.saveAsFavorite(score, data);
                
                if (newId) {
                    game.flightResults.savedAsBestShot = true;
                    game.flightResults.savedRecordId = newId;
                    game.audioSystem.playBuy();
                    updateUI();
                } else {
                    // お気に入り保存を明示的に行おうとしたが上限に達している場合
                    const score = game.flightResults.pendingScore;
                    const data = game.flightResults.pendingRecordData;
                    
                    this.uiSystem.showFavoriteReplacementDialog({ score, recordData: data }, (newId) => {
                        game.flightResults.savedAsBestShot = true;
                        game.flightResults.savedRecordId = newId;
                        updateUI();
                    }, () => {
                        updateUI();
                    });
                }
            } else {
                // 【お気に入りトグル】
                const recordId = game.flightResults.savedRecordId;
                const success = game.replaySystem.toggleFavorite(recordId);
                if (success) {
                    game.audioSystem.playTick();
                    updateUI();
                } else {
                    const candidateId = game.flightResults.savedRecordId;
                    this.uiSystem.showFavoriteReplacementDialog(candidateId, () => {
                        updateUI();
                    }, () => {
                        updateUI();
                    });
                }
            }
        });

        // 初回表示の必要性チェック
        if (!game.flightResults.savedAsBestShot && !game.flightResults.pendingRecordData) return;

        updateUI();
        container.appendChild(recBadge);
        container.appendChild(favBtn);
        header.appendChild(container);
    }

    _renderGameOverStats(statsList) {
        const game = this.game;
        const sectors = game.totalSectorsCompleted || 0;
        const collected = game.totalCollectedItems || 0;
        const score = Math.floor(game.score || 0);

        const sInfo = this.uiSystem._getGradeInfo(sectors, 10);
        const cInfo = this.uiSystem._getGradeInfo(collected, 30);
        const pInfo = this.uiSystem._getGradeInfo(score, 50000);

        const sRank = game.rankingSystem.checkRank('sector', sectors);
        const cRank = game.rankingSystem.checkRank('collected', collected);
        const pRank = game.rankingSystem.checkRank('score', score);

        this.addRow(statsList, 'SECTORS COMPLETED', sectors, 'score', 'SCS', { grade: sInfo.grade, rank: sRank });
        this.addRow(statsList, 'TOTAL COLLECTED', collected, 'coin', 'PCS', { grade: cInfo.grade, rank: cRank });
        this.addRow(statsList, 'FINAL SCORE', score, 'score', 'PTS', { grade: pInfo.grade, rank: pRank });
    }

    _renderFlightStats(statsList, pureFlightScore) {
        const game = this.game;
        this.addRow(statsList, 'Flight Duration Score', pureFlightScore, 'score');

        const groupedBonuses = new Map();
        if (game.flightResults && game.flightResults.bonuses) {
            game.flightResults.bonuses.forEach(b => {
                const entry = groupedBonuses.get(b.name) || { value: 0, coins: 0, count: 0 };
                entry.value += (b.value || 0);
                entry.coins += (b.coins || 0);
                entry.count++;
                groupedBonuses.set(b.name, entry);
            });
        }

        groupedBonuses.forEach((data, name) => {
            const label = data.count > 1 ? `${name} [x ${data.count}]` : name;
            if (data.value > 0) this.addRow(statsList, label, data.value, 'score');
            if (data.coins > 0) {
                const coinLabel = data.value > 0 ? `${label} Coin` : label;
                this.addRow(statsList, coinLabel, data.coins, 'coin');
            }
        });

        let itemCoinTotal = 0;
        if (game.flightResults && game.flightResults.items) {
            game.flightResults.items.forEach(item => {
                if (item.category === 'COIN') itemCoinTotal += (item.score || 0);
                if (item.bonusItems) {
                    item.bonusItems.forEach(b => {
                        if (b.category === 'COIN') itemCoinTotal += (b.score || 0);
                    });
                }
            });
        }

        if (itemCoinTotal > 0) this.addRow(statsList, 'Collected Coins', itemCoinTotal, 'coin');
    }

    _renderItems(itemsList, resultType) {
        const game = this.game;
        const groupedItems = [];
        if (resultType !== 'crashed' && resultType !== 'lost' && game.flightResults && game.flightResults.items) {
            game.flightResults.items.forEach(item => {
                if (!item || !item.id) return;
                const enhStr = JSON.stringify(item.enhancements || {});
                const key = `${item.category}_${item.id}_${enhStr}_${item.charges || -1}_${item.isDelivery || false}_${item.isMatch || false}`;
                
                let group = groupedItems.find(g => g.key === key);
                if (group) {
                    group.count++;
                    if (item.bonusItems) group.bonusItems = [...(group.bonusItems || []), ...item.bonusItems];
                } else {
                    groupedItems.push({ ...item, count: 1, key, bonusItems: item.bonusItems ? [...item.bonusItems] : [] });
                }
            });
        }

        if (groupedItems.length === 0) {
            if (itemsList) itemsList.innerHTML = `
                <div class="slot-placeholder">
                    <div class="part-header"><span class="part-name" style="opacity: 0.5;">NO ITEMS COLLECTED</span></div>
                    <span class="part-info">回収アイテムなし</span>
                </div>
            `;
        } else {
            // ストーリー解放チェック
            if (game.storySystem.hasUnlockedThisFlight) {
                const latestId = game.storySystem.sessionUnlocked[game.storySystem.sessionUnlocked.length - 1];
                const storyData = STORY_DATA[latestId];
                if (storyData) {
                    this._addStoryCard(itemsList, storyData, latestId);
                }
            }

            groupedItems.forEach(item => {
                this._addItemCard(itemsList, item);
                if (item.bonusItems && item.bonusItems.length > 0) {
                    this._renderBonusItems(itemsList, item.bonusItems);
                }
            });
        }
    }

    _addStoryCard(itemsList, storyData, latestId) {
        const card = document.createElement('div');
        card.className = 'stagger-in';
        card.style.animationDelay = `${this._resultDelay}s`;
        this._resultDelay += 0.07;
        card.innerHTML = UIComponents.generateStoryCardHTML({ ...storyData, id: latestId }, this.game.storySystem.isRead(latestId));
        itemsList.appendChild(card);
    }

    _addItemCard(itemsList, item) {
        const card = document.createElement('div');
        card.className = 'reward-item-card stagger-in';
        card.style.animationDelay = `${this._resultDelay}s`;
        this._resultDelay += 0.07;
        card.innerHTML = UIComponents.generateCardHTML(item, { clickable: false });
        itemsList.appendChild(card);
    }

    _renderBonusItems(itemsList, bonusItems) {
        const groupedBonuses = [];
        bonusItems.forEach(b => {
            const bKey = `${b.id}_${JSON.stringify(b.enhancements || {})}_${b.charges || -1}`;
            let bg = groupedBonuses.find(g => g.key === bKey);
            if (bg) bg.count++;
            else groupedBonuses.push({ ...b, count: 1, key: bKey });
        });

        groupedBonuses.forEach(bonus => {
            const bonusCard = document.createElement('div');
            bonusCard.className = 'reward-item-card stagger-in';
            bonusCard.style.animationDelay = `${this._resultDelay}s`;
            this._resultDelay += 0.07;
            bonusCard.innerHTML = UIComponents.generateCardHTML(bonus, { indent: 16, clickable: false });
            itemsList.appendChild(bonusCard);
        });
    }

    addRow(parent, label, value, colorClass, unit = '', extra = null) {
        if (!parent) return;
        const row = document.createElement('div');
        row.className = 'result-row stagger-in';
        if (extra) row.classList.add('terminal-report-row');

        row.style.animationDelay = `${this._resultDelay}s`;
        const displayValue = typeof value === 'number' ? 
            (value >= 0 ? '+' : '') + value.toLocaleString() : 
            value;
        const unitText = unit ? ` ${unit}` : '';
        
        let html = `
            <div class="main-content">
                <span class="label">${label}</span>
                <span class="value ${colorClass}">${displayValue}${unitText}</span>
            </div>
        `;

        if (extra) {
            html = `
                <div class="main-content">
                    <span class="label">${label}</span>
                    <span class="value ${colorClass}">${displayValue}${unitText}</span>
                </div>
                <div class="extra-info">
                    <span class="rank-label ${extra.rank <= 3 ? 'top-rank' : ''}">${extra.rank ? `${extra.rank}${(extra.rank === 1 ? 'st' : (extra.rank === 2 ? 'nd' : (extra.rank === 3 ? 'rd' : 'th')))}` : 'OUT OF RANK'} IN RANKINGS</span>
                    <span class="grade-tag grade-${extra.grade.toLowerCase()}">${extra.grade}</span>
                </div>
            `;
        }

        row.innerHTML = html;
        parent.appendChild(row);
        this._resultDelay += 0.1;
    }
}
