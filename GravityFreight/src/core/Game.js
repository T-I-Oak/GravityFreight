import { Vector2 } from '../utils/Physics.js';
import { INITIAL_COINS, ITEM_REGISTRY, RARITY, ANIMATION_DURATION } from './Data.js';
import { InventorySystem } from '../systems/InventorySystem.js';
import { EconomySystem } from '../systems/EconomySystem.js';
import { AssemblySystem } from '../systems/AssemblySystem.js';
import { MissionSystem } from '../systems/MissionSystem.js';
import { PhysicsOrchestrator } from '../systems/PhysicsOrchestrator.js';
import { UISystem } from '../systems/UISystem.js';
import { EventSystem } from '../systems/EventSystem.js';
import { Renderer } from '../systems/RenderingSystem.js';
import { RankingSystem } from '../systems/RankingSystem.js';
import { StorySystem } from '../systems/StorySystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { LaunchSystem } from '../systems/LaunchSystem.js';
import { FacilityEventSystem } from '../systems/FacilityEventSystem.js';

export class Game {
    constructor(canvas, ui, starCount = 5) {
        this.version = "0.31.1";
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ui = ui;




        // システムの初期化
        this.inventorySystem = new InventorySystem(this);
        this.economySystem = new EconomySystem(this);
        this.assemblySystem = new AssemblySystem(this);
        this.missionSystem = new MissionSystem(this);
        this.physicsOrchestrator = new PhysicsOrchestrator(this);
        this.uiSystem = new UISystem(this);
        this.eventSystem = new EventSystem(this);
        this.launchSystem = new LaunchSystem(this);
        this.facilityEventSystem = new FacilityEventSystem(this);
        this.rankingSystem = new RankingSystem(this);
        this.storySystem = new StorySystem(this);
        this.audioSystem = new AudioSystem(this);

        this.renderer = new Renderer(canvas, this);
        this.bodies = [];
        this.ship = null;
        this.homeStar = null;
        this.portal = null;
        this.mousePos = new Vector2();
        this.simulatedTime = 0;
        this.accumulator = 0;
        this.fixedDt = 0.002;

        this.currentStarCount = starCount;
        this.instanceCounter = 0;
        this.width = canvas.width;
        this.height = canvas.height;
        this.isPointerDown = false;
        this.isAimingInteraction = false;
        this.activePointers = new Map();
        this.lastPinchDist = 0;
        this.zoom = 0.5;
        this.cameraOffset = new Vector2(0, 0);
        this.mapRotation = 0; // マップの回転角（ラジアン）

        this.inventory = this.inventorySystem.inventory;
        this.coins = INITIAL_COINS;
        this.score = 0;
        this.displayScore = 0;
        this.returnBonus = 0;
        this.displayCoins = 0;
        this.sector = 0;
        this.stageLevel = 0;
        this.totalSectorsCompleted = 0;
        this.launchScore = 0;
        this.launchCoins = 0;
        this.totalDeliveries = 0;
        this.totalCollectedItems = 0;

        this.selection = {
            chassis: null,
            logic: null,
            launcher: null,
            rocket: null,
            modules: {},
            booster: null
        };

        this.flightResults = { baseScore: 0, bonuses: [], items: [], status: '', isHome: false };
        this.pendingGoalBonus = 0;
        this.pendingScore = 0;
        this.pendingCoins = 0;
        this.pendingItems = [];
        this.finishResult = null; // 終了演出の種類 (cleared/crashed/etc.)

        this.isFactoryOpen = false;
        this.dismantleCount = 0;
        this.currentCoinDiscount = 0;

        this.initStage(this.currentStarCount);
        this.state = 'title'; // 初期化
        this.eventSystem.setupListeners();
        this.updateUI();
    }

    /**
     * 【重要】ゲームステートを更新し、必要な副作用（UIの自動展開など）を実行する共通メソッド。
     * 直接 this.state に代入するのではなく、必ずこのメソッドを介して遷移させる。
     */
    setState(newState) {
        if (this.state === newState) return;
        
        // 1. まずステートを確定
        this.state = newState;

        // 2. 副作用の実行
        if (newState === 'building') {
            this.audioSystem.stopFlightSound();
            this.uiSystem.expandPanel();
        }

        if (newState === 'preparing') {
            if (this.missionSystem && this.missionSystem.isGameOver()) {
                this.showResult('gameover');
                this.state = 'gameover';
                this.updateUI();
                return;
            }
            this.stateTimer = 3.5;
            this.audioSystem.playWarp(3.5);
            this.isWarpInitialized = false; // 演出中のマップ更新フラグ
            this.reset();
        }

        this.updateUI();
    }

