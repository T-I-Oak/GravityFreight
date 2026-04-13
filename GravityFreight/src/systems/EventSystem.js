import { Vector2 } from '../utils/Physics.js';
import { StorageUtils } from '../utils/StorageUtils.js';

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
                        shiftKey: e.shiftKey,
                        ctrlKey: e.ctrlKey
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
                this.game.launchSystem.launch();
            };
        }

        // 結果画面を閉じるボタン
        const closeResultBtn = document.getElementById('result-close-btn');
        if (closeResultBtn) {
            closeResultBtn.onclick = () => {
                game.facilityEventSystem.closeResult();
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
            // チュートリアルなどのオーバーレイが表示されている場合は、背後のゲーム操作を無効化
            const tutorialOverlay = document.getElementById('how-to-play-overlay');
            if (tutorialOverlay && !tutorialOverlay.classList.contains('hidden')) {
                return;
            }

            if (e.key === 'r' || e.key === 'R') {
                // Rキーで結果画面を閉じる（ショートカット）
                if (game.state === 'result') game.facilityEventSystem.closeResult();
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
                game.uiSystem.showTutorial();
            };
        }

        const archiveBtn = document.getElementById('archive-btn');
        if (archiveBtn) {
            archiveBtn.onclick = () => {
                game.audioSystem.playTick();
                game.uiSystem.showArchive();
            };
        }

        // Note: Tutorial navigation button listeners are handled in TutorialUI.js

        // --- 設定パネルの制御 ---
        const settingsBtn = document.getElementById('title-settings-btn');
        const settingsOverlay = document.getElementById('settings-overlay');
        const closeSettingsBtn = document.getElementById('close-settings-btn');
        const settingsDoneBtn = document.getElementById('settings-done-btn');
        const seVolumeSlider = document.getElementById('se-volume-slider');
        const volumeDisplay = document.getElementById('volume-value-display');
        let originalVolume = 0.5;

        if (settingsBtn && settingsOverlay) {
            settingsBtn.onclick = (e) => {
                e.stopPropagation();
                game.audioSystem.playTick();
                
                // 現在の音量を保持（キャンセル用）
                originalVolume = StorageUtils.get('gf_se_volume', 0.5);
                if (seVolumeSlider) seVolumeSlider.value = originalVolume * 100;
                if (volumeDisplay) volumeDisplay.textContent = `${Math.round(originalVolume * 100)}%`;
                
                settingsOverlay.classList.remove('hidden');
            };
        }

        const cancelSettings = () => {
            // 元の音量に戻して閉じる
            game.audioSystem.setVolume(originalVolume);
            settingsOverlay?.classList.add('hidden');
        };

        const confirmSettings = () => {
            game.audioSystem.playTick();
            settingsOverlay?.classList.add('hidden');
        };

        if (closeSettingsBtn) closeSettingsBtn.onclick = cancelSettings;
        if (settingsDoneBtn) settingsDoneBtn.onclick = confirmSettings;
        if (settingsOverlay) {
            settingsOverlay.onclick = (e) => {
                if (e.target === settingsOverlay) cancelSettings();
            };
        }

        if (seVolumeSlider) {
            seVolumeSlider.oninput = () => {
                const val = parseInt(seVolumeSlider.value);
                if (volumeDisplay) volumeDisplay.textContent = `${val}%`;
                game.audioSystem.setVolume(val / 100);
            };
            // 離したときに現在の音量で音を鳴らす
            seVolumeSlider.onchange = () => {
                game.audioSystem.playTick();
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

    clearPendingTimers() {
        this.pendingTimers.forEach(timer => clearTimeout(timer));
        this.pendingTimers = [];
    }
}
