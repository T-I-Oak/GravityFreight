import { GOAL_COLORS, GOAL_NAMES, hexToRgba } from '../core/Data.js';
import { Vector2 } from '../utils/Physics.js';

export class EventSystem {
    constructor(game) {
        this.game = game;
        this.pendingTimers = [];
    }

    setupListeners() {
        const game = this.game;

        const canvas = game.canvas;
        // iPad / Android 対応:
        // `mousedown/mousemove/mouseup` はタッチ環境で発火しないことがあるため、
        // pointer/touch を同じ Game 入力ハンドラへ委譲します。
        const supportsPointer = typeof window !== 'undefined' && 'PointerEvent' in window;
        if (supportsPointer) {
            const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
            const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
            const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

            canvas.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                // pointer の位置を保持（Game 側にも activePointers がある）
                game.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

                // 1本指: 既存の onMouse* ロジックで pan/aim/rotate を決定する
                if (game.activePointers.size === 1) {
                    game.onMouseDown({
                        clientX: e.clientX,
                        clientY: e.clientY,
                        shiftKey: false,
                        ctrlKey: false
                    });
                    return;
                }

                // 2本指以上: aim の干渉を止めて、ここからは pinching/panning を専用処理する
                if (game.activePointers.size >= 2) {
                    game.onMouseUp();
                    const [p1, p2] = [...game.activePointers.values()].slice(0, 2);
                    game.lastPinchDist = dist(p1, p2);
                    const m = mid(p1, p2);
                    game.mousePos.x = m.x;
                    game.mousePos.y = m.y;
                }
            }, { passive: false });
            window.addEventListener('pointermove', (e) => {
                // ホバー判定のために、ボタンが押されているかに関わらず mousePos を最新に保つ
                if (e.pointerType === 'mouse' && game.activePointers.size === 0) {
                    game.mousePos.x = e.clientX;
                    game.mousePos.y = e.clientY;
                }

                if (!game.activePointers.has(e.pointerId)) return;

                e.preventDefault();
                game.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

                const entries = [...game.activePointers.values()];

                // 2本指: ピンチでズーム、中央移動でパン
                if (entries.length >= 2) {
                    const [p1, p2] = entries.slice(0, 2);
                    const m = mid(p1, p2);

                    // hover 判定（star-info）を指の中央に同期
                    game.mousePos.x = m.x;
                    game.mousePos.y = m.y;

                    const oldZoom = game.zoom;
                    const currentDist = dist(p1, p2);
                    if (game.lastPinchDist > 0 && currentDist > 0) {
                        const scale = currentDist / game.lastPinchDist;
                        const newZoom = clamp(oldZoom * scale, 0.1, 2.0);

                        // 中央の世界座標を維持するように cameraOffset を補正
                        const worldMid = game.getWorldPos(m);
                        game.zoom = newZoom;
                        const newScreenMid = game.getScreenPos(worldMid);
                        game.cameraOffset.x += m.x - newScreenMid.x;
                        game.cameraOffset.y += m.y - newScreenMid.y;
                    }

                    game.lastPinchDist = currentDist;
                    return;
                }

                // 1本指 または マウスドラッグ: 既存の onMouseMove に委譲
                if (entries.length === 1) {
                    game.onMouseMove({ clientX: e.clientX, clientY: e.clientY });
                }
            }, { passive: false });
            const up = (e) => {
                if (!game.activePointers.has(e.pointerId)) return;
                e.preventDefault();

                game.activePointers.delete(e.pointerId);

                if (game.activePointers.size <= 0) {
                    game.onMouseUp();
                    game.lastPinchDist = 0;
                    return;
                }

                // 2本指から1本指に戻った場合、残りの指で操作を継続
                if (game.activePointers.size === 1) {
                    const [p] = [...game.activePointers.values()];
                    game.lastPinchDist = 0;
                    game.onMouseDown({
                        clientX: p.x,
                        clientY: p.y,
                        shiftKey: false,
                        ctrlKey: false
                    });
                }
            };
            window.addEventListener('pointerup', up, { passive: false });
            window.addEventListener('pointercancel', up, { passive: false });
        } else {
            canvas.onmousedown = (e) => game.onMouseDown(e);
            window.onmousemove = (e) => game.onMouseMove(e);
            window.onmouseup = (e) => game.onMouseUp(e);

            // pointer 非対応環境向けフォールバック（タッチ）
            canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const t = e.touches && e.touches[0];
                if (!t) return;
                game.onMouseDown({ clientX: t.clientX, clientY: t.clientY, shiftKey: false, ctrlKey: false });
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const t = e.touches && e.touches[0];
                if (!t) return;
                game.onMouseMove({ clientX: t.clientX, clientY: t.clientY });
            }, { passive: false });

            const onTouchEnd = (e) => {
                e.preventDefault();
                game.onMouseUp(e);
            };
            window.addEventListener('touchend', onTouchEnd, { passive: false });
            window.addEventListener('touchcancel', onTouchEnd, { passive: false });
        }
        canvas.onwheel = (e) => {
            e.preventDefault();
            game.onWheel(e);
        };

        // タブ切り替え
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.onclick = () => {
                game.isFactoryOpen = (btn.getAttribute('data-tab') === 'factory');
                game.updateUI();
            };
        });

        // 組み立てボタン
        const buildBtn = document.getElementById('build-btn');
        if (buildBtn) {
            buildBtn.onclick = () => {
                game.assemblySystem.assembleRocket();
            };
        }

        // 発射ボタン
        const launchBtn = document.getElementById('launch-btn');
        if (launchBtn) {
            launchBtn.onclick = () => {
                this.launch();
            };
        }

        // 結果画面を閉じるボタン
        const closeResultBtn = document.getElementById('result-close-btn');
        if (closeResultBtn) {
            closeResultBtn.onclick = () => {
                this.closeResult();
            };
        }

        // ターミナルパネルの開閉
        const collapseBtn = document.getElementById('terminal-collapse-btn');
        if (collapseBtn) {
            collapseBtn.onclick = () => {
                const terminalPanel = document.getElementById('terminal-panel');
                terminalPanel.classList.toggle('collapsed');
                const icon = collapseBtn.querySelector('.icon');
                if (icon) {
                    icon.textContent = terminalPanel.classList.contains('collapsed') ? '∨' : '∧';
                }
            };
        }

        // マップ確認ボタン (リザルト・レシート画面用)
        const checkMapBtn = document.getElementById('result-view-map-btn');
        if (checkMapBtn) {
            checkMapBtn.onclick = () => {
                // 【仕様 2.6】classList を直接操作せず UISystem の専用メソッドを呼ぶ
                game.uiSystem.enterMapViewMode();
                game.updateUI();
            };
        }

        const backToResultBtn = document.getElementById('back-to-result-btn');
        if (backToResultBtn) {
            backToResultBtn.onclick = () => {
                // 【仕様 2.2】classList の直接操作は UISystem のメソッドに閉じる
                // exitMapViewMode() は内部で updateUI() を呼ぶ
                game.uiSystem.exitMapViewMode();
            };
        }

        // インベントリの各タブ
        const sectionTabs = document.querySelectorAll('.section-tab');
        sectionTabs.forEach(tab => {
            tab.onclick = () => {
                const target = tab.getAttribute('data-section');
                const lists = document.querySelectorAll('.inventory-list');
                lists.forEach(l => l.classList.add('hidden'));
                document.getElementById(`${target}-list`)?.classList.remove('hidden');
                
                sectionTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            };
        });

        // キーボードショートカット
        window.onkeydown = (e) => {
            if (e.key === 'r' || e.key === 'R') {
                // Rキーで結果画面を閉じる（ショートカット）
                if (game.state === 'result') this.closeResult();
            }
            if (e.key === 'm' || e.key === 'M') {
                 // Mキーでマップ確認（トグル）
                 const backBtn = document.getElementById('back-to-result-btn');
                 if (backBtn && !backBtn.classList.contains('hidden')) {
                     backBtn.click();
                 } else {
                     checkMapBtn?.click();
                 }
            }
            
            // ゲームオーバー状態ならレシートを再表示
            if (game.state === 'gameover') {
                const receiptOverlay = document.getElementById('receipt-overlay');
                if (receiptOverlay) receiptOverlay.classList.add('active');
            }

            // UIコンテナの表示状態を同期
            game.updateUI();
        };

        // タイトル画面のリスナー
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            startBtn.onclick = () => {
                const titleScreen = document.getElementById('title-screen');
                if (titleScreen) {
                    titleScreen.classList.add('hidden'); // CSS transition (1s) が発動
                }
                game.setState('building');
                game.uiSystem.showSectorNotification(`SECTOR ${game.sector} READY`);
            };
        }

        const htpBtn = document.getElementById('how-to-play-btn');
        if (htpBtn) {
            htpBtn.onclick = () => {
                const overlay = document.getElementById('how-to-play-overlay');
                if (overlay) overlay.classList.remove('hidden');
            };
        }

        const closeHtpBtn = document.getElementById('close-help-btn');
        if (closeHtpBtn) {
            closeHtpBtn.onclick = () => {
                const overlay = document.getElementById('how-to-play-overlay');
                if (overlay) overlay.classList.add('hidden');
            };
        }
    }

    selectPart(type, instanceId) {
        this.game.inventorySystem.selectPart(type, instanceId);
    }

    selectOption(type, instanceId) {
        const game = this.game;
        if (type === 'modules') {
            const current = game.selection.modules[instanceId] || 0;
            const item = game.inventory.modules.find(o => o.instanceId === instanceId);
            if (!item) return;
            game.inventorySystem.selectOption(instanceId, (current < item.count) ? current + 1 : 0);
            game.checkReadyToAim();
        } else if (type === 'booster') {
            const opt = game.inventory.boosters.find(o => o.instanceId === instanceId);
            game.selection.booster = (game.selection.booster === opt) ? null : opt;
            game.checkReadyToAim();
        }
    }

    checkReadyToAim() {
        const game = this.game;
        if (game.selection.rocket && game.selection.launcher) {
            game.setState('aiming');
            
            // 5.1 コーディング原則に基づき、既存 ship オブジェクトがあっても
            // 新しいエイミング開始時にランタイムプロパティを確実に再初期化する。
            if (!game.ship) {
                const centerX = game.canvas.width / 2;
                const centerY = game.canvas.height / 2;
                game.ship = {
                    position: new Vector2(centerX, centerY - 25 - 12),
                    velocity: new Vector2(),
                    rotation: -Math.PI / 2
                };
            }
            
            // 既存または新規の ship オブジェクトに対してプロパティを保証（初期化漏れを防止）
            game.ship.trail = [];
            game.ship.collectedItems = [];
            game.ship.equippedModules = [];
            game.ship.velocity = new Vector2(0, 0);
            game.ship.isSafeToReturn = false;

            if (game.ship.rotation === undefined) game.ship.rotation = -Math.PI / 2;

            // 位置を母星表面の適切な発射位置に強制リセット (不具合修正)
            const homePos = game.homeStar.position;
            const resetOffset = new Vector2(Math.cos(game.ship.rotation), Math.sin(game.ship.rotation)).scale(game.homeStar.radius + 12);
            game.ship.position = homePos.add(resetOffset);

            // 性能計算 (モジュール・ブースターの影響を統合)
            const r = game.selection.rocket;
            const l = game.selection.launcher;
            const b = game.selection.booster;

            let pMult = l.precisionMultiplier || 1.0;
            let pickMult = 1.0;
            let gMult = 1.0;
            let aMult = 1.0;

            if (b) {
                if (b.precisionMultiplier) pMult *= b.precisionMultiplier;
                if (b.pickupMultiplier) pickMult *= b.pickupMultiplier;
                if (b.gravityMultiplier) gMult *= b.gravityMultiplier;
                if (b.arcMultiplier) aMult *= b.arcMultiplier;
            }

            // 装備中モジュールの効果
            game.ship.equippedModules = [];
            if (r.modules) {
                for (const [mid, count] of Object.entries(r.modules)) {
                    const m = game.inventory.modules.find(item => item.id === mid);
                    if (m) {
                        for (let i = 0; i < count; i++) {
                            game.ship.equippedModules.push({ ...m });
                            if (m.precisionMultiplier) pMult *= m.precisionMultiplier;
                            if (m.pickupMultiplier) pickMult *= m.pickupMultiplier;
                            if (m.gravityMultiplier) gMult *= m.gravityMultiplier;
                            if (m.arcMultiplier) aMult *= m.arcMultiplier;
                        }
                    }
                }
            }

            // ロケットの総重量を ship.mass に同期させる
            if (typeof r.mass === 'number') {
                game.ship.mass = r.mass;
            }

            game.ship.pickupRange = 100 * pickMult;
            game.ship.gravityMultiplier = gMult;
            game.ship.arcMultiplier = aMult;
            game.ship.precision = r.totalPrecision * pMult;

            game.updateUI();
        } else {
            game.setState('building');
        }
    }

    launch() {
        const game = this.game;
        if (game.state !== 'aiming') return;

        const l = game.selection.launcher;
        const r = game.selection.rocket;
        const b = game.selection.booster;

        if (l.charges <= 0) {
            game.showStatus('発射台の残り回数がありません。', 'error');
            return;
        }

        game.setState('flying');
        game.activeBoosterAtLaunch = b ? { ...b } : null;

        let power = l.power * (r.powerMultiplier || 1);
        if (b && b.powerMultiplier) power *= b.powerMultiplier;

        const angle = game.ship.rotation;
        const massFactor = Math.sqrt(10 / game.ship.mass);
        game.ship.velocity = new Vector2(Math.cos(angle) * (power * massFactor), Math.sin(angle) * (power * massFactor));

        l.charges--;
        if (l.charges <= 0) {
            game.inventorySystem.takeItem('launchers', l.instanceId);
            game.selection.launcher = null;
            game.showStatus('ランチャーの耐久度が尽きました。', 'info');
        }

        if (b && !b.preventsLauncherWear) {
            // ブースター自体の回数消費が必要な場合はここで行う
        }

        // インベントリから使用したブースターを削除 (Spec 5.3.242)
        if (game.selection.booster) {
            game.inventorySystem.takeItem('boosters', game.selection.booster.instanceId);
            game.selection.booster = null;
        }

        game.launchScore = game.score;
        game.launchCoins = game.coins;
        game.updateUI();
    }

    closeResult() {
        const game = this.game;
        document.getElementById('result-overlay')?.classList.add('hidden');
        const status = game.flightResults.status;

        if (status === 'gameover') {
            window.location.reload();
            return;
        }

        if (status === 'success' || status === 'cleared') {
            if (game.lastHitGoal) { game.handleEvent(game.lastHitGoal); return; }
        }
        game.setState('building');
        if (status !== 'returned') game.selection.rocket = null;
        game.selection.launcher = null;
        game.selection.booster = null;
        game.reset();
        game.missionSystem.checkGameOver();
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
            // ショップごとのダークカラー（V7: 重厚さを追求した暗いトーン）
            const darkColors = { 
                'SAFE': '#008b45',    // 深みのある緑
                'NORMAL': '#1565c0',  // 深みのある青
                'DANGER': '#b71c1c'   // 深みのある赤
            };
            const deepColor = darkColors[goal.id] || color;

            // CSS変数を使用して色と質感を適応
            icon.style.setProperty('--shop-color', deepColor);
            icon.style.setProperty('--shop-bg', hexToRgba(deepColor, 0.2));
            
            // イニシャルの設定 (UnifrakturMaguntia)
            const initials = { 'SAFE': 'T', 'NORMAL': 'R', 'DANGER': 'B' };
            icon.textContent = initials[goal.id] || '';
        }

        if (goal.id === 'SAFE') {
            desc.textContent = '貨物取引やパーツの売買ができる中継基地。';
            game.uiSystem.initTradingPost(content);
        } else if (goal.id === 'NORMAL') {
            desc.textContent = '機体の整備やパーツの解体・強化を行える高度な設備。';
            game.uiSystem.initRepairDock(content);
        } else if (goal.id === 'DANGER') {
            game.currentStarCount++;
            desc.textContent = '通常は流通しない希少なパーツや、性能が強化された一点物のパーツが取引される取引所。';
            game.uiSystem.initBlackMarket(content);
        }
        document.getElementById('event-continue-btn').onclick = () => this.closeEvent();
        screen.classList.remove('hidden');
        game.updateUI();
    }


    closeEvent() {
        const game = this.game;
        document.getElementById('event-screen')?.classList.add('hidden');
        
        game.currentShopStock = null;
        game.tempDismantleResults = null;
        if (game.missionSystem.isGameOver()) { game.uiSystem.showResult('gameover'); return; }
        game.stageLevel++;
        game.sector = game.stageLevel;
        game.initStage(game.currentStarCount);
        game.setState('building');
        game.uiSystem.showSectorNotification(`SECTOR ${game.sector} READY`);
        game.selection.rocket = null;
        game.selection.launcher = null;
        game.selection.booster = null;
        game.reset();
    }

    clearPendingTimers() {
        this.pendingTimers.forEach(timer => clearTimeout(timer));
        this.pendingTimers = [];
    }
}
