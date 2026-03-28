import { Vector2 } from '../utils/Physics.js';
import { PARTS, GOAL_NAMES } from '../core/Data.js';

export class EventSystem {
    constructor(game) {
        this.game = game;
    }

    launch() {
        const game = this.game;
        if (game.state === 'aiming') {
            const dir = new Vector2(Math.cos(game.ship.rotation), Math.sin(game.ship.rotation));
            let power = game.selection.launcher ? game.selection.launcher.power : 1200;
            if (game.selection.booster?.powerMultiplier) power *= game.selection.booster.powerMultiplier;

            const rocket = game.selection.rocket;
            game.ship.mass = rocket.mass || 10;
            const massFactor = Math.sqrt(10 / game.ship.mass);
            game.ship.velocity = dir.scale(power * massFactor);

            game.flightResults = { baseScore: 0, bonuses: [], items: [], status: '', isHome: false };
            game.launchScore = game.score;
            game.launchCoins = game.coins;

            game.ship.gravityMultiplier = game.selection.rocket.gravityMultiplier;
            game.ship.pickupRange = game.selection.rocket.pickupRange;
            game.ship.pickupMultiplier = game.selection.rocket.pickupMultiplier;
            game.ship.arcMultiplier = game.selection.rocket.arcMultiplier || 1.0;
            if (game.selection.booster?.arcMultiplier) game.ship.arcMultiplier *= game.selection.booster.arcMultiplier;

            game.activeBoosterAtLaunch = game.selection.booster ? { ...game.selection.booster } : null;
            game.ship.equippedModules = [];
            for (const [mInstId, mData] of Object.entries(game.selection.rocket.modules)) {
                // mData は組み立て時に作成されたクローンオブジェクト
                const count = mData.count || 1;
                for (let i = 0; i < count; i++) {
                    game.ship.equippedModules.push({ ...mData, instanceId: mInstId });
                }
            }

            if (game.selection.booster?.gravityMultiplier !== undefined) {
                game.ship.activeBoosterEffect = {
                    type: 'gravityMultiplier',
                    value: game.selection.booster.gravityMultiplier,
                    duration: game.selection.booster.duration
                };
            }

            if (game.selection.booster) {
                const b = game.selection.booster;
                if (b.maxCharges && b.maxCharges > 1) {
                    if (b.charges === undefined) b.charges = b.maxCharges;
                    b.charges--;
                    if (b.charges <= 0) {
                        game.inventory.boosters = game.inventory.boosters.filter(o => o !== b);
                        game.selection.booster = null;
                    }
                } else {
                    b.count--;
                    if (b.count <= 0) {
                        game.inventory.boosters = game.inventory.boosters.filter(o => o.count > 0);
                        game.selection.booster = null;
                    }
                }
            }

            if (game.selection.launcher && !(game.selection.booster?.preventsLauncherWear)) {
                game.selection.launcher.charges--;
                if (game.selection.launcher.charges <= 0) {
                    game.inventory.launchers = game.inventory.launchers.filter(p => p !== game.selection.launcher);
                    game.selection.launcher = null;
                }
            }

            game.ship.trail = [];
            game.ship.isSafeToReturn = false;
            if (game.homeStar.items?.length > 0) {
                game.homeStar.items.forEach(item => {
                    game.pendingItems.push({ itemData: item, originalBody: game.homeStar, collectedTime: game.simulatedTime });
                });
                game.homeStar.items = [];
            }


            game.state = 'flying';
            game.launchTime = game.simulatedTime;
            game.accumulator = 0;
            game.isFactoryOpen = false;
            game.updateUI();
        } else if (game.state === 'crashed' || game.state === 'cleared') {
            game.reset();
        }
    }

