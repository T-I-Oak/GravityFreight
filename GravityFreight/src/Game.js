import { PARTS, CATEGORY_COLORS, INITIAL_INVENTORY, RARITY, hexToRgba } from './Data.js';
import { PhysicsEngine, Body, Vector2, calculateAcceleration, getDistanceSqToSegment } from './Physics.js';

export class Game {
    constructor(canvas, ui, starCount = 8) {
        this.physics = new PhysicsEngine();
        this.canvas = canvas;
        this.ui = ui;
        this.version = '0.3.0'; // Module/Booster Update (v0.3.0)
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
            accelerators: INITIAL_INVENTORY.accelerators.map(p => {
                const base = PARTS.ACCELERATORS.find(bp => bp.id === p.id);
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
        this.stateValid = true;



        this.selection = {
            chassis: null,
            logic: null,
            accelerator: null,
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
        }
    }

    initGoals() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // 3つの出口タイプ
        const goalTypes = [
            { id: 'SAFE', color: CATEGORY_COLORS.CARGO_SAFE, angleWidth: 60, score: 2000, label: 'SAFE' },
            { id: 'NORMAL', color: CATEGORY_COLORS.CARGO_NORMAL, angleWidth: 40, score: 3000, label: 'NORMAL' },
            { id: 'DANGER', color: CATEGORY_COLORS.CARGO_DANGER, angleWidth: 20, score: 5000, label: 'DANGER' }
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
        const THRESHOLD = RARITY.RARE + (this.stageLevel - 1); 
        
        for (const [category, items] of Object.entries(PARTS)) {
            items.forEach(item => {
                const rarity = item.rarity;
                // レアリティが設定されているアイテムのみ自然出現させる
                if (rarity !== undefined) {
                    const weight = Math.max(0, THRESHOLD - rarity);
                    if (weight > 0) {
                        pool.push({ item, category, weight });
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
        return new Vector2(
            (screenPos.x - centerX) / this.zoom + centerX,
            (screenPos.y - centerY) / this.zoom + centerY
        );
    }

    setupListeners() {
        const updatePointer = (e) => {
            // UI上の操作（ボタン等）の時はエイムを更新しない
            if (e.target.closest('#build-overlay') || e.target.closest('#launch-btn')) {
                return;
            }

            // エイム中かつドラッグ中でない場合は更新しない（iPad等でのボタン移動対策）
            if (this.state === 'aiming' && !this.isPointerDown) {
                return;
            }
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;
            
            if (this.state === 'aiming') {
                const worldPos = this.getWorldPos(this.mousePos);
                const dir = worldPos.sub(this.homeStar.position).normalize();
                this.ship.position = this.homeStar.position.add(dir.scale(this.homeStar.radius + 12));
                this.ship.rotation = Math.atan2(dir.y, dir.x);
            }
        };


        const launch = () => {
            if (this.state === 'aiming') {
                const worldMouse = this.getWorldPos(this.mousePos);
                const dir = worldMouse.sub(this.homeStar.position).normalize();
                const power = this.selection.accelerator ? this.selection.accelerator.power : 1200;
                
                const massFactor = Math.sqrt(10 / this.ship.mass);
                this.ship.velocity = dir.scale(power * massFactor);

                if (this.selection.booster && this.selection.booster.id === 'opt_fuel') {
                    this.selection.booster.count--;
                    if (this.selection.booster.count <= 0) {
                        this.inventory.boosters = this.inventory.boosters.filter(o => o.count > 0);
                        this.selection.booster = null;
                    }
                } else if (this.selection.accelerator) {
                    this.selection.accelerator.charges--;
                    if (this.selection.accelerator.charges <= 0) {
                        this.inventory.accelerators = this.inventory.accelerators.filter(p => p !== this.selection.accelerator);
                        this.selection.accelerator = null;
                    }
                }
                
                this.ship.trail = [];
                this.physics.bodies.push(this.ship);
                this.state = 'flying';
                this.launchTime = this.simulatedTime;
                this.accumulator = 0;
                this.ui.status.textContent = 'FLYING...';
                this.isFactoryOpen = false;
                this.updateUI();
            } else if (this.state === 'crashed' || this.state === 'cleared') {
                this.reset();
            }
        };

        window.addEventListener('pointerdown', (e) => {
            this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            this.isPointerDown = true;

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
            if (this.activePointers.has(e.pointerId)) {
                this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            }

            if (this.activePointers.size === 2) {
                const pts = Array.from(this.activePointers.values());
                const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                
                if (this.lastPinchDist > 0) {
                    const factor = dist / this.lastPinchDist;
                    this.zoom *= factor;
                    this.zoom = Math.max(0.3, Math.min(this.zoom, 5.0));
                }
                this.lastPinchDist = dist;
            } else {
                updatePointer(e);
            }
        });

        const endPointer = (e) => {
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
        window.addEventListener('pointerout', endPointer);

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

        document.getElementById('toggle-factory-btn').onclick = () => {
            this.isFactoryOpen = !this.isFactoryOpen;
            this.updateUI();
        };
    }

    selectPart(type, id) {
        if (type === 'chassis') {
            this.selection.chassis = this.inventory.chassis.find(p => p.id === id);
            // シャーシ変更時はスロット数が変わるためアドオンをリセット
            this.selection.logicOption = {};
        }
        if (type === 'logic') this.selection.logic = this.inventory.logic.find(p => p.id === id);
        if (type === 'accelerator') {
            this.selection.accelerator = this.inventory.accelerators.find(p => p.id === id);
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
            const booster = this.selection.booster;

            // 合計パラメータの算出 (重量、スロット、精度、取得範囲は加算)
            let totalMass = (chassis.mass || 0) + (logic.mass || 0);
            let totalSlots = (chassis.slots || 0) + (logic.slots || 0);
            let totalPrecision = (chassis.precision || 0) + (logic.precision || 0);
            let totalPickupRange = (chassis.pickupRange || 0) + (logic.pickupRange || 0);
            
            // 倍率補正 (全てベース1.0からの乗算)
            let totalMultiplier = (chassis.precisionMultiplier || 1.0) * (logic.precisionMultiplier || 1.0);
            let totalPickupMultiplier = (chassis.pickupMultiplier || 1.0) * (logic.pickupMultiplier || 1.0);
            let totalGravityMultiplier = 1.0;
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

            // ブースターアドオンの加算および倍率乗算
            if (booster) {
                totalMass += (booster.mass || 0);
                totalSlots += (booster.slots || 0);
                totalPrecision += (booster.precision || 0);
                
                if (booster.precisionMultiplier) totalMultiplier *= booster.precisionMultiplier;
                if (booster.pickupMultiplier) totalPickupMultiplier *= booster.pickupMultiplier;
                if (booster.gravityMultiplier) totalGravityMultiplier *= booster.gravityMultiplier;
                if (booster.arcMultiplier) arcMultiplier *= booster.arcMultiplier;
            }

            const rocket = {
                id: Date.now(),
                chassis,
                logic,
                modules,
                booster: booster ? { ...booster } : null,
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
            if (booster) {
                const boosterInv = this.inventory.boosters.find(o => o.id === booster.id);
                if (boosterInv) boosterInv.count--;
            }

            // 在庫が0になったものを除外 (UI更新のため)
            this.inventory.chassis = this.inventory.chassis.filter(c => c.count > 0);
            this.inventory.logic = this.inventory.logic.filter(l => l.count > 0);
            this.inventory.modules = this.inventory.modules.filter(o => o.count > 0);
            this.inventory.boosters = this.inventory.boosters.filter(o => o.count > 0);

            this.selection.chassis = null;
            this.selection.logic = null;
            this.selection.modules = {};
            this.selection.booster = null;

            this.isFactoryOpen = false;
            this.updateUI();
            this.checkGameOver();
        }
    }

    checkReadyToAim() {
        if (this.selection.rocket && this.selection.accelerator) {
            // ホームに預けていたアイテムがあれば回収する
            if (this.homeStar.items && this.homeStar.items.length > 0) {
                this.homeStar.items.forEach(itemData => {
                    this.pendingItems.push({ itemData, originalBody: this.homeStar });
                });
                this.homeStar.items = [];
            }

            this.state = 'aiming';
            this.ui.status.textContent = 'READY TO LAUNCH';
            this.ship.mass = this.selection.rocket.totalMass;
            this.ship.pickupRange = this.selection.rocket.totalPickupRange;
            this.ship.pickupMultiplier = this.selection.rocket.totalPickupMultiplier;
            this.ship.gravityMultiplier = this.selection.rocket.totalGravityMultiplier;
            this.ship.arcMultiplier = this.selection.rocket.arcMultiplier;
            
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
            this.ui.status.textContent = 'SELECT UNIT & ACCELERATOR';
        }
    }


    updateUI() {
        const renderList = (id, items, type, selected) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = '';
            
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
                        div.style.backgroundColor = hexToRgba(categoryColor, 0.45);
                        div.style.borderColor = hexToRgba(categoryColor, 0.8);
                    } else {
                        div.style.backgroundColor = hexToRgba(categoryColor, 0.15);
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

        const factory = document.getElementById('factory-panel');
        if (this.isFactoryOpen) factory.classList.remove('hidden');
        else factory.classList.add('hidden');

        const buildOverlay = document.getElementById('build-overlay');
        const launchBtn = document.getElementById('launch-btn');

        if (this.state === 'building' || this.state === 'aiming') {
            buildOverlay.classList.remove('hidden');
        } else {
            buildOverlay.classList.add('hidden');
        }

        if (this.state === 'aiming') {
            launchBtn.classList.remove('hidden');
        } else {
            launchBtn.classList.add('hidden');
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
                rList.innerHTML = '<div class="slot-placeholder">No Units Built</div>';
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

        renderList('accelerator-list', this.inventory.accelerators, 'accelerator', this.selection.accelerator);

        const toggleBtn = document.getElementById('toggle-factory-btn');
        if (toggleBtn) toggleBtn.textContent = this.isFactoryOpen ? 'CLOSE BAY' : 'ASSEMBLE NEW';
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
        this.ui.status.textContent = 'SELECT UNIT & ACCELERATOR';

        this.ui.message.textContent = '';
        this.accumulator = 0;
        this.checkReadyToAim();
        this.updateUI();
    }

    update(dt) {
        // マウスホバー判定 (全ステート共通)
        const worldMouse = this.getWorldPos(this.mousePos);
        this.hoveredStar = null;
        for (const body of this.bodies) {
            if (worldMouse.sub(body.position).length() < (body.radius || 20) + 10) {
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

            this.accumulator += dt;
            if (this.accumulator > 0.1) this.accumulator = 0.1;
            while (this.accumulator >= this.fixedDt) {
                const prevPos = new Vector2(this.ship.position.x, this.ship.position.y);
                
                // 物理演算への重力補正適用
                const gravityStep = (pos, bodies, mass) => {
                    const acc = calculateAcceleration(pos, bodies, mass);
                    return acc.scale(this.ship.gravityMultiplier || 1.0);
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
                
                this.selection.accelerator = null;
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
            }
        }
    }

    checkCollisions(prevPos = null) {
        if (!this.ship) return false;
        const shipPos = this.ship.position;
        const startPos = prevPos || shipPos; // 初期位置または前ステップの座標

        for (const body of this.bodies) {
            if (body === this.homeStar && this.simulatedTime - this.launchTime < 0.8) continue;
            
            const radius = body.radius || (Math.sqrt(body.mass) / 5 + 2);
            const collisionDist = radius + 5;
            const distSq = getDistanceSqToSegment(body.position, startPos, shipPos);
            
            if (distSq < collisionDist * collisionDist) {
                if (body === this.homeStar) {
                    this.state = 'returned';
                    this.stateTimer = 2.0; 
                    this.ui.message.textContent = 'RETURNED TO BASE';
                    this.ui.status.textContent = 'RELOADING...';
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
                    this.ui.status.textContent = 'WAITING...';
                    this.consumeRocketOnFailure(); 
                    this.resolveItems('crashed', body); 
                }
                return true;
            }
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
                this.ui.message.textContent = `SUCCESS! (+${hitGoal.score})`;
                this.ui.status.textContent = 'NEXT STAGE IN 2s...';
                this.resolveItems('success', hitGoal); 
            } else {
                this.state = 'lost';
                this.stateTimer = 2.0;
                this.ui.message.textContent = 'LOST IN SPACE';
                this.ui.status.textContent = 'RETRYING IN 2s...';
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
        const worldMouse = this.getWorldPos(this.mousePos);
        const dir = worldMouse.sub(this.homeStar.position).normalize();
        
        const rocket = this.selection.rocket;
        if (!rocket) return [];

        const power = this.selection.accelerator ? this.selection.accelerator.power : 1200;
        const mass = rocket.totalMass;
        
        const massFactor = Math.sqrt(10 / mass);
        let tempVel = dir.scale(power * massFactor);
        let tempPos = this.homeStar.position.add(dir.scale(this.homeStar.radius + 12));
        
        const simDt = this.fixedDt;
        
        // 合計された精度と倍率を使用
        const acc = this.selection.accelerator;
        const accBonus = acc ? (acc.precisionMultiplier || 1.0) : 1.0;
        const precision = (rocket.totalPrecision || 0) * ((rocket.totalMultiplier || 1.0) * accBonus);

        const gravityMultiplier = rocket.totalGravityMultiplier || 1.0;

        for (let i = 0; i < precision; i++) { 
            if (i % 5 === 0) points.push(new Vector2(tempPos.x, tempPos.y));
            
            const prevTempPos = new Vector2(tempPos.x, tempPos.y); // 前の座標を保存
            const grav = calculateAcceleration(tempPos, this.bodies, mass);
            const acc = grav.scale(gravityMultiplier);
            tempVel = tempVel.add(acc.scale(simDt));
            tempPos = tempPos.add(tempVel.scale(simDt));
            
            for (const body of this.bodies) {
                const radius = body.radius || (Math.sqrt(body.mass) / 5 + 2);
                const collisionDist = radius + 5;
                
                // 予測線でもCCDを適用
                const distSq = getDistanceSqToSegment(body.position, prevTempPos, tempPos);
                
                if (distSq < collisionDist * collisionDist) {
                    if (body === this.homeStar && i * simDt < 0.8) continue;
                    return points;
                }
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
        const hasLaunchers = this.inventory.accelerators.length > 0;

        if (!(hasBuiltRockets || canBuildRockets) || !hasLaunchers) {

            this.state = 'gameover';
            this.ui.status.textContent = 'GAME OVER - OUT OF RESOURCES';
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

            // 仮保存リストへの追加
            this.pendingItems.push({ itemData, originalBody: body });

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
            if (!this.pendingItems || this.pendingItems.length === 0) return;
            
            this.pendingItems.forEach(({ itemData }) => {
                const { category, item } = itemData;

                // 貨物（CARGO）の配送判定
                if (category.startsWith('CARGO_')) {
                    const cargoType = category.replace('CARGO_', ''); // SAFE, NORMAL, DANGER
                    if (hitGoal && cargoType === hitGoal.id) {
                        // 色が一致：追加ボーナスやインベントリ加算不要（使い捨て）
                        // ※既に exit 入船時にスコア加算済み。追加でメッセージを出すなどの拡張が可能
                    } else {
                        // 色が不一致：スコア減点などのペナルティ（現在は単に無視）
                    }
                    return;
                }

                let targetList = null;
                if (category === 'CHASSIS') targetList = this.inventory.chassis;
                if (category === 'LOGIC') targetList = this.inventory.logic;
                if (category === 'ACCELERATORS') targetList = this.inventory.accelerators;
                if (category === 'MODULES') targetList = this.inventory.modules;
                if (category === 'BOOSTERS') targetList = this.inventory.boosters;

                if (targetList) {
                    const existing = targetList.find(i => i.id === item.id);
                    if (existing) {
                        if (category === 'ACCELERATORS') {
                            if (existing.charges !== undefined) existing.charges++;
                            else existing.charges = item.maxCharges || 2;
                        } else {
                            if (existing.count !== undefined) existing.count++;
                            else existing.count = 2; // 初回取得
                        }
                    } else {
                        if (category === 'ACCELERATORS') {
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
                // LOSTの場合は何もしない（アイテムロスト）
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
            // 帰還: 取得中のアイテムをホームの星に一時的に預ける（中身を確認できるようにするため）
            if (this.pendingItems && this.pendingItems.length > 0) {
                this.pendingItems.forEach(({ itemData }) => {
                    this.homeStar.items.push(itemData);
                });
                this.pendingItems = [];
            }
        }

        this.updateUI();
    }
}


