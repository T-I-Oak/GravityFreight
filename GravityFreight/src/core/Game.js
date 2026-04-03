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

export class Game {
    constructor(canvas, ui, starCount = 5) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ui = ui;
        this.version = "0.10.2";

        // システムの初期化
        this.inventorySystem = new InventorySystem(this);
        this.economySystem = new EconomySystem(this);
        this.assemblySystem = new AssemblySystem(this);
        this.missionSystem = new MissionSystem(this);
        this.physicsOrchestrator = new PhysicsOrchestrator(this);
        this.uiSystem = new UISystem(this);
        this.eventSystem = new EventSystem(this);

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
        this.displayCoins = 0;
        this.sector = 1;
        this.stageLevel = 1;
        this.launchScore = 0;
        this.launchCoins = 0;
        this.totalDeliveries = 0;

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
        
        // 【仕様】ビデオパネルの自動展開 (ビルド開始時)
        if (newState === 'building') {
            this.uiSystem.expandPanel();
        }

        this.state = newState;
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
    handleEvent(goal) { this.eventSystem.handleEvent(goal); }
    checkReadyToAim() { this.eventSystem.checkReadyToAim(); }
    selectOption(type, id) { this.eventSystem.selectOption(type, id); }
    launch() { this.eventSystem.launch(); }

    // --- Delegation to Inventory/EconomySystem ---
    selectPart(type, id) { this.inventorySystem.selectPart(type, id); }
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
        }
        this.pendingItems = [];
        this.flightResults = { baseScore: 0, bonuses: [], items: [], status: '', isHome: false };
        this.accumulator = 0;
        this.eventSystem.checkReadyToAim();
        this.updateUI();
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
        
        this.sector = 1;
        this.stageLevel = 1;
        this.currentStarCount = 5;
        this.totalDeliveries = 0;
        this.launchScore = 0;
        this.launchCoins = 0;

        // インベントリと選択のリセット
        this.inventorySystem.inventory = { chassis: [], logic: [], launchers: [], rockets: [], modules: [], boosters: [] };
        this.inventory = this.inventorySystem.inventory;
        this.inventorySystem.initStartingInventory();
        
        this.isFactoryOpen = false;
        this.selection = { chassis: null, logic: null, launcher: null, rocket: null, modules: {}, booster: null };
        this.lastHitGoal = null;
        this.flightResults = { baseScore: 0, bonuses: [], items: [], status: '', isHome: false };
        this.pendingItems = [];
        this.ship = null;

        // ステージ初期化
        this.initStage(this.currentStarCount);
        
        // 最終的な描画更新
        this.updateUI();
    }

    onMouseDown(e) {
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
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                const prevAngle = Math.atan2(this.mousePos.y - centerY, this.mousePos.x - centerX);
                const newAngle = Math.atan2(newPos.y - centerY, newPos.x - centerX);
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
        // 表示系の更新（補間など）およびホバー判定
        this.physicsOrchestrator.updateHover();
        this.uiSystem.update(dt); 

        this.accumulator += dt;
        const maxSteps = 10;
        let steps = 0;
        while (this.accumulator >= this.fixedDt && steps < maxSteps) {
            if (this.state === 'flying') {
                this.physicsOrchestrator.step(this.fixedDt);
            }
            this.simulatedTime += this.fixedDt;
            this.accumulator -= this.fixedDt;
            steps++;
        }

        if (['cleared', 'crashed', 'lost', 'returned'].includes(this.state)) {
            this.physicsOrchestrator.updateStateTimer(dt);
        }
    }

    draw() {
        this.physicsOrchestrator.draw(this.ctx);
    }
}