    setupListeners() {
        const game = this.game;

        const updatePointer = (e) => {
            game.mousePos.x = e.clientX;
            game.mousePos.y = e.clientY;
            if (game.state === 'aiming' && game.isPointerDown) {
                const center = game.homeStar.position;
                const mouseWorld = game.getWorldPos(game.mousePos);
                game.ship.rotation = Math.atan2(mouseWorld.y - center.y, mouseWorld.x - center.x);
                
                // 惑星の表面から一定距離(12)の位置に自機を配置
                const offset = new Vector2(Math.cos(game.ship.rotation), Math.sin(game.ship.rotation)).scale(game.homeStar.radius + 12);
                game.ship.position = center.add(offset);
                
                game.updateUI();
            }
        };

        window.addEventListener('pointerdown', (e) => {
            game.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const isUI = e.target !== game.canvas || e.target.closest('#terminal-panel') || e.target.closest('#build-overlay') || e.target.closest('#launch-control') || e.target.closest('#result-overlay') || e.target.closest('#event-screen') || e.target.closest('.tooltip-card-wrapper');
            game.isAimingInteraction = !isUI;
            if (isUI) return;
            game.isPointerDown = true;
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                game.isPanning = true;
                game.panStart = new Vector2(e.clientX, e.clientY);
                game.canvas.style.cursor = 'grabbing';
                e.preventDefault();
                return;
            }
            if (game.activePointers.size === 2) {
                const pts = Array.from(game.activePointers.values());
                game.lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            }
            updatePointer(e);
            if (game.state === 'crashed' || game.state === 'cleared') this.launch();
        });

        window.addEventListener('pointermove', (e) => {
            if (game.isPanning) {
                const dx = e.clientX - game.panStart.x;
                const dy = e.clientY - game.panStart.y;
                game.cameraOffset.x += dx;
                game.cameraOffset.y += dy;
                game.panStart = new Vector2(e.clientX, e.clientY);
                return;
            }
            if (game.activePointers.has(e.pointerId)) game.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (game.activePointers.size === 2) {
                const pts = Array.from(game.activePointers.values());
                const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                if (game.lastPointersPos) {
                    const currentMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
                    const lastMid = { x: (game.lastPointersPos[0].x + game.lastPointersPos[1].x) / 2, y: (game.lastPointersPos[0].y + game.lastPointersPos[1].y) / 2 };
                    game.cameraOffset.x += currentMid.x - lastMid.x; game.cameraOffset.y += currentMid.y - lastMid.y;
                }
                if (game.lastPinchDist > 0) {
                    const factor = dist / game.lastPinchDist;
                    game.zoom = Math.max(0.3, Math.min(game.zoom * factor, 5.0));
                }
                game.lastPinchDist = dist; game.lastPointersPos = pts;
                if (e.cancelable) e.preventDefault();
            } else { game.lastPointersPos = null; updatePointer(e); }
        });

