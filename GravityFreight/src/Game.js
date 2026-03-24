import { PARTS, CATEGORY_COLORS, GOAL_COLORS, INITIAL_INVENTORY, RARITY, hexToRgba } from './Data.js';
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



        this.isFactoryOpen = true; // 建造パネルの表示状態

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

        // ロケットがない場合はパネルを強制的に開く
        if (this.inventory.rockets.length === 0) {
            this.isFactoryOpen = true;
            this.updateUI();
        }
    }

    initGoals() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 3つの出口タイプ
        const goalTypes = [
            { id: 'SAFE', color: GOAL_COLORS.SAFE, angleWidth: 60, score: 2000, label: 'SAFE' },
            { id: 'NORMAL', color: GOAL_COLORS.NORMAL, angleWidth: 40, score: 3000, label: 'NORMAL' },
            { id: 'DANGER', color: GOAL_COLORS.DANGER, angleWidth: 20, score: 5000, label: 'DANGER' }
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


    getWeightedRandomItem() {
        let pool = [];
        // スタート時点ではRAREと同じ値（15）。ステージが進むごとに上限が解放・出現率が増加していく
        const THRESHOLD = RARITY.RARE + (this.stageLevel - 1) + (this.nextSectorThresholdBonus || 0); 
        this.nextSectorThresholdBonus = 0; // 消費
        
        for (const [category, items] of Object.entries(PARTS)) {
            items.forEach(item => {
                const rarity = item.rarity;
                // レアリティが設定されているアイテムのみ自然出現させる
                if (rarity !== undefined) {
                    const weight = Math.max(0, THRESHOLD - rarity);
                    if (weight > 0) {
                        // アイテム定義側に category があればそれを優先 (CARGO_SAFE等)、なければループのキー (CHASSIS等) を使用
                        const finalCategory = item.category || category;
                        pool.push({ item, category: finalCategory, weight });
                    }
                }
            });
        }
        if (pool.length === 0) return null;
        const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const p of pool) {
            rand -= p.weight;
            if (rand <= 0) return p;
        }
        return pool[0];
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
                
                const itemData = this.getWeightedRandomItem();
                if (itemData) {
                    body.items.push(itemData);
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
                const preventsWear = this.selection.booster && this.selection.booster.preventsLauncherWear;
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
                
                // カテゴリーに基づく背景色の適用
                const categoryColor = CATEGORY_COLORS[data.category];
                if (categoryColor) {
                    if (isSelected) {
                        div.style.backgroundColor = hexToRgba(categoryColor, 0.25);
                        div.style.borderColor = categoryColor;
                    } else {
                        div.style.backgroundColor = hexToRgba(categoryColor, 0.08);
                    }
                }

                div.innerHTML = this.generateCardHTML(data, {
                    showInventory: true,
                    selectionCount: selectionCount
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
                    <div class="slot-placeholder">
                        <div class="part-header">
                            <span class="part-name" style="opacity: 0.5;">待機中の機体なし</span>
                        </div>
                        <span class="part-info">ASSEMBLY BAYで機体を建造してください</span>
                    </div>
                `;
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

    // アイテムカードUIの共通化
    generateCardHTML(item, options = {}) {
        const { showInventory = false, selectionCount = 0 } = options;
        
        let invInfo = "";
        if (showInventory) {
            // チャージ（charges）を持つアイテムの場合
            if (item.charges !== undefined || item.maxCharges !== undefined) {
                const max = item.maxCharges || 2;
                const current = item.charges !== undefined ? item.charges : max;

                let segments = '';
                for (let i = 0; i < max; i++) {
                    segments += `<div class="hp-segment ${i < current ? 'active' : ''}"></div>`;
                }
                invInfo = `<div class="hp-gauge">${segments}</div>`;
            } else {
                // 数量表示（x1は省略）
                const count = item.count || 0;
                if (count > 1) {
                    invInfo = `<span class="inventory-badge">× ${count}</span>`;
                }
            }
        }

        const selTag = (selectionCount > 0) ? ` <span class="selection-badge">[${selectionCount}]</span>` : '';

        return `
            <div class="part-header">
                <span class="part-name">${item.name}</span>
                <div class="part-meta">${invInfo}${selTag}</div>
            </div>
            <span class="part-info">${item.description || ''}</span>
        `;
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
                const prevState = this.state;
                if (prevState === 'cleared') {
                    this.stageLevel += 1;
                    this.initStage(this.currentStarCount); // 成功時はリセット
                }
                // 失敗時は星を維持してリトライ
                this.state = 'building';
                
                if (prevState !== 'returned') {
                    // 帰還以外はロケットの選択状態をクリア
                    this.selection.rocket = null;
                }
                
                this.selection.launcher = null;
                this.selection.booster = null; // v0.3.0 rename

                this.ui.message.textContent = ''; // メッセージをクリア
                if (this.ship) this.ship.trail = []; // 軌跡をクリア
                this.checkReadyToAim(); // UIステータスを更新 (SELECT ROCKET...)
                this.checkGameOver();
                
                // ロケットが0機かつゲームオーバーでないなら工場を自動で開く
                if (this.inventory.rockets.length === 0 && this.state !== 'gameover') {
                    this.isFactoryOpen = true;
                }
                
                this.updateUI();

                // 次の発射準備に向けてパネルを復元（最小化されていたら開く）
                if (this.state !== 'gameover') {
                    this.ensurePanelExpanded();
                }
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
                this.stateTimer = 2.0; 
                this.ui.message.textContent = 'RETURNED TO BASE';
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
                this.stateTimer = 2.0; 
                this.ui.message.textContent = 'CRASHED';
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
                this.stateTimer = 2.0;
                this.score += hitGoal.score;
                this.sector++; // セクター進行
                this.ui.message.textContent = `SUCCESS! (+${hitGoal.score})`;
                this.resolveItems('success', hitGoal); 
            } else {
                this.state = 'lost';
                this.stateTimer = 2.0;
                this.ui.message.textContent = 'LOST IN SPACE';
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
                const { category, item } = itemData;

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
                            this.nextSectorThresholdBonus = item.nextSectorThresholdBonus;
                            this.ui.message.textContent += ` LUCKY NEXT SECTOR!`;
                        } else if (item.deliveryGoalId) {
                            if (hitGoal.id === item.deliveryGoalId) {
                                this.score += 1500;
                                this.coins += 100;
                                this.ui.message.textContent += ` +DELIVERY BONUS! (+1500)`;
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

                // 3. その他パーツ・ブースター（拾い物）：常にインベントリに加算
                let targetList = null;
                if (category === 'CHASSIS') targetList = this.inventory.chassis;
                if (category === 'LOGIC') targetList = this.inventory.logic;
                if (category === 'LAUNCHERS') targetList = this.inventory.launchers;
                if (category === 'MODULES') targetList = this.inventory.modules;
                if (category === 'BOOSTERS') targetList = this.inventory.boosters;

                if (targetList) {
                    const existing = targetList.find(i => i.id === item.id);
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
                        const calculateValue = (item) => {
                            let base = 10;
                            if (item.rarity === RARITY.UNCOMMON) base = 20;
                            if (item.rarity === RARITY.RARE) base = 30;
                            const cur = item.charges !== undefined ? item.charges : 0;
                            const max = item.maxCharges !== undefined ? item.maxCharges : 0;
                            return Math.floor(base * (cur + 1) / (max + 1));
                        };

                        let totalUnitValue = 0;
                        if (rocket.chassis) totalUnitValue += calculateValue(rocket.chassis);
                        if (rocket.logic) totalUnitValue += calculateValue(rocket.logic);
                        if (this.ship.equippedModules) {
                            this.ship.equippedModules.forEach(m => {
                                totalUnitValue += calculateValue(m);
                            });
                        }

                        const totalPayout = totalUnitValue * insuranceModules.length;
                        this.coins += totalPayout;
                        this.ui.message.textContent += ` (INSURANCE: +${totalPayout})`;
                    }
                }
                this.pendingItems = [];
            }

            if (result === 'crashed') {
                // クラッシュ時、機体の部品を「部品ごとに独立して」50%の確率で散布する
                const rocket = this.selection.rocket;
                if (rocket && hitGoal) {
                    const parts = [];
                    if (rocket.chassis && Math.random() < 0.5) parts.push({ category: 'CHASSIS', item: rocket.chassis });
                    if (rocket.logic && Math.random() < 0.5) parts.push({ category: 'LOGIC', item: rocket.logic });
                    if (rocket.modules) {
                        for (const [optId, count] of Object.entries(rocket.modules)) {
                            const optBase = PARTS.MODULES.find(o => o.id === optId);
                            if (optBase) {
                                for(let c=0; c<count; c++) {
                                    if (Math.random() < 0.5) parts.push({ category: 'MODULES', item: optBase });
                                }
                            }
                        }
                    }
                    if (rocket.booster && Math.random() < 0.5) {
                        parts.push({ category: 'BOOSTERS', item: rocket.booster });
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
}


