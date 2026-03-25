import { PARTS, ITEM_REGISTRY, CATEGORY_COLORS, GOAL_COLORS, GOAL_NAMES, INITIAL_INVENTORY, RARITY, hexToRgba } from './Data.js';
import { PhysicsEngine, Body, Vector2, calculateAcceleration, getDistanceSqToSegment } from './Physics.js';

export class Game {
    constructor(canvas, ui, starCount = 8) {
        this.physics = new PhysicsEngine();
        this.canvas = canvas;
        this.ui = ui;
        this.version = '0.4.12'; // Unified prediction & launch direction (v0.4.12)
        this.state = 'building'; // building, aiming, flying, crashed, cleared

        this.bodies = [];
        this.ship = null;
        this.homeStar = null;
        this.portal = null;
        this.mousePos = new Vector2();
        this.launchTime = 0; // シミュレーション時間ベース
        this.simulatedTime = 0;
        this.accumulator = 0;

        this.fixedDt = 0.002;
        this.zoom = 0.5;
        this.currentStarCount = starCount;
        this.width = canvas.width;
        this.height = canvas.height;
        this.isPointerDown = false;
        this.activePointers = new Map();
        this.lastPinchDist = 0;


        // インベントリの初期化 (数量管理)
        this.inventory = {
            chassis: INITIAL_INVENTORY.chassis.map(c => {
                const base = PARTS.CHASSIS.find(bc => bc.id === c.id);
                return { ...base, count: c.count };
            }),
            logic: INITIAL_INVENTORY.logic.map(l => {
                const base = PARTS.LOGIC.find(bl => bl.id === l.id);
                return { ...base, count: l.count };
            }),
            launchers: INITIAL_INVENTORY.launchers.map(p => {
                const base = PARTS.LAUNCHERS.find(bp => bp.id === p.id);
                return { ...base, charges: p.charges };
            }),
            modules: INITIAL_INVENTORY.modules.map(o => {
                const base = PARTS.MODULES.find(bo => bo.id === o.id);
                return { ...base, count: o.count };
            }),
            boosters: INITIAL_INVENTORY.boosters.map(o => {
                const base = PARTS.BOOSTERS.find(bo => bo.id === o.id);
                return { ...base, count: o.count };
            }),
            rockets: []
        };

        this.score = 0;
        this.displayScore = 0; // 表示用スコア（アニメーション用）
        this.coins = 0;
        this.displayCoins = 0; // 表示用コイン
        this.sector = 1; // セクター数
        this.launchScore = 0; // 発射時のスコア
        this.launchCoins = 0; // 発射時のコイン
        this.pendingGoalBonus = 0; // ゴールボーナスの保留
        this.pendingScore = 0; // その他のボーナスの保留
        this.pendingCoins = 0; // コイン報酬の保留

        // リザルト追跡用
        this.flightResults = {
            baseScore: 0,
            bonuses: [],
            items: [],
            status: '',
            isHome: false
        };
        this.cameraOffset = new Vector2(0, 0); // マップのパン用
        this.nextSectorThresholdBonus = 0; // 次セクターへの出現率ボーナス
        this.activeBoosterAtLaunch = null; // 発射時に使用していたブースター
        this.isPanning = false;
        this.panStart = new Vector2(0, 0);


        this.selection = {
            chassis: null,
            logic: null,
            launcher: null,
            rocket: null,
            modules: {}, // { id: count } 複数選択対応
            booster: null
        };



        this.isFactoryOpen = false; // 建造パネルの表示状態 (初期表示はFLIGHTタブ)

        this.stageLevel = 1; // ステージ進行度
        this.initStage(this.currentStarCount);
        this.setupListeners();
        this.updateUI();
    }

    initStage(starCount = 5) {
        this.currentStarCount = starCount;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.homeStar = new Body(new Vector2(centerX, centerY), 4000, true);
        this.homeStar.radius = 25;
        this.homeStar.isHome = true;

        this.bodies = [this.homeStar];
        this.boundaryRadius = 900; // 世界座標での固定半径（リサイズに依存しない）
        this.goals = [];
        this.initGoals();


        this.generateStars(starCount);
        this.physics.bodies = [...this.bodies];

        // 自機の初期設定
        this.ship = new Body(new Vector2(centerX, centerY - this.homeStar.radius - 12), 10);
        this.ship.collectedItems = [];
        this.ship.lastCollectedStar = null;
        this.ship.pickupRange = 0;
        this.ship.pickupMultiplier = 1;

        this.hoveredStar = null;

        this.state = 'building';
        this.accumulator = 0;
        this.pendingItems = [];

        // 以前はここでロケットがない場合にパネルを強制的に開いていたが、仕様変更により廃止 (v0.4.13)
    }

    initGoals() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 3つの出口タイプ
        const goalTypes = [
            { id: 'SAFE', color: GOAL_COLORS.SAFE, angleWidth: 60, score: 2000, coins: 20, bonusItems: 1, label: GOAL_NAMES.SAFE },
            { id: 'NORMAL', color: GOAL_COLORS.NORMAL, angleWidth: 40, score: 3000, coins: 30, bonusItems: 2, label: GOAL_NAMES.NORMAL },
            { id: 'DANGER', color: GOAL_COLORS.DANGER, angleWidth: 20, score: 5000, coins: 50, bonusItems: 3, label: GOAL_NAMES.DANGER }
        ];

        this.goals = [];
        const baseAngle = Math.random() * Math.PI * 2;
        