        const endPointer = (e) => {
            if (game.isPanning) { game.isPanning = false; game.canvas.style.cursor = 'crosshair'; }
            game.activePointers.delete(e.pointerId);
            if (game.activePointers.size === 0) { game.isPointerDown = false; game.isAimingInteraction = false; }
            if (game.activePointers.size < 2) game.lastPinchDist = 0;
        };
        window.addEventListener('pointerup', endPointer);
        window.addEventListener('pointercancel', endPointer);

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                game.isFactoryOpen = (btn.getAttribute('data-tab') === 'factory');
                game.updateUI();
            };
        });

        const terminalPanel = document.getElementById('terminal-panel');
        const panelHeader = terminalPanel?.querySelector('.panel-header');
        if (panelHeader) {
            panelHeader.onclick = (e) => {
                if (terminalPanel.classList.contains('collapsed')) { terminalPanel.classList.remove('collapsed'); return; }
                if (e.target.classList.contains('tab-btn')) return;
                terminalPanel.classList.toggle('collapsed');
            };
        }

        window.addEventListener('keydown', (e) => { if (e.code === 'Space') this.launch(); });
        window.addEventListener('wheel', (e) => {
            if (e.deltaY < 0) game.zoom *= 1.1; else game.zoom /= 1.1;
            game.zoom = Math.max(0.3, Math.min(game.zoom, 5.0));
        }, { passive: false });

        document.getElementById('build-btn').onclick = () => game.assembleRocket();
        document.getElementById('launch-btn').onclick = (e) => { e.stopPropagation(); this.launch(); };
        document.getElementById('result-close-btn').onclick = () => game.closeResult();
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
        } else if (type === 'booster') {
            const opt = game.inventory.boosters.find(o => o.instanceId === instanceId);
            game.selection.booster = (game.selection.booster === opt) ? null : opt;
            game.updateUI();
        }
    }

    checkReadyToAim() {
        const game = this.game;
        if (game.selection.rocket && game.selection.launcher) {
            game.state = 'aiming';
            
            // 安全な ship オブジェクトの初期化
            if (!game.ship) {
                const centerX = game.canvas.width / 2;
                const centerY = game.canvas.height / 2;
                game.ship = {
                    position: new Vector2(centerX, centerY - 25 - 12),
                    velocity: new Vector2(),
                    rotation: -Math.PI / 2,
                    trail: [],
                    collectedItems: []
                };
            }
            if (game.ship.rotation === undefined) game.ship.rotation = -Math.PI / 2;

            game.updateUI();
            if (typeof addLog !== 'undefined') addLog("AIMING MODE: PREDICTING ORBIT...");
            
            const r = game.selection.rocket;
            const b = game.selection.booster;
            game.ship.mass = r.mass + (b?.mass || 0);
            game.ship.pickupRange = r.pickupRange + (b?.pickupRange || 0);
            let pMult = r.precisionMultiplier || 1.0;
            let pickMult = r.pickupMultiplier || 1.0;
            let gMult = r.gravityMultiplier || 1.0;
            let aMult = r.arcMultiplier || 1.0;
            if (b) {
                if (b.precisionMultiplier) pMult *= b.precisionMultiplier;
                if (b.pickupMultiplier) pickMult *= b.pickupMultiplier;
                if (b.gravityMultiplier) gMult *= b.gravityMultiplier;
                if (b.arcMultiplier) aMult *= b.arcMultiplier;
            }
            game.ship.pickupMultiplier = pickMult;
            game.ship.gravityMultiplier = gMult;
            game.ship.arcMultiplier = aMult;
            game.ship.precision = r.totalPrecision * pMult;
        } else {
            game.state = 'building';
        }
    }

    closeResult() {
        const game = this.game;
        document.getElementById('result-overlay')?.classList.add('hidden');
        const status = game.flightResults.status;
        if (status === 'success' || status === 'cleared') {
            if (game.lastHitGoal) { game.handleEvent(game.lastHitGoal); return; }
        }
        game.state = 'building';
        if (status !== 'returned') game.selection.rocket = null;
        game.selection.launcher = null;
        game.selection.booster = null;
        game.reset();
    }

    handleEvent(goal) {
        const game = this.game;
        const screen = document.getElementById('event-screen');
        if (!screen) return;
        game.state = 'event';
        const title = document.getElementById('event-location');
        const desc = document.getElementById('event-description');
        const content = document.getElementById('event-content');
        title.textContent = GOAL_NAMES[goal.id];
        if (goal.id === 'SAFE') {
            desc.textContent = 'Orbital supply station for cargo trading.';
            game.uiSystem.initTradingPost(content);
        } else if (goal.id === 'NORMAL') {
            desc.textContent = 'Advanced maintenance and modification facility.';
            game.uiSystem.initRepairDock(content);
        } else if (goal.id === 'DANGER') {
            desc.textContent = 'Unregulated trade hub for rare equipment.';
            game.uiSystem.initBlackMarket(content);
        }
        document.getElementById('event-continue-btn').onclick = () => this.closeEvent();
        screen.classList.remove('hidden');
        game.uiSystem.ensurePanelExpanded();
        game.updateUI();
    }

    closeEvent() {
        const game = this.game;
        document.getElementById('event-screen')?.classList.add('hidden');
        game.currentShopStock = null;
        if (game.missionSystem.isGameOver()) { game.uiSystem.showResult('gameover'); return; }
        game.stageLevel++;
        game.initStage(game.currentStarCount);
        game.state = 'building';
        game.selection.rocket = null;
        game.selection.launcher = null;
        game.selection.booster = null;
        game.reset();
    }
}