    // --- Delegation to UISystem ---
    updateUI() { this.uiSystem.updateUI(); }
    animateCoinChange(amt) { this.uiSystem.animateCoinChange(amt); }
    showResult(type) { this.uiSystem.showResult(type); }
    generateCardHTML(data, opts) { return this.uiSystem.generateCardHTML(data, opts); }
    initTradingPost(container) { this.uiSystem.initTradingPost(container); }
    initRepairDock(container) { this.uiSystem.initRepairDock(container); }
    initBlackMarket(container) { this.uiSystem.initBlackMarket(container); }

    // --- Delegation to EventSystem ---
    closeResult() { this.eventSystem.closeResult(); }
    selectOption(type, id) { this.eventSystem.selectOption(type, id); }

    // --- Delegation to LaunchSystem ---
    checkReadyToAim() { this.launchSystem.checkReadyToAim(); }
    launch() { this.launchSystem.launch(); }

    // --- Delegation to FacilityEventSystem ---
    handleEvent(goal) { this.facilityEventSystem.handleEvent(goal); }

    // --- Delegation to Inventory/EconomySystem ---
    selectPart(type, id) { this.eventSystem.selectPart(type, id); }
    calculateValue(item) { return this.economySystem.calculateValue(item); }
    enhanceItem(item) { return this.economySystem.enhanceItem(item); }

    // --- Delegation to AssemblySystem ---
    assembleRocket() { this.assemblySystem.assembleRocket(); }
    validateModules() { this.assemblySystem.validateModules(); }

    // --- Delegation to MissionSystem ---
    initStage(starCount) { this.missionSystem.initStage(starCount); }
    resetStage() { this.missionSystem.initStage(this.currentStarCount); this.updateUI(); }
    isGameOver() { return this.missionSystem.isGameOver(); }
    collectItems(body) { this.missionSystem.collectItems(body); }
    resolveItems(res, goal) { this.missionSystem.resolveItems(res, goal); }
    getWeightedRandomItem(opts) { return this.missionSystem.getWeightedRandomItem(opts); }
    _addItemToInventory(item) { this.inventorySystem.addItem(item); }
    _removeItemFromInventory(cat, id) { return this.inventorySystem.takeItem(cat, id); }

    consumeRocketOnFailure() { this.missionSystem.consumeRocketOnFailure(); }
    getPredictionPoints() { return this.physicsOrchestrator.getPredictionPoints(); }

    incrementCollectedItems(count = 1) {
        this.totalCollectedItems += count;
    }

    handleResize(w, h) {
        const oldW = this.canvas.width;
        const oldH = this.canvas.height;
        this.canvas.width = w;
        this.canvas.height = h;
        this.width = w;
        this.height = h;

        // 中心点の移動に伴う座標補正 (master ブランチの事実に基づく)
        const dx = (w - oldW) / 2;
        const dy = (h - oldH) / 2;
        [...this.bodies, this.ship].forEach(b => {
            if (b && b.position) {
                b.position.x += dx;
                b.position.y += dy;
            }
        });

        if (this.renderer) this.renderer.resize();
    }


    // --- Core Utilities ---
    getWorldPos(screenPos) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        let x = (screenPos.x - centerX - this.cameraOffset.x) / this.zoom;
        let y = (screenPos.y - centerY - this.cameraOffset.y) / this.zoom;
        
        const cos = Math.cos(-this.mapRotation);
        const sin = Math.sin(-this.mapRotation);
        const rx = x * cos - y * sin;
        const ry = x * sin + y * cos;
        