        goalTypes.forEach((type, i) => {
            // 互いに120度ほど離した位置に配置
            const targetAngle = baseAngle + (i * Math.PI * 2 / 3) + (Math.random() - 0.5) * 0.4;
            this.goals.push({
                ...type,
                x: centerX,
                y: centerY,
                angle: targetAngle, 
                width: type.angleWidth * Math.PI / 180 
            });
        });
    }

    resetStage() {
        // ステージリセット時にゴールを再生成
        this.initGoals();
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.homeStar.items = [];
        this.bodies = [this.homeStar];
        this.ship = new Body(new Vector2(centerX, centerY - this.homeStar.radius - 12), 10);
        this.ship.collectedItems = [];
        this.ship.lastCollectedStar = null;

        const starCount = this.currentStarCount;
        this.generateStars(starCount);
        this.physics.bodies = [...this.bodies];

        this.state = 'building';
        this.accumulator = 0;
        this.pendingItems = [];
        this.updateUI();
    }




    generateStars(count) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const minDistance = 180;
        const cargoTypes = ['cargo_safe', 'cargo_normal', 'cargo_danger'];
        
        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let pos;
            let tooClose;
            do {
                attempts++;
                tooClose = false;
                const angle = Math.random() * Math.PI * 2;
                // 境界線(900)から確実に内側(最大800程度)に収まるように配置
                const dist = 180 + Math.random() * (this.boundaryRadius - 380);
                pos = new Vector2(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist);
                for (const body of this.bodies) {
                    if (pos.sub(body.position).length() < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                if (attempts > 100) break;
            } while (tooClose);
            
            if (!tooClose) {
                const mass = 5000 + Math.random() * 15000;
                const body = new Body(pos, mass, true);
                
                // 各星に2個のアイテムを配置
                for (let j = 0; j < 2; j++) {
                    const itemData = this.getWeightedRandomItem();
                    if (itemData) {
                        body.items.push(itemData);
                    }
                }
                
                this.bodies.push(body);
            }
        }
    }

    getWorldPos(screenPos) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        // カメラオフセットとズームを考慮して変換
        return new Vector2(
            (screenPos.x - centerX - this.cameraOffset.x) / this.zoom + centerX,
            (screenPos.y - centerY - this.cameraOffset.y) / this.zoom + centerY
        );
    }

    setupListeners() {
        const updatePointer = (e) => {
            // マウス座標はホバー判定のために常に最新を追跡する
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;

            // UI上の操作（ボタン等）の時はエイム操作（自機の向き変更）をスキップする
            if (e.target.closest('#build-overlay') || e.target.closest('#launch-btn')) {
                return;
            }

            // エイム操作自体の実行 (クリック中のみ)
            if (this.state === 'aiming' && this.isPointerDown) {
                const worldPos = this.getWorldPos(this.mousePos);
                const dir = worldPos.sub(this.homeStar.position).normalize();
                this.ship.position = this.homeStar.position.add(dir.scale(this.homeStar.radius + 12));
                this.ship.rotation = Math.atan2(dir.y, dir.x);
            }
        };


        const launch = () => {
            if (this.state === 'aiming') {
                // 方向計算の根拠を mousePos から ship.rotation (ドラッグで確定した向き) に変更
                const dir = new Vector2(Math.cos(this.ship.rotation), Math.sin(this.ship.rotation));
                
                let power = this.selection.launcher ? this.selection.launcher.power : 1200;
                if (this.selection.booster && this.selection.booster.powerMultiplier) {
                    power *= this.selection.booster.powerMultiplier;
                }
                
                const massFactor = Math.sqrt(10 / this.ship.mass);
                this.ship.velocity = dir.scale(power * massFactor);

                // リザルトの初期化
                this.flightResults = {
                    baseScore: 0,
                    bonuses: [],
                    items: [],
                    status: '',
                    isHome: false
                };
                this.launchScore = this.score;
                this.launchCoins = this.coins;

                // 性能と特殊効果の引き継ぎ
                this.ship.gravityMultiplier = this.selection.rocket.totalGravityMultiplier;
                this.ship.pickupRange = this.selection.rocket.totalPickupRange;
                this.ship.pickupMultiplier = this.selection.rocket.totalPickupMultiplier;
                this.ship.arcMultiplier = this.selection.rocket.arcMultiplier || 1.0;

                if (this.selection.booster && this.selection.booster.arcMultiplier) {
                    this.ship.arcMultiplier *= this.selection.booster.arcMultiplier;
                }
                
                this.activeBoosterAtLaunch = this.selection.booster ? { ...this.selection.booster } : null;
                
                // 装備モジュールをBody側へ展開（charges管理のため）
                this.ship.equippedModules = [];
                for (const id in this.selection.rocket.modules) {
                    const count = this.selection.rocket.modules[id];
                    const base = PARTS.MODULES.find(m => m.id === id);
                    if (base) {
                        for (let i = 0; i < count; i++) {
                            this.ship.equippedModules.push({ ...base, charges: base.maxCharges || 0 });
                        }
                    }
                }

                // ブースター特殊効果 (例: 閃光推進剤)
                this.ship.activeBoosterEffect = null;
                if (this.selection.booster && this.selection.booster.gravityMultiplier !== undefined) {
                    this.ship.activeBoosterEffect = {
                        type: 'gravityMultiplier',
                        value: this.selection.booster.gravityMultiplier,
                        duration: this.selection.booster.duration // デフォルト値を廃止し、undefined を許容
                    };
                }

                // ブースターの消費処理
                const preventsWear = this.selection.booster && this.selection.booster.preventsLauncherWear;
                if (this.selection.booster) {
                    const b = this.selection.booster;
                    if (b.maxCharges && b.maxCharges > 1) {
                        // 有耐久ブースター
                        if (b.charges === undefined) b.charges = b.maxCharges;
                        b.charges--;
                        if (b.charges <= 0) {
                            this.inventory.boosters = this.inventory.boosters.filter(o => o !== b);
                            this.selection.booster = null;
                        }
                    } else {
                        // 通常消費型
                        b.count--;
                        if (b.count <= 0) {
                            this.inventory.boosters = this.inventory.boosters.filter(o => o.count > 0);
                            this.selection.booster = null;
                        }
                    }
                }

                // ランチャーの消費処理 (耐久減少を防ぐブースターを使用していない場合のみ)
                if (this.selection.launcher && !preventsWear) {
                    this.selection.launcher.charges--;
                    if (this.selection.launcher.charges <= 0) {
                        this.inventory.launchers = this.inventory.launchers.filter(p => p !== this.selection.launcher);
                        this.selection.launcher = null;
                    }
                }
                
                this.ship.trail = [];
                this.ship.isSafeToReturn = false; 

                // 母星に預けていたアイテムがあれば再装填
                if (this.homeStar.items && this.homeStar.items.length > 0) {
                    this.homeStar.items.forEach(itemData => {
                        this.pendingItems.push({ 
                            itemData: itemData,
                            originalBody: this.homeStar,
                            collectedTime: this.simulatedTime
                        });
                    });
                    this.homeStar.items = []; // ホームを空にする
                }

                this.physics.bodies.push(this.ship);
                this.state = 'flying';
                this.launchTime = this.simulatedTime;
                this.accumulator = 0;
                this.isFactoryOpen = false;
                this.updateUI();
            } else if (this.state === 'crashed' || this.state === 'cleared') {
                this.reset();
            }
        };

        window.addEventListener('pointerdown', (e) => {
            this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            this.isPointerDown = true;

            // 中ボタン(1)またはShift+左ボタン(0)でパン開始
            if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                if (e.target === this.canvas) {
                    this.isPanning = true;
                    this.panStart = new Vector2(e.clientX, e.clientY);
                    this.canvas.style.cursor = 'grabbing';
                    e.preventDefault(); // オートスクロール防止
                    return;
                }
            }

            if (this.activePointers.size === 2) {
                const pts = Array.from(this.activePointers.values());
                this.lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            }

            // UI上のクリックはスルー
            if (e.target.closest('#build-overlay') || e.target.closest('#launch-btn')) return;
            
            // ポインター位置を更新（タップした瞬間に照準を合わせるため）
            updatePointer(e);

            if (this.state === 'crashed' || this.state === 'cleared') {
                launch();
            }
        });

        window.addEventListener('pointermove', (e) => {
            if (this.isPanning) {
                const dx = e.clientX - this.panStart.x;
                const dy = e.clientY - this.panStart.y;
                this.cameraOffset.x += dx;
                this.cameraOffset.y += dy;
                this.panStart = new Vector2(e.clientX, e.clientY);
                return;
            }

            if (this.activePointers.has(e.pointerId)) {
                this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            }

            if (this.activePointers.size === 2) {
                const pts = Array.from(this.activePointers.values());
                const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                
                // 2本指でのパン（移動）
                if (this.lastPointersPos) {
                    const currentMid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
                    const lastMid = { x: (this.lastPointersPos[0].x + this.lastPointersPos[1].x) / 2, y: (this.lastPointersPos[0].y + this.lastPointersPos[1].y) / 2 };
                    this.cameraOffset.x += currentMid.x - lastMid.x;
                    this.cameraOffset.y += currentMid.y - lastMid.y;
                }

                // ズーム
                if (this.lastPinchDist > 0) {
                    const factor = dist / this.lastPinchDist;
                    this.zoom *= factor;
                    this.zoom = Math.max(0.3, Math.min(this.zoom, 5.0));
                }
                this.lastPinchDist = dist;
                this.lastPointersPos = pts;
                
                // ブラウザのピンチズームを防止
                if (e.cancelable) e.preventDefault();
            } else {
                this.lastPointersPos = null;
                updatePointer(e);
            }
        });

        // マップ確認ボタンの制御（リザルト画面トグル）
        const viewMapBtn = document.getElementById('result-view-map-btn');
        const backToResultBtn = document.getElementById('back-to-result-btn');
        const resultOverlay = document.getElementById('result-overlay');
        const launchBtn = document.getElementById('launch-btn');

        if (viewMapBtn && backToResultBtn && resultOverlay) {
            viewMapBtn.onclick = (e) => {
                if (e) e.stopPropagation();
                resultOverlay.classList.add('minimized');
                backToResultBtn.classList.remove('hidden');
                if (launchBtn) launchBtn.classList.add('hidden');
            };
            backToResultBtn.onclick = (e) => {
                if (e) e.stopPropagation();
                resultOverlay.classList.remove('minimized');
                backToResultBtn.classList.add('hidden');
            };
        }

        const endPointer = (e) => {
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = 'crosshair';
            }
            this.activePointers.delete(e.pointerId);
            if (this.activePointers.size === 0) {
                this.isPointerDown = false;
            }
            if (this.activePointers.size < 2) {
                this.lastPinchDist = 0;
            }
        };

        window.addEventListener('pointerup', endPointer);
        window.addEventListener('pointercancel', endPointer);
        // pointeroutはHUD等のUIに重なっただけで発生するため、ドラッグ終了判定には使用しない

        // タブ切り替え処理の追加
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                const tab = btn.getAttribute('data-tab');
                this.isFactoryOpen = (tab === 'factory');
                this.updateUI();
            };
        });

        // パネル全体の最小化（ヘッダー部分クリック）
        const terminalPanel = document.getElementById('terminal-panel');
        const panelHeader = terminalPanel.querySelector('.panel-header');
        const collapseBtnIcon = terminalPanel.querySelector('.collapse-btn .icon');

        const toggleCollapse = () => {
            terminalPanel.classList.toggle('collapsed');
            if (collapseBtnIcon) {
                collapseBtnIcon.textContent = terminalPanel.classList.contains('collapsed') ? '☰' : '∧';
            }
        };

        panelHeader.onclick = (e) => {
            // タブボタンクリック時は開閉しない (ただし、最小化中ならヘッダー全体で復元)
            if (terminalPanel.classList.contains('collapsed')) {
                toggleCollapse();
                return;
            }
            if (e.target.classList.contains('tab-btn')) return;
            toggleCollapse();
        };

        // オートスクロール防止用のダミーリスナー（中ボタン用）
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') launch();
        });

        window.addEventListener('wheel', (e) => {
            if (e.deltaY < 0) this.zoom *= 1.1;
            else this.zoom /= 1.1;
            this.zoom = Math.max(0.3, Math.min(this.zoom, 5.0));
        }, { passive: false });

        document.getElementById('build-btn').onclick = () => this.assembleUnit();

        document.getElementById('launch-btn').onclick = (e) => {
            e.stopPropagation();
            launch();
        };

        const resultCloseBtn = document.getElementById('result-close-btn');
        if (resultCloseBtn) {
            resultCloseBtn.onclick = () => this.closeResult();
        }

    }

    selectPart(type, id) {
        if (type === 'chassis') {
            this.selection.chassis = this.inventory.chassis.find(p => p.id === id);
            // シャーシ変更時はスロット数制限に合わせてアドオンを自動調整
            this.validateModules();
        }
        if (type === 'logic') this.selection.logic = this.inventory.logic.find(p => p.id === id);
        if (type === 'launcher') {
            this.selection.launcher = this.inventory.launchers.find(p => p.id === id);
            this.checkReadyToAim();
        }
        if (type === 'rocket') {
            this.selection.rocket = this.inventory.rockets.find(r => r.id === id);
            this.checkReadyToAim();
        }
        this.updateUI();
    }



    selectOption(type, id) {
        if (type === 'modules') {
            const baseSlots = this.selection.chassis ? this.selection.chassis.slots : 0;
            const itemInInv = this.inventory.modules.find(o => o.id === id);
            if (!itemInInv || itemInInv.count <= 0) return;

            // 現在の使用数と、追加スロットの合計を算出
            let extraSlots = 0;
            let usedCount = 0;
            for (const [optId, count] of Object.entries(this.selection.modules)) {
                const optBase = PARTS.MODULES.find(o => o.id === optId);
                if (optBase) extraSlots += (optBase.slots || 0) * count;
                usedCount += count;
            }

            const totalCapacity = baseSlots + extraSlots;
            const alreadySelected = this.selection.modules[id] || 0;

            if (usedCount < totalCapacity && alreadySelected < itemInInv.count) {
                // 空きスロットがあり、かつ在庫がある場合は追加
                this.selection.modules[id] = alreadySelected + 1;
            } else {
                // 上限に達している、または在庫がない場合はそのアイテムを 0 にリセット
                delete this.selection.modules[id];
            }

            // スロット超過のバリデーション (拡張パーツを外した際などのためのパージ)
            this.validateModules();
        }
        if (type === 'booster') {
            const opt = this.inventory.boosters.find(o => o.id === id);
            this.selection.booster = (this.selection.booster === opt) ? null : opt;
        }
        this.updateUI();
    }

    validateModules() {
        if (!this.selection.chassis) return;

        const baseSlots = this.selection.chassis.slots;
        let extraSlots = 0;
        let usedCount = 0;

        // 現在の状態を確認
        for (const [optId, count] of Object.entries(this.selection.modules)) {
            const optBase = PARTS.MODULES.find(o => o.id === optId);
            if (optBase) extraSlots += (optBase.slots || 0) * count;
            usedCount += count;
        }

        let overflow = usedCount - (baseSlots + extraSlots);
        if (overflow > 0) {
            // 超過分を削除 (登録順の逆から削る)
            const optIds = Object.keys(this.selection.modules);
            for (let i = optIds.length - 1; i >= 0 && overflow > 0; i--) {
                const oid = optIds[i];
                let count = this.selection.modules[oid];
                const toRemove = Math.min(count, overflow);
                this.selection.modules[oid] -= toRemove;
                if (this.selection.modules[oid] <= 0) delete this.selection.modules[oid];
                overflow -= toRemove;
            }
        }
    }

    assembleUnit() {
        if (this.selection.chassis && this.selection.logic) {
            // アドオン（複数）のクローンを作成
            const chassis = this.selection.chassis;
            const logic = this.selection.logic;
            const modules = { ...this.selection.modules };

            // 合計パラメータの算出 (重量、スロット、精度、取得範囲は加算)
            let totalMass = (chassis.mass || 0) + (logic.mass || 0);
            let totalSlots = (chassis.slots || 0) + (logic.slots || 0);
            let totalPrecision = (chassis.precision || 0) + (logic.precision || 0);
            let totalPickupRange = (chassis.pickupRange || 0) + (logic.pickupRange || 0);
            
            // 倍率補正 (全てベース1.0からの乗算)
            let totalMultiplier = (chassis.precisionMultiplier || 1.0) * (logic.precisionMultiplier || 1.0);
            let totalPickupMultiplier = (chassis.pickupMultiplier || 1.0) * (logic.pickupMultiplier || 1.0);
            let totalGravityMultiplier = (chassis.gravityMultiplier || 1.0) * (logic.gravityMultiplier || 1.0);
            let arcMultiplier = 1.0;

            for (const [optId, count] of Object.entries(modules)) {
                const optBase = PARTS.MODULES.find(o => o.id === optId);
                if (optBase) {
                    totalMass += (optBase.mass || 0) * count;
                    totalSlots += (optBase.slots || 0) * count;
                    totalPrecision += (optBase.precision || 0) * count;
                    totalPickupRange += (optBase.pickupRange || 0) * count;
                    
                    if (optBase.precisionMultiplier) {
                        for(let i=0; i<count; i++) totalMultiplier *= optBase.precisionMultiplier;
                    }
                    if (optBase.pickupMultiplier) {
                        for(let i=0; i<count; i++) totalPickupMultiplier *= optBase.pickupMultiplier;
                    }
                    if (optBase.gravityMultiplier) {
                        for(let i=0; i<count; i++) totalGravityMultiplier *= optBase.gravityMultiplier;
                    }
                }
            }

            const rocket = {
                id: Date.now(),
                chassis,
                logic,
                modules,
                totalMass,
                totalSlots,
                totalPrecision,
                totalMultiplier,
                totalPickupRange,
                totalPickupMultiplier,
                totalGravityMultiplier,
                arcMultiplier,
                name: `${chassis.name} + ${logic.name}`
            };
            this.inventory.rockets.push(rocket);

            // 消費
            chassis.count--;
            logic.count--;
            for (const [optId, count] of Object.entries(modules)) {
                const optInv = this.inventory.modules.find(o => o.id === optId);
                if (optInv) optInv.count -= count;
            }

            // 在庫が0になったものを除外 (UI更新のため)
            this.inventory.chassis = this.inventory.chassis.filter(c => c.count > 0);
            this.inventory.logic = this.inventory.logic.filter(l => l.count > 0);
            this.inventory.modules = this.inventory.modules.filter(o => o.count > 0);
            this.inventory.boosters = this.inventory.boosters.filter(o => o.count > 0);

            this.selection.chassis = null;
            this.selection.logic = null;
            this.selection.modules = {};
            // ブースターはFLIGHTタブの選択状態として維持するため、ここではクリアしない

            this.isFactoryOpen = false;
            this.updateUI();
            this.checkGameOver();
        }
    }

    checkReadyToAim() {
        if (this.selection.rocket && this.selection.launcher) {
            const rocket = this.selection.rocket;
            const booster = this.selection.booster;

            this.state = 'aiming';
            
            // ロケットの基本スペックにブースターの効果を適用 (乗算/加算)
            this.ship.mass = rocket.totalMass + (booster ? (booster.mass || 0) : 0);
            this.ship.pickupRange = rocket.totalPickupRange + (booster ? (booster.pickupRange || 0) : 0);
            
            let pMult = rocket.totalMultiplier;
            let pickMult = rocket.totalPickupMultiplier;
            let gMult = rocket.totalGravityMultiplier;
            let aMult = rocket.arcMultiplier;

            if (booster) {
                if (booster.precisionMultiplier) pMult *= booster.precisionMultiplier;
                if (booster.pickupMultiplier) pickMult *= booster.pickupMultiplier;
                if (booster.gravityMultiplier) gMult *= booster.gravityMultiplier;
                if (booster.arcMultiplier) aMult *= booster.arcMultiplier;
            }

            this.ship.pickupMultiplier = pickMult;
            this.ship.gravityMultiplier = gMult;
            this.ship.arcMultiplier = aMult;
            this.ship.precision = rocket.totalPrecision * pMult;
            
            // 飛行用のアドオンインスタンス化 (残り回数管理のため)
            // モジュールは { id, charges, maxCharges, ... } のリストにする
            this.ship.equippedModules = [];
            for (const [id, count] of Object.entries(this.selection.rocket.modules)) {
                const base = PARTS.MODULES.find(m => m.id === id);
                for (let i = 0; i < count; i++) {
                    this.ship.equippedModules.push({ 
                        ...base, 
                        charges: base.maxCharges !== undefined ? base.maxCharges : 1 
                    });
                }
            }

            // 仮保存リストから引き継いで視覚エフェクトを生成（帰還後の再開用）
            this.ship.collectedItems = this.pendingItems.map(p => ({
                color: CATEGORY_COLORS[p.itemData.category] || '#fff',
                timestamp: Date.now()
            }));
            
            // 角度の初期同期 (マウス位置に基づく)
            const worldMouse = this.getWorldPos(this.mousePos);
            const dir = worldMouse.sub(this.homeStar.position).normalize();
            this.ship.position = this.homeStar.position.add(dir.scale(this.homeStar.radius + 12));
            this.ship.rotation = Math.atan2(dir.y, dir.x);
        } else {
            this.state = 'building';
        }
    }


    updateUI() {
        const renderList = (id, items, type, selected) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = '';
            
            if (items.length === 0) {
                const placeholder = document.createElement('div');
                placeholder.className = 'slot-placeholder';
                
                let mainText = 'EMPTY';
                let subText = '在庫なし';
                
                if (type === 'CHASSIS') {
                    mainText = 'シャーシなし';
                    subText = 'スペースドックで調達可能';
                } else if (type === 'LOGIC') {
                    mainText = 'ロジックユニットなし';
                    subText = 'サルベージが必要です';
                } else if (type === 'LAUNCHERS') {
                    mainText = '発射台なし';
                    subText = '回収ミッションが必要です';
                } else if (type === 'MODULES') {
                    mainText = 'モジュールなし';
                    subText = '探索ミッションが必要です';
                } else if (type === 'BOOSTERS') {
                    mainText = 'ブースターなし';
                    subText = '推進技術の研究が必要です';
                }
                
                placeholder.innerHTML = `
                    <div class="part-header">
                        <span class="part-name" style="opacity: 0.5;">${mainText}</span>
                    </div>
                    <span class="part-info">${subText}</span>
                `;
                el.appendChild(placeholder);
                return;
            }

            // アイテム集約ロジック (ID + charges でグループ化)
            const groups = [];
            items.forEach(item => {
                if (!item || !item.id) return;
                
                const charges = item.charges !== undefined ? item.charges : -1;
                let group = groups.find(g => g.id === item.id && g.charges === charges);
                if (!group) {
                    group = { ...item, count: 0, instances: [] };
                    groups.push(group);
                }
                group.count += (item.count !== undefined ? item.count : 1);
                group.instances.push(item);
            });

            groups.forEach(data => {
                const div = document.createElement('div');
                
                // 選択状態の判定
                let selectionCount = 0;
                let isSelected = false;
                if (type === 'modules') {
                    selectionCount = this.selection.modules[data.id] || 0;
                    isSelected = selectionCount > 0;
                } else {
                    // 全インスタンスのいずれかが選択されているか
                    isSelected = data.instances.some(inst => inst === selected);
                }

                div.className = `part-item ${isSelected ? 'selected' : ''}`;
                
                div.innerHTML = this.generateCardHTML(data, {
                    showInventory: true,
                    selectionCount: selectionCount,
                    isSelected: isSelected
                });

                div.onclick = () => {
                    if (type === 'modules' || type === 'booster') {
                        this.selectOption(type, data.id);
                    } else {
                        // 集約された中から未選択のインスタンスを優先的に選ぶ（簡易化のため最初の１つ）
                        this.selectPart(type, data.id);
                    }
                };
                el.appendChild(div);
            });
        };

        // 新HUDの更新
        const sectorDisplay = document.getElementById('sector-display');
        const scoreDisplay = document.getElementById('score-display');
        if (sectorDisplay) sectorDisplay.textContent = this.sector;
        if (scoreDisplay) scoreDisplay.textContent = Math.floor(this.displayScore);
        
        const coinDisplay = document.getElementById('coin-display');
        if (coinDisplay) coinDisplay.textContent = Math.floor(this.displayCoins);
        if (scoreDisplay) scoreDisplay.textContent = Math.floor(this.displayScore).toLocaleString();

        // タブの表示切り替え
        const flightTab = document.getElementById('flight-tab');
        const factoryTab = document.getElementById('factory-tab');
        const tabBtns = document.querySelectorAll('.tab-btn');

        if (this.isFactoryOpen) {
            if (flightTab) flightTab.classList.add('hidden');
            if (factoryTab) factoryTab.classList.remove('hidden');
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'factory'));
        } else {
            if (flightTab) flightTab.classList.remove('hidden');
            if (factoryTab) factoryTab.classList.add('hidden');
            tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-tab') === 'flight'));
        }

        const buildOverlay = document.getElementById('build-overlay');
        const launchBtn = document.getElementById('launch-btn');

        if (this.state === 'building' || this.state === 'aiming') {
            buildOverlay.classList.remove('hidden');
        } else {
            buildOverlay.classList.add('hidden');
        }

        if (launchBtn) {
            launchBtn.disabled = (this.state !== 'aiming');
            // 常に表示するため hidden クラスの操作は行わない
            launchBtn.classList.remove('hidden');
        }
        renderList('chassis-list', this.inventory.chassis, 'chassis', this.selection.chassis);
        renderList('logic-list', this.inventory.logic, 'logic', this.selection.logic);
        renderList('logic-option-list', this.inventory.modules, 'modules', this.selection.modules);
        renderList('acc-option-list', this.inventory.boosters, 'booster', this.selection.booster);

        const buildBtn = document.getElementById('build-btn');
        if (buildBtn) buildBtn.disabled = !(this.selection.chassis && this.selection.logic);

        const rList = document.getElementById('rocket-list');
        if (rList) {
            rList.innerHTML = '';
            if (this.inventory.rockets.length === 0) {
                rList.innerHTML = `
                    <div class="slot-placeholder" id="no-rocket-placeholder" style="cursor: pointer;">
                        <div class="part-header">
                            <span class="part-name" style="opacity: 0.5;">待機中の機体なし</span>
                        </div>
                        <span class="part-info">ASSEMBLY BAYで機体を建造してください</span>
                        <div class="part-info" style="margin-top: 8px; color: #00bcd4; font-size: 0.8em;">[CLICK TO OPEN ASSEMBLY]</div>
                    </div>
                `;
                const placeholder = document.getElementById('no-rocket-placeholder');
                if (placeholder) {
                    placeholder.onclick = () => {
                        this.isFactoryOpen = true;
                        this.updateUI();
                    };
                }
            } else {
                const unitColor = CATEGORY_COLORS.UNIT;
                this.inventory.rockets.forEach(rocket => {
                    const div = document.createElement('div');
                    const isSelected = (this.selection.rocket === rocket);
                    div.className = `unit-item ${isSelected ? 'selected' : ''}`;
                    
                    if (isSelected) {
                        div.style.backgroundColor = hexToRgba(unitColor, 0.45);
                        div.style.borderColor = hexToRgba(unitColor, 0.8);
                    } else {
                        div.style.backgroundColor = hexToRgba(unitColor, 0.15);
                    }

                    div.innerHTML = `<span class="part-name">${rocket.name}</span>`;
                    
                    // アドオン詳細の追加
                    let addonDetails = [];
                    if (rocket.modules) {
                        for (const optId in rocket.modules) {
                            const optBase = PARTS.MODULES.find(o => o.id === optId);
                            if (optBase) addonDetails.push(`${optBase.name} × ${rocket.modules[optId]}`);
                        }
                    }
                    if (rocket.booster) {
                        addonDetails.push(`${rocket.booster.name} × 1`);
                    }
                    
                    if (addonDetails.length > 0) {
                        div.innerHTML += `<div class="unit-details">${addonDetails.join('<br>')}</div>`;
                    }

                    div.onclick = () => this.selectPart('rocket', rocket.id);
                    rList.appendChild(div);
                });
            }
        }

        renderList('launcher-list', this.inventory.launchers, 'launcher', this.selection.launcher);

        // 最小化ボタンのテキスト同期はCSS側で処理するか、toggleCollapse内で行う
    }

    /**
     * 各種UIで共通して使用する、プレミアム感のあるアイテムカードのHTMLを生成
     */
    generateCardHTML(itemData, options = {}) {
        if (!itemData) return '';
        
        const item = itemData; // テンプレート内での参照用
        const category = itemData.category || 'CHASSIS';
        const categoryColor = CATEGORY_COLORS[category] || '#fff';
        const isEnhanced = (itemData.enhancementCount || 0) > 0;
        const selectionCount = options.selectionCount || 0;
        const showInventory = options.showInventory || false;
        const isSelected = options.isSelected || false;

        // --- 1. バッジ・強化星印 ---
        let badge = '';
        if (isEnhanced) {
            badge = `<div class="rarity-badge-star" style="position:absolute; top:-6px; right:-6px; font-size:12px; filter:drop-shadow(0 0 4px ${categoryColor}); z-index:2;">${'★'.repeat(itemData.enhancementCount)}</div>`;
        }

        // --- 2. 数量・耐久表示 ---
        let invInfo = "";
        if (showInventory) {
            if (itemData.charges !== undefined || itemData.maxCharges !== undefined) {
                const max = itemData.maxCharges || 2;
                const current = itemData.charges !== undefined ? itemData.charges : max;
                let segments = '';
                for (let i = 0; i < max; i++) {
                    segments += `<div class="hp-segment ${i < current ? 'active' : ''}" style="width:8px; height:4px; background:${i < current ? categoryColor : 'rgba(255,255,255,0.1)'}; border-radius:1px;"></div>`;
                }
                invInfo = `<div class="hp-gauge" style="display: flex; gap: 2px;">${segments}</div>`;
            } else if (itemData.count > 1) {
                invInfo = `<span class="inventory-badge" style="font-size: 10px; color: rgba(255,255,255,0.6); font-weight:bold;">x ${itemData.count}</span>`;
            }
        }
        const selTag = (selectionCount > 0) ? ` <span class="selection-badge" style="color: #ffcc00; font-weight: bold;">[${selectionCount}]</span>` : '';

        // --- 3. デザインの集約（コンパクトかつプレミアム） ---
        const itemContainerStyle = `
            position: relative;
            border-left: 5px solid ${categoryColor};
            padding: 10px 12px;
            background: ${isSelected ? hexToRgba(categoryColor, 0.25) : 'rgba(255,255,255,0.03)'};
            border-radius: 4px;
            margin-bottom: 2px;
            min-width: 220px;
            transition: all 0.2s ease;
            ${isSelected ? `box-shadow: inset 0 0 15px ${hexToRgba(categoryColor, 0.2)}, 0 0 10px ${hexToRgba(categoryColor, 0.2)};` : ''}
            border-top: 1px solid ${isSelected ? hexToRgba(categoryColor, 0.4) : 'rgba(255,255,255,0.05)'};
            border-right: 1px solid ${isSelected ? hexToRgba(categoryColor, 0.4) : 'rgba(255,255,255,0.05)'};
            border-bottom: 1px solid ${isSelected ? hexToRgba(categoryColor, 0.4) : 'rgba(255,255,255,0.05)'};
        `;

        return `
            <div class="part-item-container" style="${itemContainerStyle}">
                ${badge}
                <div class="part-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                    <span class="part-name" style="font-weight: 800; font-size: 13px; color: #fff;">${item.name || 'Unknown'}${selTag}</span>
                    ${invInfo}
                </div>
                <div class="part-info" style="font-size: 11px; color: rgba(255,255,255,0.7); line-height: 1.4; margin-bottom: 6px;">${item.description || ''}</div>
                <div class="part-stats" style="display: flex; flex-wrap: wrap; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px;">
                    ${(item.slots !== undefined && item.slots > 0) ? `<div class="stat"><span class="label" style="font-size: 8px; color: rgba(255,255,255,0.4); margin-right: 4px;">SLOTS</span><span class="val" style="font-size: 10px; color: #fff; font-weight: bold;">${item.slots}</span></div>` : ''}
                    ${item.score ? `<div class="stat"><span class="label" style="font-size: 8px; color: rgba(255,255,255,0.4); margin-right: 4px;">COINS</span><span class="val" style="font-size: 10px; color: #ffd700; font-weight: bold;">+${item.score}</span></div>` : ''}
                    ${item.precisionMultiplier !== undefined ? `<div class="stat"><span class="label" style="font-size: 8px; color: rgba(255,255,255,0.4); margin-right: 4px;">PRECISION</span><span class="val" style="font-size: 10px; color: #fff; font-weight: bold;">x${item.precisionMultiplier.toFixed(1)}</span></div>` : ''}
                    ${item.pickupMultiplier !== undefined ? `<div class="stat"><span class="label" style="font-size: 8px; color: rgba(255,255,255,0.4); margin-right: 4px;">PICKUP</span><span class="val" style="font-size: 10px; color: #fff; font-weight: bold;">x${item.pickupMultiplier.toFixed(1)}</span></div>` : ''}
                    ${item.gravityMultiplier !== undefined ? `<div class="stat"><span class="label" style="font-size: 8px; color: rgba(255,255,255,0.4); margin-right: 4px;">GRAVITY</span><span class="val" style="font-size: 10px; color: #fff; font-weight: bold;">x${item.gravityMultiplier.toFixed(1)}</span></div>` : ''}
                </div>
            </div>
        `;
    }



    /**
     * アイテムをカテゴリに応じてインベントリに追加するヘルパー
     */
    _addItemToInventory(item) {
        if (!item) return;
        const category = item.category;
        let targetList = null;
        if (category === 'CHASSIS') targetList = this.inventory.chassis;
        if (category === 'LOGIC') targetList = this.inventory.logic;
        if (category === 'LAUNCHERS') targetList = this.inventory.launchers;
        if (category === 'MODULES') targetList = this.inventory.modules;
        if (category === 'BOOSTERS') targetList = this.inventory.boosters;
        if (!targetList) return;

        const existing = targetList.find(i => i.id === item.id && !!i.isEnhanced === !!item.isEnhanced && i.enhancementCount === item.enhancementCount);
        if (existing) {
            if (category === 'LAUNCHERS' || (category === 'BOOSTERS' && item.maxCharges > 1)) {
                existing.charges = Math.min((existing.charges || 0) + 1, item.maxCharges || 2);
            } else {
                if (existing.count !== undefined) existing.count++;
                else existing.count = 2;
            }
        } else {
            if (category === 'LAUNCHERS' || (category === 'BOOSTERS' && item.maxCharges > 1)) {
                targetList.push({ ...item, charges: item.maxCharges || 2 });
            } else {
                targetList.push({ ...item, count: 1 });
            }
        }
    }

    /**
     * アイテムをカテゴリに応じてインベントリから削除するヘルパー
     */
    _removeItemFromInventory(category, id, isEnhanced = false) {
        let targetList = null;
        if (category === 'CHASSIS') targetList = this.inventory.chassis;
        if (category === 'LOGIC') targetList = this.inventory.logic;
        if (category === 'LAUNCHERS') targetList = this.inventory.launchers;
        if (category === 'MODULES') targetList = this.inventory.modules;
        if (category === 'BOOSTERS') targetList = this.inventory.boosters;
        if (!targetList) return;

        const index = targetList.findIndex(i => i.id === id && !!i.isEnhanced === isEnhanced);
        if (index !== -1) {
            const item = targetList[index];
            if (item.count !== undefined && item.count > 1) {
                item.count--;
            } else if (item.charges !== undefined && item.charges > 1) {
                item.charges--;
            } else {
                targetList.splice(index, 1);
            }
        }
    }

    reset() {
        this.physics.bodies = [];
        this.initStage(this.currentStarCount);

        this.ui.message.textContent = '';
        this.accumulator = 0;
        this.checkReadyToAim();
        this.updateUI();
    }

    update(dt) {
        // スコア表示の更新
        const scoreDiff = this.score - this.displayScore;
        const coinDiff = this.coins - this.displayCoins;

        if (Math.abs(scoreDiff) > 0.1 || Math.abs(coinDiff) > 0.1) {
            this.displayScore += scoreDiff * 0.1;
            this.displayCoins += coinDiff * 0.1;
            this.updateUI();
        } else if (this.displayScore !== this.score || this.displayCoins !== this.coins) {
            this.displayScore = this.score;
            this.displayCoins = this.coins;
            this.updateUI();
        }

        // マウスホバー判定 (全ステート共通)
        const worldMouse = this.getWorldPos(this.mousePos);
        this.hoveredStar = null;
        for (const body of this.bodies) {
            const distWorld = worldMouse.sub(body.position).length();
            const distScreen = distWorld * this.zoom;
            // ボディ半径（スクリーン換算） + マージン（スクリーン基準で最低20px確保）
            const hitRadius = (body.radius || 20) * this.zoom + 15;
            
            if (distScreen < hitRadius) {
                this.hoveredStar = body;
                break;
            }
        }

        if (this.state === 'flying') {
            // アイテム取得判定
            if (this.ship) {
                // Magnetic Pulse 効果: 時間経過で範囲拡大
                const booster = this.selection.rocket.booster;
                if (booster && booster.id === 'boost_magnet') {
                    const elapsed = this.simulatedTime - this.launchTime;
                    // 秒間20pxずつ拡大（上限なし）
                    this.ship.pickupRange = (this.selection.rocket.totalPickupRange || 0) + elapsed * 20;
                }

                this.bodies.forEach(body => {
                    if (body === this.homeStar) return;
                    
                    const dist = this.ship.position.sub(body.position).length();
                    const surfaceDist = dist - body.radius;
                    const pickupRadius = (this.ship.pickupRange || 0) * (this.ship.pickupMultiplier || 1);
                    
                    if (surfaceDist <= pickupRadius && !body.isCollected) {
                        this.collectItems(body);
                        body.isCollected = true;
                    }
                });
            }

            if (this.ship && !this.ship.isSafeToReturn) {
                const dist = this.ship.position.sub(this.homeStar.position).length();
                if (dist > this.homeStar.radius + 30) {
                    this.ship.isSafeToReturn = true;
                }
            }


            this.accumulator += dt;
            if (this.accumulator > 0.1) this.accumulator = 0.1;
            while (this.accumulator >= this.fixedDt) {
                const prevPos = new Vector2(this.ship.position.x, this.ship.position.y);
                
                // 物理演算への重力補正適用
                const gravityStep = (pos, bodies, mass) => {
                    const acc = calculateAcceleration(pos, bodies, mass);
                    let mult = this.ship.gravityMultiplier || 1.0;
                    
                    if (this.ship.activeBoosterEffect && this.ship.activeBoosterEffect.type === 'gravityMultiplier') {
                        // 上書きではなく乗算（機体性能と重複可能にする）
                        mult *= this.ship.activeBoosterEffect.value;
                        
                        // duration が指定されている場合のみ減少させる
                        if (this.ship.activeBoosterEffect.duration !== undefined) {
                            this.ship.activeBoosterEffect.duration--;
                            if (this.ship.activeBoosterEffect.duration <= 0) {
                                this.ship.activeBoosterEffect = null;
                            }
                        }
                    }
                    
                    return acc.scale(mult);
                };

                const acc = gravityStep(this.ship.position, this.bodies, this.ship.mass);
                this.ship.velocity = this.ship.velocity.add(acc.scale(this.fixedDt));
                this.ship.position = this.ship.position.add(this.ship.velocity.scale(this.fixedDt));

                this.simulatedTime += this.fixedDt;
                this.accumulator -= this.fixedDt;
                this.score += 1; 

                // 衝突判定をループ内に移動（1ステップごとの判定）
                if (this.checkCollisions(prevPos)) return;

                if (this.ship && this.simulatedTime % 0.01 < this.fixedDt) {
                    this.ship.trail.push(new Vector2(this.ship.position.x, this.ship.position.y));
                    if (this.ship.trail.length > 40) this.ship.trail.shift();
                }

                // ブースター特殊効果 (マグネティック・パルス)
                if (this.activeBoosterAtLaunch && this.activeBoosterAtLaunch.id === 'boost_magnet') {
                    const flightDuration = this.simulatedTime - this.launchTime;
                    // 1秒につき20pxずつ範囲を拡大
                    this.ship.pickupRange = (this.selection.rocket.totalPickupRange) + (flightDuration * 20);
                }
            }
        } else if (['cleared', 'crashed', 'lost', 'returned'].includes(this.state)) {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                this.showResult(this.state);
                this.state = 'result';
                this.updateUI();
            }
        }
    }

    /**
     * サイドパネル（terminal-panel）が最小化されている場合、強制的に展開する
     */
    ensurePanelExpanded() {
        const terminalPanel = document.getElementById('terminal-panel');
        if (terminalPanel && terminalPanel.classList.contains('collapsed')) {
            terminalPanel.classList.remove('collapsed');
            const collapseBtnIcon = terminalPanel.querySelector('.collapse-btn .icon');
            if (collapseBtnIcon) {
                collapseBtnIcon.textContent = '∧';
            }
        }
    }

    findBodyCollision(pos, prevPos, isSafeToReturn) {
        for (const body of this.bodies) {
            // 母星の衝突判定：離れるまでは保護する（isSafeToReturn）
            if (body === this.homeStar && !isSafeToReturn) continue;
            
            const radius = body.radius || (Math.sqrt(body.mass) / 5 + 2);
            const shipRadius = this.ship ? (this.ship.radius || 2) : 2;
            const collisionDist = radius + shipRadius + 1; // 1px margin
            const distSq = getDistanceSqToSegment(body.position, prevPos, pos);
            
            if (distSq < collisionDist * collisionDist) {
                return body;
            }
        }
        return null;
    }

    checkCollisions(prevPos = null) {
        if (!this.ship) return false;
        const shipPos = this.ship.position;
        const startPos = prevPos || shipPos; // 初期位置または前ステップの座標

        const hitBody = this.findBodyCollision(shipPos, startPos, this.ship.isSafeToReturn);
        
        if (hitBody) {
            const body = hitBody;
            if (body === this.homeStar) {
                this.state = 'returned';
                this.stateTimer = 0.8; 
                this.ui.message.textContent = '';
                this.resolveItems('returned'); 
            } else {
                // アドオンによる衝突回避判定
                // 1. Star Breaker (星破壊)
                const breaker = this.ship.equippedModules.find(m => m.id === 'mod_star_breaker' && m.charges > 0);
                if (breaker) {
                    breaker.charges--;
                    this.bodies = this.bodies.filter(b => b !== body); // 星を消滅
                    this.physics.bodies = [...this.bodies, this.ship]; // 物理エンジン同期
                    this.ui.message.textContent = 'STAR DESTROYED!';
                    setTimeout(() => { if(this.state === 'flying') this.ui.message.textContent = ''; }, 1000);
                    return false; // 衝突しなかったことにする
                }

                // 2. Impact Cushion (バウンド)
                const cushion = this.ship.equippedModules.find(m => m.id === 'mod_cushion' && m.charges > 0);
                if (cushion) {
                    cushion.charges--;
                    // 反転・跳ね返り処理（簡易：速度ベクトルを反転させて減速）
                    const shipPos = this.ship.position;
                    const normal = shipPos.sub(body.position).normalize();
                    const dot = this.ship.velocity.dot(normal);
                    this.ship.velocity = this.ship.velocity.sub(normal.scale(2 * dot)).scale(0.5);
                    this.ui.message.textContent = 'IMPACT ABSORBED!';
                    setTimeout(() => { if(this.state === 'flying') this.ui.message.textContent = ''; }, 1000);
                    return false; // 衝突しなかったことにする
                }

                this.state = 'crashed';
                this.stateTimer = 0.8; 
                this.ui.message.textContent = '';
                this.consumeRocketOnFailure(); 
                this.resolveItems('crashed', body); 
            }
            return true;
        }

        const distFromCenter = shipPos.sub(new Vector2(this.canvas.width / 2, this.canvas.height / 2)).length();
        if (distFromCenter >= this.boundaryRadius) {
            // 3. Emergency Thruster (境界での戻り)
            const emergency = this.ship.equippedModules.find(m => m.id === 'mod_emergency' && m.charges > 0);
            if (emergency) {
                emergency.charges--;
                const center = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
                const toCenter = center.sub(shipPos).normalize();
                this.ship.velocity = toCenter.scale(this.ship.velocity.length() * 0.8);
                this.ui.message.textContent = 'EMERGENCY THRUST!';
                setTimeout(() => { if(this.state === 'flying') this.ui.message.textContent = ''; }, 1000);
                return false;
            }
            const shipAngle = Math.atan2(shipPos.y - this.canvas.height / 2, shipPos.x - this.canvas.width / 2);
            
            // いずれかのゴール内に入っているかチェック
            let hitGoal = null;
            const arcBonus = this.ship.arcMultiplier || 1.0;

            for (const goal of this.goals) {
                // 角度の差分を -PI to PI に正規化
                let diff = shipAngle - goal.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                
                if (Math.abs(diff) < (goal.width * arcBonus) / 2) {
                    hitGoal = goal;
                    break;
                }
            }

            if (hitGoal) {
                this.state = 'cleared';
                this.stateTimer = 0.8;
                this.lastHitGoal = hitGoal; // 拠点を保存
                this.pendingGoalBonus = hitGoal.score; // ボーナスを一時保留
                this.pendingCoins += (hitGoal.coins || 0); // ゴールコインを保留
                // ボーナスリストにゴールボーナスを追加
                this.flightResults.bonuses.push({ name: 'Goal Bonus', value: hitGoal.score, coins: hitGoal.coins || 0 });
                this.sector++; // セクター進行
                this.ui.message.textContent = ''; // 冗長なメッセージを削除
                this.resolveItems('success', hitGoal); 
            } else {
                this.state = 'lost';
                this.stateTimer = 0.8;
                this.ui.message.textContent = ''; // 冗長なメッセージを削除
                this.consumeRocketOnFailure();
                this.resolveItems('lost');
            }
            return true;
        }
        return false;
    }

    getPredictionPoints() {
        if (this.state !== 'aiming') return [];
        const points = [];
        // 方向計算の根拠を mousePos から ship.rotation (ドラッグで確定した向き) に変更
        const dir = new Vector2(Math.cos(this.ship.rotation), Math.sin(this.ship.rotation));
        
        const rocket = this.selection.rocket;
        if (!rocket) return [];

        let power = this.selection.launcher ? this.selection.launcher.power : 1200;
        if (this.selection.booster && this.selection.booster.powerMultiplier) {
            power *= this.selection.booster.powerMultiplier;
        }
        const mass = rocket.totalMass;
        
        const massFactor = Math.sqrt(10 / mass);
        let tempVel = dir.scale(power * massFactor);
        let tempPos = this.homeStar.position.add(dir.scale(this.homeStar.radius + 12));
        
        const simDt = this.fixedDt;
        
        // 合計された精度と倍率を使用
        const acc = this.selection.launcher;
        const accBonus = acc ? (acc.precisionMultiplier || 1.0) : 1.0;
        const precision = ((rocket.totalPrecision || 0) + (acc ? (acc.precision || 0) : 0)) * ((rocket.totalMultiplier || 1.0) * accBonus);

        const gravityMultiplier = rocket.totalGravityMultiplier || 1.0;

        let tempIsSafeToReturn = false;
        
        for (let i = 0; i < precision; i++) { 
            if (i % 5 === 0) points.push(new Vector2(tempPos.x, tempPos.y));
            
            const prevTempPos = new Vector2(tempPos.x, tempPos.y); // 前の座標を保存
            const grav = calculateAcceleration(tempPos, this.bodies, mass);
            const acc = grav.scale(gravityMultiplier);
            tempVel = tempVel.add(acc.scale(simDt));
            tempPos = tempPos.add(tempVel.scale(simDt));

            // 予測線内でも距離ベースの保護状態をシミュレーション
            if (!tempIsSafeToReturn) {
                const dist = tempPos.sub(this.homeStar.position).length();
                if (dist > this.homeStar.radius + 30) {
                    tempIsSafeToReturn = true;
                }
            }
            
            // 共通メソッドを使用して衝突判定
            const hitBody = this.findBodyCollision(tempPos, prevTempPos, tempIsSafeToReturn);
            if (hitBody) {
                return points;
            }

            const d = tempPos.sub(new Vector2(this.canvas.width / 2, this.canvas.height / 2)).length();
            if (d > this.boundaryRadius) {
                points.push(new Vector2(tempPos.x, tempPos.y));
                break;
            }
        }
        return points;
    }

    /**
     * パーツの査定額（保険・売買価格のベース）を算出
     */
    calculateValue(item) {
        if (!item) return 0;
        
        // 1. マスタデータの特定 (Data.js の ITEM_REGISTRY からID直接参照)
        const master = ITEM_REGISTRY[item.id] || item;

        // 2. 属性の決定 (個別情報を優先し、なければマスタのデフォルト値を使用)
        const rarity = item.rarity !== undefined ? item.rarity : (master.rarity || RARITY.COMMON);
        const max = item.maxCharges !== undefined ? item.maxCharges : (master.maxCharges || 0);
        const cur = item.charges !== undefined ? item.charges : 0;
        
        // 3. ベース価格の算出 (以前の正しかった仕様: 10/20/30)
        let base = 10;
        if (rarity === RARITY.UNCOMMON) base = 20;
        if (rarity === RARITY.RARE) base = 30;
        
        // 4. コンディション補正 (耐久度)
        const condition = (max > 0) ? (cur + 1) / (max + 1) : 1.0;

        // 5. 強化ボーナス (以前の仕様: 1回につき10%増)
        const enhancementBonus = (item.upgradeCount || item.enhancementCount || 0) * 0.1;
        
        return Math.floor(base * condition * (1 + enhancementBonus));
    }



    /**
     * セクター半径に応じたアイテム出現閾値を取得 (v0.5.1 修正)
     */
    getSectorItemThreshold(radius) {
        // SECTOR_BOUNDS は Data.js で定義されているはずだが、
        // もし参照できない場合や簡略化のために動的に計算
        if (radius < 1000) return 3;
        if (radius < 2000) return 4;
        return 5;
    }

    /**
     * 指定されたアイテムを強化する (v0.5.1 新規追加)
     * @param {Object} item 強化対象のパーツオブジェクト
     */
    enhanceItem(item) {
        if (!item) return;
        
        // 強化回数の管理
        item.enhancementCount = (item.enhancementCount || 0) + 1;
        
        // 有効な強化オプションのリストアップ
        const options = [];
        if (item.slots !== undefined) options.push('slots');
        if (item.precisionMultiplier !== undefined) options.push('precision');
        if (item.pickupMultiplier !== undefined) options.push('pickup');
        if (item.gravityMultiplier !== undefined && item.gravityMultiplier > 0.1) options.push('gravity');
        if (item.maxCharges !== undefined) options.push('charges');

        if (options.length === 0) return;

        // ランダムに1つ適用
        const chosen = options[Math.floor(Math.random() * options.length)];
        
        switch (chosen) {
            case 'slots':
                item.slots += 1;
                break;
            case 'precision':
                item.precisionMultiplier += 0.2;
                break;
            case 'pickup':
                item.pickupMultiplier += 0.2;
                break;
            case 'gravity':
                item.gravityMultiplier = Math.max(0.1, item.gravityMultiplier - 0.1);
                break;
            case 'charges':
                item.maxCharges += 1;
                item.charges = (item.charges || 0) + 1; // 現在のチャージも増やす
                break;
        }
    }

    /**
     * 重み付きアイテム抽選（汎用版）
     */
    getWeightedRandomItem(options = {}) {
        const { 
            thresholdBonus = 0, 
            excludeCargo = false, 
            excludeCoin = false 
        } = options;

        const baseThreshold = this.getSectorItemThreshold();
        const threshold = baseThreshold + thresholdBonus;
        
        // 全パーツリストからフィルタリング
        const pools = [
            { category: 'CHASSIS', list: PARTS.CHASSIS },
            { category: 'LOGIC', list: PARTS.LOGIC },
            { category: 'LAUNCHERS', list: PARTS.LAUNCHERS },
            { category: 'MODULES', list: PARTS.MODULES },
            { category: 'BOOSTERS', list: PARTS.BOOSTERS }
        ];

        if (!excludeCargo) pools.push({ category: 'CARGO', list: PARTS.CARGO });
        if (!excludeCoin) pools.push({ category: 'COIN', list: PARTS.COIN });

        const items = [];
        pools.forEach(p => {
            p.list.forEach(item => {
                let weight = 0;
                if (item.rarity === RARITY.COMMON) weight = 100;
                else if (item.rarity === RARITY.UNCOMMON && threshold >= 5) weight = 30;
                else if (item.rarity === RARITY.RARE && threshold >= 10) weight = 10;
                
                if (weight > 0) items.push({ ...item, category: p.category, weight });
            });
        });

        const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const i of items) {
            rand -= i.weight;
            if (rand <= 0) return i;
        }
        return items[0];
    }

    consumeRocketOnFailure() {
        if (this.selection.rocket) {
            this.inventory.rockets = this.inventory.rockets.filter(r => r !== this.selection.rocket);
        }
    }

    checkGameOver() {
        const hasBuiltRockets = this.inventory.rockets.length > 0;
        // 各カテゴリーの在庫合計を確認
        const chassisCount = this.inventory.chassis.reduce((sum, c) => sum + (c.count || 0), 0);
        const logicCount = this.inventory.logic.reduce((sum, l) => sum + (l.count || 0), 0);
        
        const canBuildRockets = chassisCount > 0 && logicCount > 0;
        const hasLaunchers = this.inventory.launchers.length > 0;

        if (!(hasBuiltRockets || canBuildRockets) || !hasLaunchers) {

            this.state = 'gameover';
            this.ui.message.textContent = 'MISSION FAILED';
        }
    }

    handleResize(width, height) {
        const oldCenter = new Vector2(this.width / 2, this.height / 2);
        const newCenter = new Vector2(width / 2, height / 2);
        const delta = newCenter.sub(oldCenter);

        if (delta.lengthSq() === 0) {
            // サイズが変わっていない場合はキャンバスサイズのみ同期して終了
            this.canvas.width = width;
            this.canvas.height = height;
            return;
        }

        // 全天体を移動して中心を維持
        for (const body of this.bodies) {
            body.position = body.position.add(delta);
        }
        if (this.ship) {
            this.ship.position = this.ship.position.add(delta);
            if (this.ship.trail) {
                this.ship.trail = this.ship.trail.map(p => p.add(delta));
            }
        }

        // ゴールの中心座標を更新
        this.goals.forEach(goal => {
            goal.x = newCenter.x;
            goal.y = newCenter.y;
        });
        // boundaryRadius は固定値（900）を維持するため、ここでは更新しない

        // 保存しているサイズを更新し、キャンバスに適用
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    collectItems(body) {
        if (!body.items || body.items.length === 0) return;

        body.items.forEach(itemData => {
            const category = itemData.category;

            // 仮保存リストへの追加 (構造を統一)
            this.pendingItems.push({ 
                itemData, 
                originalBody: body,
                collectedTime: this.simulatedTime 
            });

            // 視覚エフェクト用リストに追加
            this.ship.collectedItems.push({
                color: CATEGORY_COLORS[category] || '#fff',
                timestamp: Date.now()
            });

            // リザルト用データの蓄積（CARGOはresolveItemsで別途処理するので除く）
            if (category !== 'CARGO') {
                this.flightResults.items.push({ ...itemData });
            }
        });

        // 星側のアイテムを空にして、返還や取得時の重複を防止
        body.items = [];

        this.updateUI();
    }

    resolveItems(result, hitGoal = null) {
        if (result === 'success') {
            // 幸運ブースター等の「成功時」効果を適用 (ゴール到達時のみ)

            if (!this.pendingItems || this.pendingItems.length === 0) {
                this.updateUI(); // 報酬なしでもUI更新
                return;
            }
            
            this.pendingItems.forEach((pItem) => {
                const itemData = pItem.itemData;
                const { category } = itemData;
                const item = itemData; // フラット化されているので itemData = item

                // 1. コイン（COIN）の処理：常に即座に加算
                if (category === 'COIN') {
                    this.coins += item.score || 0;
                    return;
                }

                // 2. 貨物（CARGO）の処理
                if (category === 'CARGO') {
                    if (hitGoal) {
                        // ゴール到達時：特殊効果または配送報酬
                        if (item.nextSectorThresholdBonus) {
                            // 幸運の導き
                            this.nextSectorThresholdBonus = item.nextSectorThresholdBonus;
                            this.flightResults.items.push({ ...itemData, bonusItems: [] });
                        } else if (item.deliveryGoalId) {
                            const isMatch = hitGoal.id === item.deliveryGoalId;
                            if (isMatch) {
                                // 一致配送ボーナス
                                this.pendingScore += 1500;
                                this.pendingCoins += 100;
                                // ボーナスアイテム抽選（threshold +5、CARGO除外）
                                const bonusItemCount = hitGoal.bonusItems || 1;
                                const bonusItems = [];
                                for (let k = 0; k < bonusItemCount; k++) {
                                    const bonus = this.getWeightedRandomItem({ thresholdBonus: 5, excludeCargo: true });
                                    if (bonus) {
                                        bonusItems.push(bonus);
                                        // コインはすぐに加算
                                        if (bonus.category === 'COIN') {
                                            this.pendingCoins += bonus.item.score || 0;
                                        } else {
                                            // その他アイテムはインベントリへ
                                            this._addItemToInventory(bonus);
                                        }
                                    }
                                }
                                this.flightResults.items.push({ ...itemData, isDelivery: true, isMatch: true, bonusItems });
                                this.flightResults.bonuses.push({ name: 'Delivery Bonus', value: 1500, coins: 100 });
                            } else {
                                // 不一致カーゴ: +0pt / +10コイン
                                this.pendingCoins += 10;
                                this.flightResults.items.push({ ...itemData, isDelivery: true, isMatch: false, bonusItems: [] });
                                this.flightResults.bonuses.push({ name: 'Cargo (Unmatched)', value: 0, coins: 10 });
                            }
                        }
                        return; // 消費
                    } else {
                        // 帰還時：母星に一時保管（リング表示）
                        if (!this.homeStar.items) this.homeStar.items = [];
                        this.homeStar.items.push(itemData);
                        this.homeStar.isCollected = false;
                        return;
                    }
                }

                // 2. コイン（COIN）：リザルト演出用に pendingCoins へ蓄積 ＆ アイテムリストに含める
                if (category === 'COIN') {
                    this.pendingCoins += item.score || 0;
                    this.flightResults.items.push(itemData);
                    return;
                }

                // 3. その他パーツ・ブースター（拾い物）：常にインベントリに加算
                let targetList = null;
                if (category === 'CHASSIS') targetList = this.inventory.chassis;
                if (category === 'LOGIC') targetList = this.inventory.logic;
                if (category === 'LAUNCHERS') targetList = this.inventory.launchers;
                if (category === 'MODULES') targetList = this.inventory.modules;
                if (category === 'BOOSTERS') targetList = this.inventory.boosters;

                if (targetList) {
                    const existing = targetList.find(i => i.id === item.id && !!i.isEnhanced === !!item.isEnhanced && i.enhancementCount === item.enhancementCount);
                    if (existing) {
                        if (category === 'LAUNCHERS' || (category === 'BOOSTERS' && item.maxCharges > 1)) {
                            if (existing.charges !== undefined) existing.charges++;
                            else existing.charges = (item.maxCharges || 2);
                            if (existing.charges > (item.maxCharges || 2)) existing.charges = (item.maxCharges || 2);
                        } else {
                            if (existing.count !== undefined) existing.count++;
                            else existing.count = 2;
                        }
                    } else {
                        if (category === 'LAUNCHERS' || (category === 'BOOSTERS' && item.maxCharges > 1)) {
                            targetList.push({ ...item, charges: item.maxCharges || 2 });
                        } else {
                            targetList.push({ ...item, count: 1 });
                        }
                    }
                }
            });
            this.pendingItems = [];

        } else if (result === 'crashed' || result === 'lost') {
            // 大破・行方不明時は獲得アイテムを全て失うため、リザルト表示用リストをクリア
            this.flightResults.items = [];

            // 仮保存アイテムの処理
            if (this.pendingItems && this.pendingItems.length > 0) {
                if (result === 'crashed' && hitGoal) {
                    // CRASH: 取得していたアイテムは衝突した星に全て散布する
                    this.pendingItems.forEach(({ itemData }) => {
                        hitGoal.items.push(itemData);
                        hitGoal.isCollected = false;
                    });
                }
                // LOSTの場合：保険金（もしあれば）を計算
                if (result === 'lost' && this.ship && this.ship.equippedModules) {
                    const insuranceModules = this.ship.equippedModules.filter(m => m.onLostBonus);
                    const rocket = this.selection.rocket;
                    
                    if (insuranceModules.length > 0 && rocket) {
                        let totalUnitValue = 0;
                        if (rocket.chassis) totalUnitValue += this.calculateValue(rocket.chassis);
                        if (rocket.logic) totalUnitValue += this.calculateValue(rocket.logic);
                        if (this.ship.equippedModules) {
                            this.ship.equippedModules.forEach(m => {
                                totalUnitValue += this.calculateValue(m);
                            });
                        }

                        const totalPayout = totalUnitValue * insuranceModules.length;
                        this.pendingCoins += totalPayout;
                        this.flightResults.bonuses.push({ name: 'Insurance Payout', value: 0, coins: totalPayout });
                    }
                }
                this.pendingItems = [];
            }

            if (result === 'crashed') {
                // クラッシュ時、機体の部品を「部品ごとに独立して」50%の確率で散布する
                const rocket = this.selection.rocket;
                if (rocket && hitGoal) {
                    const parts = [];
                    if (rocket.chassis && Math.random() < 0.5) parts.push({ ...rocket.chassis, category: 'CHASSIS' });
                    if (rocket.logic && Math.random() < 0.5) parts.push({ ...rocket.logic, category: 'LOGIC' });
                    if (rocket.modules) {
                        for (const [optId, count] of Object.entries(rocket.modules)) {
                            const optBase = ITEM_REGISTRY[optId];
                            if (optBase) {
                                for(let c=0; c<count; c++) {
                                    if (Math.random() < 0.5) parts.push({ ...optBase, category: 'MODULES' });
                                }
                            }
                        }
                    }
                    if (rocket.booster && Math.random() < 0.5) {
                        parts.push({ ...rocket.booster, category: 'BOOSTERS' });
                    }
                    
                    const droppedParts = parts;

                    droppedParts.forEach(partData => {
                        hitGoal.items.push(partData);
                        hitGoal.isCollected = false; // 再取得可能に
                    });
                }
            }

        } else if (result === 'returned') {
            // 帰還: 取得中のアイテムを振り分ける
            if (this.pendingItems && this.pendingItems.length > 0) {
                this.resolveItems('success');
            }
            this.activeBoosterAtLaunch = null;
        }

        this.updateUI();
    }

    showResult(resultType, details = '') {
        const overlay = document.getElementById('result-overlay');
        const titleEl = document.getElementById('result-title');
        const subtitleEl = document.getElementById('result-subtitle');
        const statsList = document.getElementById('result-stats-list');
        const itemsList = document.getElementById('result-items-list');
        const scoreTotalEl = document.getElementById('result-total-score');
        const coinTotalEl = document.getElementById('result-total-coin');

        if (!overlay) return;

        // 保存用
        this.flightResults.status = resultType;

        // テーマ設定
        overlay.classList.remove('success-theme', 'failure-theme');
        overlay.classList.add((resultType === 'success' || resultType === 'cleared' || resultType === 'returned') ? 'success-theme' : 'failure-theme');

        const statusText = {
            'success': `SECTOR ${this.sector - 1} COMPLETED`,
            'cleared': `SECTOR ${this.sector - 1} COMPLETED`,
            'returned': 'UNIT RECOVERED',
            'crashed': 'SHIP CRASHED',
            'lost': 'LOST IN SPACE'
        };

        titleEl.textContent = statusText[resultType] || 'MISSION END';
        subtitleEl.textContent = '';
        subtitleEl.style.display = 'none';

        // --- スコア・コイン内訳の計算 ---
        const pendingScore = (this.pendingGoalBonus || 0) + (this.pendingScore || 0);
        const pendingCoins = (this.pendingCoins || 0);

        // 合計増加分（HUDへの最終反映用）
        const scoreIncrease = (this.score - this.launchScore) + pendingScore;
        const coinIncrease = (this.coins - this.launchCoins) + pendingCoins;

        // 1. 純粋な飛行継続スコア (ボーナス含まない増加分)
        const pureFlightScore = Math.max(0, this.score - this.launchScore);

        // 2. アイテムとして拾ったコインの合計
        const itemCoinTotal = this.flightResults.items
            .filter(i => i.category === 'COIN')
            .reduce((sum, i) => sum + (i.score || 0), 0);

        // アニメーション用の初期値を HUD にセット
        this.displayScore = this.launchScore;
        this.displayCoins = this.launchCoins;
        this.updateUI();

        // 内部値の最終確定
        this.score += pendingScore;
        this.coins += pendingCoins;
        this.pendingGoalBonus = 0;
        this.pendingScore = 0;
        this.pendingCoins = 0;

        // --- 内訳リストの生成 ---
        if (statsList) statsList.innerHTML = '';
        if (itemsList) itemsList.innerHTML = '';

        let delay = 0.4;

        const addRow = (parent, label, value, colorClass) => {
            const row = document.createElement('div');
            row.className = 'result-row stagger-in';
            row.style.animationDelay = `${delay}s`;
            const sign = value >= 0 ? '+' : '';
            row.innerHTML = `
                <span class="label">${label}</span>
                <span class="value ${colorClass}">${sign}${value.toLocaleString()}</span>
            `;
            parent.appendChild(row);
            delay += 0.1;
        };

        const addDivider = (parent) => {
            const div = document.createElement('div');
            div.className = 'result-divider stagger-in';
            div.style.animationDelay = `${delay}s`;
            parent.appendChild(div);
            delay += 0.05;
        };

        // スコア内訳
        addRow(statsList, 'Flight Duration Score', pureFlightScore, 'score');
        this.flightResults.bonuses
            .filter(b => b.value > 0 && !b.name.toLowerCase().includes('unmatched') && !b.name.toLowerCase().includes('payout') && !(b.coins && b.value === 0))
            .forEach(b => addRow(statsList, b.name, b.value, 'score'));

        // 区切り線
        addDivider(statsList);

        // コイン内訳
        if (itemCoinTotal > 0) {
            addRow(statsList, 'Collected Coins', itemCoinTotal, 'coin');
        }
        // Goal Bonus / Delivery Bonus のコイン分
        this.flightResults.bonuses
            .filter(b => b.coins && b.coins > 0)
            .forEach(b => addRow(statsList, b.name, b.coins, 'coin'));
        // Unmatched Cargo の+10コイン
        this.flightResults.bonuses
            .filter(b => b.name.toLowerCase().includes('unmatched'))
            .forEach(b => addRow(statsList, 'Cargo Reward', b.coins, 'coin'));

        // --- 獲得アイテム (右カラム) ---
        // CARGOは個別表示、それ以外は集約表示
        const cargoItems = [];
        const otherItems = new Map();

        if (resultType !== 'crashed' && resultType !== 'lost') {
            this.flightResults.items.forEach(item => {
                if (!item || !item.id) return;

                if (item.category === 'CARGO') {
                    cargoItems.push(item);
                } else {
                    const id = item.id;
                    const key = `${id}-${item.enhancementCount || 0}`; // 強化レベルも考慮
                    if (otherItems.has(key)) {
                        otherItems.get(key).count++;
                    } else {
                        otherItems.set(key, { data: item, category: item.category, count: 1 });
                    }
                }
            });
        }

        const hasAnyItem = cargoItems.length > 0 || otherItems.size > 0;

        if (!hasAnyItem) {
            if (itemsList) itemsList.innerHTML = '<div class="part-info" style="opacity:0.3;text-align:center;padding:20px;">NO ITEMS COLLECTED</div>';
        } else {
            // CARGOアイテムを表示（配送結果付き）
            cargoItems.forEach(itemData => {
                const categoryColor = CATEGORY_COLORS['CARGO'] || '#00e5ff';
                const card = document.createElement('div');
                card.className = 'reward-item-card stagger-in';
                card.style.animationDelay = `${delay}s`;
                delay += 0.07;

                const isDelivery = itemData.isDelivery;
                const isMatch = itemData.isMatch;
                let badge = '';
                if (isDelivery) {
                    badge = isMatch
                        ? `<span style="color:#44ffbb;font-size:10px;font-weight:800;">✓ DELIVERED</span>`
                        : `<span style="color:#ff7755;font-size:10px;font-weight:800;">✗ UNMATCHED</span>`;
                }

                card.innerHTML = `
                    <div class="part-item" style="border-left:4px solid ${categoryColor};cursor:default;margin-bottom:4px;">
                        <div class="part-header">
                            <span class="part-name">${itemData.name} ${badge}</span>
                        </div>
                        <span class="part-info">${itemData.description || ''}</span>
                    </div>
                `;

                // ボーナスアイテムをインデント表示
                if (isMatch && itemData.bonusItems && itemData.bonusItems.length > 0) {
                    itemData.bonusItems.forEach(bonus => {
                        const bonusColor = CATEGORY_COLORS[bonus.category] || '#fff';
                        const bonusCard = document.createElement('div');
                        bonusCard.className = 'reward-item-card stagger-in';
                        bonusCard.style.animationDelay = `${delay}s`;
                        delay += 0.07;

                        bonusCard.innerHTML = `
                            <div style="padding-left:16px;">
                                <div class="part-item" style="border-left:4px solid ${bonusColor};cursor:default;background:rgba(255,255,255,0.03);">
                                    <div class="part-header">
                                        <span class="part-name" style="font-size:12px;">${bonus.name}</span>
                                    </div>
                                    <span class="part-info">${bonus.category}</span>
                                </div>
                            </div>
                        `;
                        if (itemsList) itemsList.appendChild(bonusCard);
                    });
                }
            });

            // 通常アイテムを集約表示
            otherItems.forEach(item => {
                const categoryColor = CATEGORY_COLORS[item.category] || '#fff';
                const card = document.createElement('div');
                card.className = 'part-item reward-item-card stagger-in';
                card.style.animationDelay = `${delay}s`; // Keep animation delay
                const displayData = { ...item.data, count: item.count };
                // Pass category color for styling inside generateCardHTML
                card.innerHTML = this.generateCardHTML(displayData, { showInventory: true, categoryColor: categoryColor });
                if (itemsList) itemsList.appendChild(card);
                delay += 0.07;
            });
        }

        // リザルト表示
        overlay.classList.remove('hidden');

        // カウントアップアニメーション
        const finalScore = this.score;
        const finalCoins = this.coins;
        setTimeout(() => {
            if (scoreTotalEl) this.animateValue(scoreTotalEl, this.score - pendingScore - this.launchScore, finalScore, 800);
            if (coinTotalEl) this.animateValue(coinTotalEl, this.coins - pendingCoins - this.launchCoins, finalCoins, 800);
        }, delay * 1000);
    }

    /**
     * 数値をカウントアップアニメーションで表示する
     */
    animateValue(el, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const value = Math.floor(progress * (end - start) + start);
            el.textContent = value.toLocaleString();
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    /**
     * イベント画面の開始
     */
    handleEvent(goal) {
        const screen = document.getElementById('event-screen');
        if (!screen) return;

        this.currentEventGoal = goal;
        this.state = 'event';
        this.hasDismantled = false; // 訪問ごとにリセット

        // UI初期化
        const titleEl = document.getElementById('event-location');
        const descEl = document.getElementById('event-description');
        const creditsEl = document.getElementById('event-player-credits');
        const contentEl = document.getElementById('event-content');
        const continueBtn = document.getElementById('event-continue-btn');

        if (creditsEl) creditsEl.textContent = this.coins.toLocaleString();
        if (contentEl) contentEl.innerHTML = ''; // クリア

        // 拠点タイプに応じた初期設定
        const goalLabel = GOAL_NAMES[goal.id];
        titleEl.textContent = goalLabel;

        if (goalLabel === 'TRADING POST') {
            descEl.textContent = 'Orbital supply station for cargo trading.';
            screen.className = 'trading-post-theme';
            this.initTradingPost(contentEl);
        } else if (goalLabel === 'REPAIR DOCK') {
            descEl.textContent = 'Advanced maintenance and modification facility.';
            screen.className = 'repair-dock-theme';
            this.initRepairDock(contentEl);
        } else if (goalLabel === 'BLACK MARKET') {
            descEl.textContent = 'Unregulated trade hub for rare equipment.';
            screen.className = 'black-market-theme';
            this.initBlackMarket(contentEl);
        }

        continueBtn.onclick = () => this.closeEvent();
        screen.classList.remove('hidden');
        this.updateUI();
    }

    /**
     * TRADING POST の初期化
     */
    initTradingPost(container) {
        // 在庫生成 (6個, Parts Only)
        const inventory = [];
        for (let i = 0; i < 6; i++) {
            inventory.push(this.getWeightedRandomItem({ excludeCargo: true, excludeCoin: true }));
        }
        
        // 1個をセール品に (30% off)
        const saleIndex = Math.floor(Math.random() * 6);
        
        const shopSection = document.createElement('div');
        shopSection.className = 'event-shop-section';
        shopSection.innerHTML = '<h3>AVAILABLE STOCK</h3>';
        
        const grid = document.createElement('div');
        grid.className = 'event-grid';
        
        inventory.forEach((itemData, idx) => {
            const isSale = (idx === saleIndex);
            const baseValue = this.calculateValue(itemData);
            let buyPrice = baseValue * 2;
            if (isSale) buyPrice = Math.floor(buyPrice * 0.7);

            const card = document.createElement('div');
            card.className = `event-card ${isSale ? 'sale' : ''}`;
            
            card.innerHTML = `
                <div class="card-body">
                    ${this.generateCardHTML(itemData, { isSelected: isSale })}
                    <div class="card-price">
                        <span class="price-val">${buyPrice}</span><span class="currency">c</span>
                        ${isSale ? '<span class="sale-badge">30% OFF</span>' : ''}
                    </div>
                </div>
                <button class="buy-btn" ${this.coins < buyPrice ? 'disabled' : ''}>BUY</button>
            `;

            const btn = card.querySelector('.buy-btn');
            btn.onclick = () => {
                if (this.coins >= buyPrice) {
                    this.coins -= buyPrice;
                    this._addItemToInventory(itemData);
                    btn.disabled = true;
                    btn.textContent = 'SOLD OUT';
                    document.getElementById('event-player-credits').textContent = this.coins.toLocaleString();
                    this.updateUI();
                }
            };

            grid.appendChild(card);
        });
        
        shopSection.appendChild(grid);
        container.appendChild(shopSection);

        // 売却セクション (インベントリから)
        const sellSection = document.createElement('div');
        sellSection.className = 'event-sell-section';
        sellSection.innerHTML = '<h3>SELL YOUR PARTS</h3>';
        
        const sellGrid = document.createElement('div');
        sellGrid.className = 'event-grid';
        
        // 売却可能なアイテムを抽出 (インベントリ全体)
        const allHoldings = [
            ...this.inventory.chassis.map(i => ({...i, cat:'CHASSIS'})),
            ...this.inventory.logic.map(i => ({...i, cat:'LOGIC'})),
            ...this.inventory.launchers.map(i => ({...i, cat:'LAUNCHERS'})),
            ...this.inventory.modules.map(i => ({...i, cat:'MODULES'})),
            ...this.inventory.boosters.map(i => ({...i, cat:'BOOSTERS'}))
        ];

        allHoldings.forEach(item => {
            if ((item.count || 0) <= 0 && item.charges === undefined) return;
            
            const sellPrice = this.calculateValue(item);
            const card = document.createElement('div');
            card.className = 'event-card sell-card';
            card.innerHTML = `
                <div class="card-body">
                    ${this.generateCardHTML(item, { showInventory: true })}
                    <div class="card-price sell">
                        <span class="label">SELL FOR:</span>
                        <span class="price-val">${sellPrice}</span><span class="currency">c</span>
                    </div>
                </div>
                <button class="sell-btn">SELL</button>
            `;

            card.querySelector('.sell-btn').onclick = () => {
                this.coins += sellPrice;
                // インベントリから削除
                this._removeItemFromInventory(item.cat, item.id, item.isEnhanced);
                document.getElementById('event-player-credits').textContent = this.coins.toLocaleString();
                this.initTradingPost(container); // リフレッシュ
                this.updateUI();
            };
            sellGrid.appendChild(card);
        });

        sellSection.appendChild(sellGrid);
        container.appendChild(sellSection);
    }

    /**
     * インベントリからアイテムを1つ削除するヘルパー
     */
    _removeItemFromInventory(category, id, isEnhanced = false) {
        let targetList = null;
        if (category === 'CHASSIS') targetList = this.inventory.chassis;
        if (category === 'LOGIC') targetList = this.inventory.logic;
        if (category === 'LAUNCHERS') targetList = this.inventory.launchers;
        if (category === 'MODULES') targetList = this.inventory.modules;
        if (category === 'BOOSTERS') targetList = this.inventory.boosters;
        if (!targetList) return;

        const idx = targetList.findIndex(i => i.id === id && !!i.isEnhanced === isEnhanced);
        if (idx !== -1) {
            const item = targetList[idx];
            if (item.count > 1) {
                item.count--;
            } else {
                targetList.splice(idx, 1);
            }
        }
    }

    /**
     * REPAIR DOCK の初期化
     */
    initRepairDock(container) {
        this.hasDismantled = this.hasDismantled || false;
        
        container.innerHTML = `
            <div class="repair-dock-layout">
                <div class="repair-section">
                    <h3>MAINTENANCE</h3>
                    <div id="repair-list" class="event-grid"></div>
                </div>
                <div class="dismantle-section">
                    <h3>DISMANTLE & RETRIEVE</h3>
                    <div id="dismantle-list" class="event-grid"></div>
                </div>
            </div>
        `;

        const repairList = document.getElementById('repair-list');
        const dismantleList = document.getElementById('dismantle-list');

        // 1. 修理対象 (耐久度があるもの)
        const repairables = [
            ...this.inventory.launchers,
            ...this.inventory.boosters.filter(b => b.maxCharges > 1)
        ].filter(i => (i.charges !== undefined && i.charges < (i.maxCharges || 2)));

        if (repairables.length === 0) {
            repairList.innerHTML = '<div class="part-info" style="opacity:0.3; padding:20px;">ALL SYSTEMS INTEGRAL</div>';
        } else {
            repairables.forEach(item => {
                const cost = 20; // 修理固定費
                const card = document.createElement('div');
                card.className = 'event-card repair-card';
                card.innerHTML = `
                    <div class="card-body">
                        ${this.generateCardHTML(item, { showInventory: true })}
                        <div class="card-price">
                            <span class="label">REPAIR COST:</span>
                            <span class="price-val">${cost}</span><span class="currency">c</span>
                        </div>
                    </div>
                    <button class="repair-btn" ${this.coins < cost ? 'disabled' : ''}>RESTORE</button>
                `;
                card.querySelector('.repair-btn').onclick = () => {
                    if (this.coins >= cost) {
                        this.coins -= cost;
                        item.charges = item.maxCharges || 2;
                        document.getElementById('event-player-credits').textContent = this.coins.toLocaleString();
                        this.initRepairDock(container);
                        this.updateUI();
                    }
                };
                repairList.appendChild(card);
            });
        }

        // 2. 解体対象 (インベントリ + 装備中のパーツ)
        const dismantleCandidates = [];

        // インベントリ分
        [   ...this.inventory.chassis.map(i => ({...i, cat:'CHASSIS', source:'INV'})),
            ...this.inventory.logic.map(i => ({...i, cat:'LOGIC', source:'INV'})),
            ...this.inventory.launchers.map(i => ({...i, cat:'LAUNCHERS', source:'INV'})),
            ...this.inventory.modules.map(i => ({...i, cat:'MODULES', source:'INV'})),
            ...this.inventory.boosters.map(i => ({...i, cat:'BOOSTERS', source:'INV'}))
        ].forEach(i => dismantleCandidates.push(i));

        // 装備中の機体パーツ (重要: ユーザー要望)
        const rocket = this.selection.rocket;
        if (rocket) {
            if (rocket.chassis) dismantleCandidates.push({ ...rocket.chassis, cat:'CHASSIS', source:'EQUIPPED', label:'[EQUIPPED]' });
            if (rocket.logic) dismantleCandidates.push({ ...rocket.logic, cat:'LOGIC', source:'EQUIPPED', label:'[EQUIPPED]' });
            if (rocket.modules) {
                for (const [modId, count] of Object.entries(rocket.modules)) {
                    const master = ITEM_REGISTRY[modId];
                    if (master) dismantleCandidates.push({ ...master, cat:'MODULES', count, source:'EQUIPPED', label:'[EQUIPPED]' });
                }
            }
            if (rocket.booster) dismantleCandidates.push({ ...rocket.booster, cat:'BOOSTERS', source:'EQUIPPED', label:'[EQUIPPED]' });
        }

        dismantleCandidates.forEach(item => {
            if ((item.count || 0) <= 0 && item.charges === undefined && item.source !== 'EQUIPPED') return;

            const card = document.createElement('div');
            card.className = 'event-card dismantle-card';
            const displayItem = { ...item, name: (item.label ? `${item.label} ` : '') + (item.name || 'Unknown') };
            
            card.innerHTML = `
                <div class="card-body">
                    ${this.generateCardHTML(displayItem, { showInventory: true })}
                    <div class="card-price dismantle">
                        <span class="label">DISMANTLE FOR:</span>
                        <span class="price-val">SCRAP</span>
                    </div>
                </div>
                <button class="dismantle-btn">DISMANTLE</button>
            `;

            card.querySelector('.dismantle-btn').onclick = () => {
                // 装備中なら解除
                if (item.source === 'EQUIPPED') {
                    this.selection.rocket = null;
                    // 他の装備中パーツをインベントリに戻す必要があるが、
                    // ここでは単純化のため「今のパーツそのもの」はインベントリに戻るor消える
                    this.ui.message.textContent = 'UNIT DISASSEMBLED';
                } else {
                    this._removeItemFromInventory(item.cat, item.id, item.isEnhanced);
                }
                
                // 還元（現在は簡易的にコイン+50）
                this.coins += 50;
                document.getElementById('event-player-credits').textContent = this.coins.toLocaleString();
                this.initRepairDock(container);
                this.updateUI();
            };
            dismantleList.appendChild(card);
        });
    }

    /**
     * BLACK MARKET の初期化
     */
    initBlackMarket(container) {
        container.innerHTML = `
            <div class="black-market-options">
                <div class="market-option">
                    <h3>STREET DEAL</h3>
                    <p>Total value ~100c items.</p>
                    <button id="market-btn-100" class="premium-button" ${this.coins < 100 ? 'disabled' : ''}>PAY 100c</button>
                </div>
                <div class="market-option highlighted">
                    <h3>PREMIUM HAUL</h3>
                    <p>Total value ~600c items (Rarity Bonus).</p>
                    <button id="market-btn-500" class="premium-button" ${this.coins < 500 ? 'disabled' : ''}>PAY 500c</button>
                </div>
            </div>
            <div id="market-results" class="market-results-area hidden">
                <h3>OBTAINED ITEMS</h3>
                <div id="market-results-list" class="event-grid"></div>
            </div>
        `;

        document.getElementById('market-btn-100').onclick = () => this.runBlackMarket(100, 100, 0);
        document.getElementById('market-btn-500').onclick = () => this.runBlackMarket(500, 600, 5);
    }

    /**
     * BLACK MARKET の抽選実行
     */
    runBlackMarket(cost, targetValue, bonus) {
        if (this.coins < cost) return;
        this.coins -= cost;
        document.getElementById('event-player-credits').textContent = this.coins.toLocaleString();

        const obtained = [];
        let currentValue = 0;
        
        while (currentValue < targetValue) {
            const itemData = this.getWeightedRandomItem({ thresholdBonus: bonus, excludeCargo: true, excludeCoin: true });
            obtained.push(itemData);
            currentValue += this.calculateValue(itemData);
        }

        // インベントリへ追加
        obtained.forEach(i => this._addItemToInventory(i));

        // 結果表示
        const resultsArea = document.getElementById('market-results');
        const list = document.getElementById('market-results-list');
        resultsArea.classList.remove('hidden');
        list.innerHTML = '';
        
        obtained.forEach(i => {
            const card = document.createElement('div');
            card.className = 'event-card obtained-card';
            card.innerHTML = `
                <div class="card-body">
                    ${this.generateCardHTML(i)}
                </div>
            `;
            list.appendChild(card);
        });
        
        // ボタン無効化（1回のみ）
        document.getElementById('market-btn-100').disabled = true;
        document.getElementById('market-btn-500').disabled = true;
        this.updateUI();
    }

    closeEvent() {
        const screen = document.getElementById('event-screen');
        if (screen) screen.classList.add('hidden');

        // 次のステージへ進行
        this.stageLevel += 1;
        this.initStage(this.currentStarCount);
        
        this.state = 'building';
        this.selection.rocket = null;
        this.selection.launcher = null;
        this.selection.booster = null; 
        this.ui.message.textContent = ''; 
        if (this.ship) this.ship.trail = []; 
        this.checkReadyToAim(); 
        this.checkGameOver();
        this.ensurePanelExpanded();
        this.updateUI();
    }

    closeResult() {
        const overlay = document.getElementById('result-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('minimized');
        }
        
        const backBtn = document.getElementById('back-to-result-btn');
        if (backBtn) backBtn.classList.add('hidden');

        const prevState = this.flightResults.status;
        
        if (prevState === 'success' || (this.state === 'cleared' || prevState === 'cleared')) {
            const goal = this.lastHitGoal; 
            if (goal) {
                this.handleEvent(goal);
                return;
            }
        }
        
        this.state = 'building';
        if (prevState !== 'returned') {
            this.selection.rocket = null;
        }
        this.selection.launcher = null;
        this.selection.booster = null; 

        this.ui.message.textContent = ''; 
        if (this.ship) this.ship.trail = []; 
        this.checkReadyToAim(); 
        this.checkGameOver();
        this.ensurePanelExpanded();
        this.updateUI();
    }
}


