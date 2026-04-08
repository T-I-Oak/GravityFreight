import { GOAL_COLORS, GOAL_NAMES, hexToRgba, GAME_BALANCE, MAP_CONSTANTS } from '../core/Data.js';
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
                    const currentDist = dist(p1, p2);

                    // 1. パンの更新 (前の中心点からの移動分をオフセットに加算)
                    // game.mousePos には前フレームでの中心点が保持されている
                    const dx = m.x - game.mousePos.x;
                    const dy = m.y - game.mousePos.y;
                    game.cameraOffset.x += dx;
                    game.cameraOffset.y += dy;

                    // 2. ズームの更新 (ピンチ距離の変化率を適用)
                    if (game.lastPinchDist > 0 && currentDist > 0) {
                        const scale = currentDist / game.lastPinchDist;
                        
                        // 微小な距離変化（ノイズ）によるガタつきを防ぐ閾値を導入
                        if (Math.abs(currentDist - game.lastPinchDist) > 1.5) {
                            const oldZoom = game.zoom;
                            const newZoom = clamp(oldZoom * scale, 0.1, 2.0);

                            // ズーム中心（現在の中心点 m）の世界座標を固定したままスケールを変更
                            const worldMid = game.getWorldPos(m);
                            game.zoom = newZoom;
                            const newScreenMid = game.getScreenPos(worldMid);
                            game.cameraOffset.x += m.x - newScreenMid.x;
                            game.cameraOffset.y += m.y - newScreenMid.y;
                        }
                    }

                    // ステート更新
                    game.mousePos.x = m.x;
                    game.mousePos.y = m.y;
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
                game.audioSystem.playTick();
                game.isFactoryOpen = (btn.getAttribute('data-tab') === 'factory');
                game.updateUI();
            };
        });

        // 組み立てボタン
        const buildBtn = document.getElementById('build-btn');
        if (buildBtn) {
            buildBtn.onclick = () => {
                game.audioSystem.playTick();
                game.assemblySystem.assembleRocket();
            };
        }

        // 発射ボタン
        const launchBtn = document.getElementById('launch-btn');
        if (launchBtn) {
            launchBtn.onclick = () => {
                game.audioSystem.playTick();
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

        // Map buttons
        const viewMapBtn = document.getElementById('result-view-map-btn');
        if (viewMapBtn) {
            viewMapBtn.onclick = () => {
                game.audioSystem.playTick();
                game.uiSystem.enterMapViewMode();
            };
        }

        const backToResultBtn = document.getElementById('back-to-result-btn');
        if (backToResultBtn) {
            backToResultBtn.onclick = () => {
                game.audioSystem.playTick();
                game.uiSystem.exitMapViewMode();
            };
        }

        // ターミナルパネルの開閉
        const collapseBtn = document.getElementById('terminal-collapse-btn');
        if (collapseBtn) {
            collapseBtn.onclick = () => {
                game.audioSystem.playTick();
                const terminalPanel = document.getElementById('terminal-panel');
                terminalPanel.classList.toggle('collapsed');
                const icon = collapseBtn.querySelector('.icon');
                if (icon) {
                    icon.textContent = terminalPanel.classList.contains('collapsed') ? '∨' : '∧';
                }
            };
        }

        // インベントリの各タブ
        const sectionTabs = document.querySelectorAll('.section-tab');
        sectionTabs.forEach(tab => {
            tab.onclick = () => {
                game.audioSystem.playTick();
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
                game.audioSystem.playTick();
                
                // 【重要】音が鳴り終わる（50ms）まで待機してから重い処理を開始し、音割れを防止する
                setTimeout(() => {
                    const titleScreen = document.getElementById('title-screen');
                    if (titleScreen) {
                        titleScreen.classList.add('hidden'); // CSS transition (1s) が発動
                    }
                    game.setState('preparing');
                }, 50);
            };
        }

        const htpBtn = document.getElementById('how-to-play-btn');
        if (htpBtn) {
            htpBtn.onclick = () => {
                game.audioSystem.playTick();
                const overlay = document.getElementById('how-to-play-overlay');
                if (overlay) overlay.classList.remove('hidden');
            };
        }

        const closeHtpBtn = document.getElementById('close-help-btn');
        if (closeHtpBtn) {
            closeHtpBtn.onclick = () => {
                game.audioSystem.playTick();
                const overlay = document.getElementById('how-to-play-overlay');
                if (overlay) overlay.classList.add('hidden');
            };
        }
    }

    selectPart(type, instanceId) {
        this.game.audioSystem.playConfirm();
        this.game.inventorySystem.selectPart(type, instanceId);
    }

    selectOption(type, instanceId) {
        const game = this.game;
        if (type === 'modules') {
            const sel = game.selection;
            const current = sel.modules[instanceId] || 0;
            const item = game.inventory.modules.find(o => o.instanceId === instanceId);
            if (!item) return;

            // 次のクリックでの予測状況を確認
            // すでに上限ならサイクルリセット（0）
            const nextCount = current + 1;
            const projected = game.assemblySystem.getModuleSlotStatus(instanceId, 1);
            
            // バリデーション: スタック上限内かつ、全体のスロット上限内か
            const isCountValid = nextCount <= item.count;
            const isSlotValid = !projected.overflow || projected.overflow <= 0;

            if (nextCount > 0 && isCountValid && isSlotValid) {
                game.audioSystem.playConfirm();
                game.inventorySystem.selectOption(instanceId, nextCount);
            } else {
                game.audioSystem.playTick(); // 無効な場合は軽い音
                game.inventorySystem.selectOption(instanceId, 0);
            }
            
            game.checkReadyToAim();
        } else if (type === 'booster') {
            const opt = game.inventory.boosters.find(o => o.instanceId === instanceId);
            game.audioSystem.playConfirm();
            game.selection.booster = (game.selection.booster === opt) ? null : opt;
            game.checkReadyToAim();
        }
    }

    checkReadyToAim() {
        const game = this.game;
        if (game.selection.rocket && game.selection.launcher) {
            game.setState('aiming');
            
            const centerX = game.canvas.width / 2;
            const centerY = game.canvas.height / 2;
            const prevRotation = game.ship ? game.ship.rotation : -Math.PI / 2;
            
            game.ship = {
                position: new Vector2(centerX, centerY - MAP_CONSTANTS.HOME_STAR_RADIUS - GAME_BALANCE.SHIP_START_OFFSET),
                velocity: new Vector2(),
                rotation: prevRotation
            };
            
            // 既存または新規の ship オブジェクトに対してプロパティを保証（初期化漏れを防止）
            game.ship.trail = [];
            game.ship.collectedItems = [];
            game.ship.equippedModules = [];
            game.ship.velocity = new Vector2(0, 0);
            game.ship.isSafeToReturn = false;

            if (game.ship.rotation === undefined) game.ship.rotation = -Math.PI / 2;

            // 位置を母星表面の適切な発射位置に強制リセット (不具合修正)
            const homePos = game.homeStar.position;
            const resetOffset = new Vector2(Math.cos(game.ship.rotation), Math.sin(game.ship.rotation)).scale(game.homeStar.radius + GAME_BALANCE.SHIP_START_OFFSET);
            game.ship.position = homePos.add(resetOffset);

            // 性能計算 (ロケットベース性能 + ランチャー・ブースターの補正)
            const r = game.selection.rocket;
            const l = game.selection.launcher;
            const b = game.selection.booster;

            // 各倍率の初期化 (ロケットとランチャーの基本値を合成)
            let pMult = (l.precisionMultiplier || 1.0) * (r.precisionMultiplier || 1.0);
            let pickMult = (r.pickupMultiplier || 1.0);
            let gMult = (r.gravityMultiplier || 1.0);
            let aMult = (r.arcMultiplier || 1.0);

            if (b) {
                if (b.precisionMultiplier) pMult *= b.precisionMultiplier;
                if (b.pickupMultiplier) pickMult *= b.pickupMultiplier;
                if (b.gravityMultiplier) gMult *= b.gravityMultiplier;
                if (b.arcMultiplier) aMult *= b.arcMultiplier;
            }

            // 装備中モジュールの効果
            game.ship.equippedModules = [];
            if (r.modules) {
                // r.modules は { [instanceId]: moduleItem } の形式
                for (const moduleItem of Object.values(r.modules)) {
                    if (moduleItem) {
                        const count = moduleItem.count || 1;
                        for (let i = 0; i < count; i++) {
                            // 各スロット分のクローンを格納（耐久度を独立して管理するため）
                            const moduleInstance = { ...moduleItem, charges: moduleItem.maxCharges || 0 };
                            game.ship.equippedModules.push(moduleInstance);
                            
                            // ※ モジュール自体の倍率補正は AssemblySystem.js で既に rocket.pickupMultiplier 等に
                            // 合算・乗算されているため、ここでは二重計算を避けるために加算しない。
                        }
                    }
                }
            }

            // ロケットの基本設定を同期
            game.ship.mass = r.mass || 10;
            game.ship.pickupRange = r.pickupRange || 0;
            game.ship.pickupMultiplier = pickMult;
            game.ship.gravityMultiplier = gMult;
            game.ship.arcMultiplier = aMult;
            game.ship.precision = r.totalPrecision * pMult;

            game.updateUI();
        } else {
            game.setState('building');
            // ステートが既に building の場合 setState は何もしないため、明示的に UI を更新する
            game.updateUI();
        }
    }

    launch() {
        const game = this.game;
        if (game.state !== 'aiming') return;
        game.audioSystem.playLaunch();

        const l = game.selection.launcher;
        const r = game.selection.rocket;
        const b = game.selection.booster;

        if (l.charges <= 0) {
            game.showStatus('発射台の残り回数がありません。', 'error');
            return;
        }

        game.setState('flying');
        game.activeBoosterAtLaunch = b ? { ...b } : null;
        game.launchTime = game.simulatedTime;

        if (b) {
            // ブースター独自の航行中効果（閃光推進剤など）
            if (b.gravityMultiplier !== undefined) {
                game.ship.activeBoosterEffect = { ...b };
            }
            // マグネティック・パルス用の基準値を保存
            game.ship.basePickupRange = game.ship.pickupRange;
        }

        let power = l.power * (r.powerMultiplier || 1);
        if (b && b.powerMultiplier) power *= b.powerMultiplier;
        power *= (1 + game.returnBonus);

        const angle = game.ship.rotation;
        const massFactor = Math.sqrt(10 / game.ship.mass);
        game.ship.velocity = new Vector2(Math.cos(angle) * (power * massFactor), Math.sin(angle) * (power * massFactor));

        // 耐久度消費の判定 (v0.17: 高反応燃料などがランチャーの身代わりになるロジック)
        const protectsLauncher = b && b.preventsLauncherWear;

        // 1. ブースターの消費
        if (b) {
            const takenB = game.inventorySystem.takeItem('boosters', b.instanceId, 1);
            if (takenB) {
                const currentCharges = (takenB.charges !== undefined ? takenB.charges : (takenB.maxCharges || 1));
                takenB.charges = currentCharges - 1;
                
                if (takenB.charges > 0) {
                    game.inventorySystem.addItem(takenB, { isNew: false });
                } else if (protectsLauncher) {
                    game.showStatus('燃料が空になりました。', 'info');
                }
            }
            game.selection.booster = null;
        }

        // 2. ランチャーの消費 (保護されていない場合)
        if (!protectsLauncher) {
            const takenL = game.inventorySystem.takeItem('launchers', l.instanceId, 1);
            if (takenL) {
                takenL.charges--;
                if (takenL.charges > 0) {
                    game.inventorySystem.addItem(takenL, { isNew: false });
                } else {
                    game.showStatus('ランチャーの耐久度が尽きました。', 'info');
                }
            }
        }
        game.selection.launcher = null;

        game.launchScore = game.score;
        game.launchCoins = game.coins;
        game.updateUI();
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
            if (game.lastHitGoal) { game.handleEvent(game.lastHitGoal); return; }
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
        document.getElementById('event-continue-btn').onclick = () => {
            game.audioSystem.playTick();
            this.closeEvent();
        };
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

    clearPendingTimers() {
        this.pendingTimers.forEach(timer => clearTimeout(timer));
        this.pendingTimers = [];
    }
}