        return new Vector2(rx + centerX, ry + centerY);
    }

    showStatus(message, type) {
        this.uiSystem.showStatus(message, type);
    }

    getScreenPos(worldPos) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const dx = worldPos.x - centerX;
        const dy = worldPos.y - centerY;
        
        const cos = Math.cos(this.mapRotation);
        const sin = Math.sin(this.mapRotation);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        
        return new Vector2(
            rx * this.zoom + centerX + this.cameraOffset.x,
            ry * this.zoom + centerY + this.cameraOffset.y
        );
    }



    reset() {
        if (this.ship) {
            this.ship.velocity = new Vector2(0, 0);
            this.ship.trail = [];
            this.ship.collectedItems = [];
            this.ship.activeBoosterEffect = null;
            // 拡大倍率や重力補正などの一時的なステートをリセット
            this.ship.arcMultiplier = 1.0;
            this.ship.gravityMultiplier = 1.0;
            this.ship.pickupMultiplier = 1.0;
        }
        this.pendingItems = [];
        this.flightResults = { baseScore: 0, bonuses: [], items: [], status: '', isHome: false };
        this.finishResult = null;
        this.accumulator = 0;
    }

    fullReset() {
        // ステート管理: まずタイマーをクリアして割り込みを阻止
        this.eventSystem.clearPendingTimers();
        this.state = 'title';

        // 資金とスコアの初期化 (displayはアニメーションを防ぐために一致させる)
        this.coins = INITIAL_COINS;
        this.displayCoins = INITIAL_COINS;
        this.score = 0;
        this.displayScore = 0;
        this.returnBonus = 0;
        
        this.sector = 0;
        this.stageLevel = 0;
        this.totalSectorsCompleted = 0;
        this.currentStarCount = 5;
        this.totalDeliveries = 0;
        this.launchScore = 0;
        this.launchCoins = 0;
        this.totalCollectedItems = 0;

        // インベントリと選択のリセット
        this.inventorySystem.inventory = { chassis: [], logic: [], launchers: [], rockets: [], modules: [], boosters: [] };
        this.inventory = this.inventorySystem.inventory;
        this.inventorySystem.initStartingInventory();
        
        this.isFactoryOpen = false;
        this.selection = { chassis: null, logic: null, launcher: null, rocket: null, modules: {}, booster: null };
        this.lastHitGoal = null;
        this.storySystem.resetSession();
        this.flightResults = { baseScore: 0, bonuses: [], items: [], status: '', isHome: false };
        this.pendingItems = [];
        this.ship = null;

        // ステージ初期化
        this.initStage(this.currentStarCount);
        
        // 最終的な描画更新
        this.updateUI();
    }

    onMouseDown(e) {
        this.audioSystem.resume();
        if (this.hoveredStar) {
            this.audioSystem.playTick();
        }
        this.isPointerDown = true;
        this.mousePos = new Vector2(e.clientX, e.clientY);
        
        const worldPos = this.getWorldPos(this.mousePos);
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const distFromCenter = worldPos.sub(new Vector2(centerX, centerY)).length();

        // 操作モードの判定 (Technical Spec 6 準拠)
        if (e.shiftKey || e.ctrlKey) {
            this.interactionMode = 'pan';
        } else if (distFromCenter >= this.boundaryRadius) {
            // 外周なら常に回転
            this.interactionMode = 'rotate';
        } else if (this.state === 'aiming' && this.ship) {
            // 内周かつエイミング中ならエイム
            this.interactionMode = 'aim';
        } else {
            // それ以外（内周かつ非エイミング中、または自機なし）ならパン
            this.interactionMode = 'pan';
        }
    }

    onMouseMove(e) {
        const newPos = new Vector2(e.clientX, e.clientY);
        const delta = newPos.sub(this.mousePos);

        if (this.isPointerDown) {
            if (this.interactionMode === 'aim' && this.ship) {
                // エイム方向の調整
                const screenShipPos = this.getScreenPos(this.ship.position);
                const screenAngle = Math.atan2(newPos.y - screenShipPos.y, newPos.x - screenShipPos.x);
                this.ship.rotation = screenAngle - this.mapRotation;
                
                // ロケットの位置を母星表面に同期 (描画の整合性)
                const angle = this.ship.rotation;
                const dist = this.homeStar.radius + 12;
                this.ship.position.x = this.homeStar.position.x + Math.cos(angle) * dist;
                this.ship.position.y = this.homeStar.position.y + Math.sin(angle) * dist;
            } else if (this.interactionMode === 'rotate') {
                // マップの回転
                // 画面上のマップ中心位置（パニング込み）を回転のピボットにする
                const pivotX = this.canvas.width / 2 + this.cameraOffset.x;
                const pivotY = this.canvas.height / 2 + this.cameraOffset.y;
                
                const prevAngle = Math.atan2(this.mousePos.y - pivotY, this.mousePos.x - pivotX);
                const newAngle = Math.atan2(newPos.y - pivotY, newPos.x - pivotX);
                this.mapRotation += (newAngle - prevAngle);
            } else {
                // カメラの移動（パン）
                this.cameraOffset.x += delta.x;
                this.cameraOffset.y += delta.y;
            }
        }
        this.mousePos = newPos;
    }

    onMouseUp() {
        this.isPointerDown = false;
        this.isAimingInteraction = false;
    }

    onWheel(e) {
        const zoomSpeed = 0.001;
        const oldZoom = this.zoom;
        this.zoom = Math.max(0.1, Math.min(2.0, this.zoom * (1 - e.deltaY * zoomSpeed)));
        
        // マウス位置を中心にズームするためのオフセット調整
        const worldMouse = this.getWorldPos(this.mousePos);
        const newScreenMouse = this.getScreenPos(worldMouse);
        this.cameraOffset.x += this.mousePos.x - newScreenMouse.x;
        this.cameraOffset.y += this.mousePos.y - newScreenMouse.y;
    }

    update(dt) {
        if (this.state === 'title') return;

        // 表示系の更新（補間など）およびホバー判定
        this.physicsOrchestrator.updateHover();
        this.uiSystem.update(dt); 

        // 演出バッファ中のワープ処理 (Zoom演出)
        if (this.state === 'preparing') {
            const DURATION = 3.5;
            const progress = (DURATION - this.stateTimer) / DURATION; // 0.0 to 1.0
            
            if (progress < 0.4) {
                // Phase 1: 加速離脱 (Cubic Ease-In)
                const p = progress / 0.4; // 0.0 -> 1.0
                const ease = p * p * p;
                const warpScale = 1.0 + ease * 99.0; // 1.0 -> 100.0
                this.visualZoom = this.zoom * warpScale;
                this.warpEffectSpeed = warpScale;
            } else if (progress < 0.6) {
                // Phase 2: 最高速維持 & 中間地点初期化
                if (!this.isWarpInitialized) {
                    this.sector++;
                    this.stageLevel = this.sector;
                    this.initStage(this.currentStarCount);
                    const isReverse = (this.sector % 5 === 0);
                    const text = isReverse ? `ANOMALY SECTOR ${this.sector} READY` : `SECTOR ${this.sector} READY`;
                    this.uiSystem.showSectorNotification(text, isReverse);
                    this.isWarpInitialized = true;
                }
                this.visualZoom = this.zoom * 100.0;
                this.warpEffectSpeed = 100.0;
            } else {
                // Phase 3: 減速飛来 (Cubic Ease-Out)
                const p = (progress - 0.6) / 0.4; // 0.0 -> 1.0
                const ease = 1 - Math.pow(1 - p, 3); // Cubic decelerating
                const warpScale = 0.01 + ease * 0.99;
                this.visualZoom = this.zoom * warpScale;
                // 星の速度も 100.0 -> 1.0 への減速カーブ
                this.warpEffectSpeed = 100.0 * (1.0 - ease) + 1.0;
            }
        } else {
            this.visualZoom = this.zoom;
            this.warpEffectSpeed = 1.0;
        }

        this.accumulator += dt;
        const maxSteps = 10;
        let steps = 0;
        while (this.accumulator >= this.fixedDt && steps < maxSteps) {
            if (this.state === 'flying' || this.state === 'finishing') {
                this.physicsOrchestrator.step(this.fixedDt);
            }
            this.simulatedTime += this.fixedDt;
            
            // 時間更新の「直後」に共通処理（ソナー音判定等）を行うことで、計算ラグを排除
            this.physicsOrchestrator.updateCommon(this.fixedDt);
            
            this.accumulator -= this.fixedDt;
            steps++;
        }

        if (['finishing', 'cleared', 'crashed', 'lost', 'returned', 'preparing'].includes(this.state)) {
            this.physicsOrchestrator.updateStateTimer(dt);
        }
    }

    draw(dt) {
        this.physicsOrchestrator.draw(this.ctx, dt);
    }
}
