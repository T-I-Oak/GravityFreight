import { PhysicsEngine, Body, Vector2, G, calculateAcceleration, getDistanceSqToSegment } from './Physics.js';
import { PARTS, INITIAL_INVENTORY, CATEGORY_COLORS } from './Data.js';

export class Game {
    constructor(canvas, ui, starCount = 5) {
        this.physics = new PhysicsEngine();
        this.canvas = canvas;
        this.ui = ui;
        this.version = '0.2.0'; // β版 (CCD実装済み)
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
                return { ...base, hp: p.hp };
            }),
            logicOptions: INITIAL_INVENTORY.logicOptions.map(o => {
                const base = PARTS.LOGIC_OPTIONS.find(bo => bo.id === o.id);
                return { ...base, count: o.count };
            }),
            accOptions: INITIAL_INVENTORY.accOptions.map(o => {
                const base = PARTS.ACC_OPTIONS.find(bo => bo.id === o.id);
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
            logicOption: {}, // { id: count } 複数選択対応
            accOption: null
        };



        this.isFactoryOpen = true; // 建造パネルの表示状態

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
        this.boundaryRadius = Math.min(this.canvas.width, this.canvas.height) * 0.95;
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
        for (const [category, items] of Object.entries(PARTS)) {
            items.forEach(item => {
                const weight = item.appearanceRate !== undefined ? item.appearanceRate : 10;
                if (weight > 0) {
                    pool.push({ item, category, weight });
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
                const dist = 150 + Math.random() * (this.boundaryRadius - 200);
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
        window.addEventListener('mousemove', (e) => {
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;
            
            if (this.state === 'aiming') {
                const worldMouse = this.getWorldPos(this.mousePos);
                const dir = worldMouse.sub(this.homeStar.position).normalize();
                this.ship.position = this.homeStar.position.add(dir.scale(this.homeStar.radius + 12));
                this.ship.rotation = Math.atan2(dir.y, dir.x);
            }
        });

        const launch = () => {
            if (this.state === 'aiming') {
                const worldMouse = this.getWorldPos(this.mousePos);
                const dir = worldMouse.sub(this.homeStar.position).normalize();
                const power = this.selection.accelerator ? this.selection.accelerator.power : 1200;
                
                // 質量補正初速
                const massFactor = Math.sqrt(10 / this.ship.mass);
                this.ship.velocity = dir.scale(power * massFactor);

                // 耐久度消費ロジック
                if (this.selection.accOption && this.selection.accOption.id === 'opt_fuel') {
                    this.selection.accOption.count--;
                    if (this.selection.accOption.count <= 0) {
                        this.inventory.accOptions = this.inventory.accOptions.filter(o => o.count > 0);
                        this.selection.accOption = null;
                    }
                } else if (this.selection.accelerator) {
                    this.selection.accelerator.hp--;
                    if (this.selection.accelerator.hp <= 0) {
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

        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('#build-overlay')) return;
            // 飛行中以外（建造中・狙い中）なら発射を試みる
            // クラッシュ/クリア状態でのクリックによる「即時リトライ」は排除（自動遷移に任せる）
            if (this.state === 'aiming' || this.state === 'building') {
                launch();
            }
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
        if (type === 'logicOption') {
            const baseSlots = this.selection.chassis ? this.selection.chassis.slots : 0;
            const itemInInv = this.inventory.logicOptions.find(o => o.id === id);
            if (!itemInInv || itemInInv.count <= 0) return;

            // 現在の使用数と、追加スロットの合計を算出
            let extraSlots = 0;
            let usedCount = 0;
            for (const [optId, count] of Object.entries(this.selection.logicOption)) {
                const optBase = PARTS.LOGIC_OPTIONS.find(o => o.id === optId);
                if (optBase) extraSlots += (optBase.slots || 0) * count;
                usedCount += count;
            }

            const totalCapacity = baseSlots + extraSlots;
            const alreadySelected = this.selection.logicOption[id] || 0;

            if (usedCount < totalCapacity && alreadySelected < itemInInv.count) {
                // 空きスロットがあり、かつ在庫がある場合は追加
                this.selection.logicOption[id] = alreadySelected + 1;
            } else {
                // 上限に達している、または在庫がない場合はそのアイテムを 0 にリセット
                delete this.selection.logicOption[id];
            }

            // スロット超過のバリデーション (拡張パーツを外した際などのためのパージ)
            this.validateLogicOptions();
        }
        if (type === 'accOption') {
            // アクセラレータオプション（現在は重複なし想定）
            const opt = this.inventory.accOptions.find(o => o.id === id);
            this.selection.accOption = (this.selection.accOption === opt) ? null : opt;
        }
        this.updateUI();
    }

    validateLogicOptions() {
        if (!this.selection.chassis) return;

        const baseSlots = this.selection.chassis.slots;
        let extraSlots = 0;
        let usedCount = 0;

        // 現在の状態を確認
        for (const [optId, count] of Object.entries(this.selection.logicOption)) {
            const optBase = PARTS.LOGIC_OPTIONS.find(o => o.id === optId);
            if (optBase) extraSlots += (optBase.slots || 0) * count;
            usedCount += count;
        }

        let overflow = usedCount - (baseSlots + extraSlots);
        if (overflow > 0) {
            // 超過分を削除 (登録順の逆から削る)
            const optIds = Object.keys(this.selection.logicOption);
            for (let i = optIds.length - 1; i >= 0 && overflow > 0; i--) {
                const oid = optIds[i];
                let count = this.selection.logicOption[oid];
                const toRemove = Math.min(count, overflow);
                this.selection.logicOption[oid] -= toRemove;
                if (this.selection.logicOption[oid] <= 0) delete this.selection.logicOption[oid];
                overflow -= toRemove;
                
                // 再計算 (削除したパーツ自体がスロットを提供していた場合に備えて)
                // ただし、今回は単純なループで足りるはず (1つ削除するごとに overflow が 1 減るため)
                // ※もし1パーツで複数スロット提供・消費がある場合は再計算が必要だが、現状は1パーツ1消費のためこれでOK
            }
        }
    }



    assembleUnit() {
        if (this.selection.chassis && this.selection.logic) {
            // アドオン（複数）のクローンを作成
            const chassis = this.selection.chassis;
            const logic = this.selection.logic;
            const options = { ...this.selection.logicOption };
            const accOpt = this.selection.accOption;

            // 合計パラメータの算出
            let totalMass = (chassis.mass || 0) + (logic.mass || 0);
            let totalSlots = (chassis.slots || 0) + (logic.slots || 0);
            let totalPrecision = (chassis.precision || 0) + (logic.precision || 0);
            let totalMultiplier = (chassis.precisionMultiplier || 0) + (logic.precisionMultiplier || 0);
            let totalPickupRange = (chassis.pickupRange || 0) + (logic.pickupRange || 0);
            let totalPickupMultiplier = (chassis.pickupMultiplier || 0) + (logic.pickupMultiplier || 0);

            for (const [optId, count] of Object.entries(options)) {
                const optBase = PARTS.LOGIC_OPTIONS.find(o => o.id === optId);
                if (optBase) {
                    totalMass += (optBase.mass || 0) * count;
                    totalSlots += (optBase.slots || 0) * count;
                    totalPrecision += (optBase.precision || 0) * count;
                    totalMultiplier += (optBase.precisionMultiplier || 0) * count;
                    totalPickupRange += (optBase.pickupRange || 0) * count;
                    totalPickupMultiplier += (optBase.pickupMultiplier || 0) * count;
                }
            }

            // アクセラレータアドオンの加算
            if (accOpt) {
                totalMass += (accOpt.mass || 0);
                totalSlots += (accOpt.slots || 0);
                totalPrecision += (accOpt.precision || 0);
                totalMultiplier += (accOpt.precisionMultiplier || 0);
            }

            const rocket = {
                id: Date.now(),
                chassis,
                logic,
                logicOption: options,
                accOption: accOpt ? { ...accOpt } : null,
                totalMass,
                totalSlots,
                totalPrecision,
                totalMultiplier,
                totalPickupRange,
                totalPickupMultiplier,
                name: `${chassis.name} + ${logic.name}`
            };
            this.inventory.rockets.push(rocket);

            // 消費
            chassis.count--;
            logic.count--;
            for (const [optId, count] of Object.entries(options)) {
                const optInv = this.inventory.logicOptions.find(o => o.id === optId);
                if (optInv) optInv.count -= count;
            }
            if (accOpt) {
                const accOptInv = this.inventory.accOptions.find(o => o.id === accOpt.id);
                if (accOptInv) accOptInv.count--;
            }

            // 在庫が0になったものを除外 (UI更新のため)
            this.inventory.chassis = this.inventory.chassis.filter(c => c.count > 0);
            this.inventory.logic = this.inventory.logic.filter(l => l.count > 0);
            this.inventory.logicOptions = this.inventory.logicOptions.filter(o => o.count > 0);
            this.inventory.accOptions = this.inventory.accOptions.filter(o => o.count > 0);

            this.selection.chassis = null;
            this.selection.logic = null;
            this.selection.logicOption = {};
            this.selection.accOption = null;

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
            items.forEach(data => {
                const div = document.createElement('div');
                
                // 選択状態の判定
                let selectionCount = 0;
                let isSelected = false;
                if (type === 'logicOption') {
                    selectionCount = this.selection.logicOption[data.id] || 0;
                    isSelected = selectionCount > 0;
                } else {
                    isSelected = (selected === data);
                }

                div.className = `part-item ${isSelected ? 'selected' : ''}`;
                
                // 背景色（イメージカラー）の適用と選択ハイライト
                if (data.color) {
                    const baseColor = data.color;
                    if (isSelected) {
                        div.style.backgroundColor = baseColor.replace('0.15', '0.45');
                        div.style.borderColor = baseColor.replace('0.15', '0.8');
                    } else {
                        div.style.backgroundColor = baseColor;
                    }
                }

                div.innerHTML = this.generateCardHTML(data, {
                    showInventory: true,
                    selectionCount: selectionCount
                });

                div.onclick = () => {
                    if (type === 'logicOption' || type === 'accOption') {
                        this.selectOption(type, data.id);
                    } else {
                        this.selectPart(type, data.id);
                    }
                };
                el.appendChild(div);
            });
        };



        const factory = document.getElementById('factory-panel');
        if (this.isFactoryOpen) factory.classList.remove('hidden');
        else factory.classList.add('hidden');

        renderList('chassis-list', this.inventory.chassis, 'chassis', this.selection.chassis);
        renderList('logic-list', this.inventory.logic, 'logic', this.selection.logic);

        
        renderList('logic-option-list', this.inventory.logicOptions, 'logicOption', this.selection.logicOption);
        renderList('acc-option-list', this.inventory.accOptions, 'accOption', this.selection.accOption);



        const buildBtn = document.getElementById('build-btn');
        if (buildBtn) buildBtn.disabled = !(this.selection.chassis && this.selection.logic);


        const rList = document.getElementById('rocket-list');
        if (rList) {
            rList.innerHTML = '';
            if (this.inventory.rockets.length === 0) {
                rList.innerHTML = '<div class="slot-placeholder">No Units Built</div>';
            } else {

                const unitColor = 'rgba(224, 224, 255, 0.15)';
                this.inventory.rockets.forEach(rocket => {
                    const div = document.createElement('div');
                    const isSelected = (this.selection.rocket === rocket);
                    div.className = `unit-item ${isSelected ? 'selected' : ''}`;
                    
                    if (isSelected) {
                        div.style.backgroundColor = unitColor.replace('0.15', '0.45');
                        div.style.borderColor = 'rgba(224, 224, 255, 0.8)';
                    } else {
                        div.style.backgroundColor = unitColor;
                    }

                    div.innerHTML = `<span class="part-name">${rocket.name}</span>`;
                    
                    // アドオン詳細の追加
                    let addonDetails = [];
                    if (rocket.logicOption) {
                        for (const optId in rocket.logicOption) {
                            const optBase = PARTS.LOGIC_OPTIONS.find(o => o.id === optId);
                            if (optBase) addonDetails.push(`${optBase.name} × ${rocket.logicOption[optId]}`);
                        }
                    }
                    if (rocket.accOption) {
                        addonDetails.push(`${rocket.accOption.name} × 1`);
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
            // インベントリのアクセラレータ(hp保持) または星のアクセラレータ本体(durability保持)
            if (item.hp !== undefined || item.durability !== undefined) {
                // PARTS.ACCELERATORS から定義を引くか、自身が定義ならそのまま使用
                const baseAcc = typeof PARTS !== 'undefined' && PARTS.ACCELERATORS 
                                ? PARTS.ACCELERATORS.find(a => a.id === item.id) || item 
                                : item;
                const maxHp = baseAcc.durability || 2;
                const currentHp = item.hp !== undefined ? item.hp : maxHp;

                let segments = '';
                for (let i = 0; i < maxHp; i++) {
                    segments += `<div class="hp-segment ${i < currentHp ? 'active' : ''}"></div>`;
                }
                invInfo = `<div class="hp-gauge">${segments}</div>`;
            } else {
                invInfo = `<span class="inventory-badge">× ${item.count || 0}</span>`;
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
                this.physics.update(this.fixedDt);
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
                    this.initStage(this.currentStarCount); // 成功時はリセット
                }
                // 失敗時は星を維持してリトライ
                this.state = 'building';
                
                if (prevState !== 'returned') {
                    // 帰還以外はロケットの選択状態をクリア
                    this.selection.rocket = null;
                }
                
                this.selection.accelerator = null;
                this.selection.accOption = null;

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
            
            // CCD: 前の位置から現在の位置への線分と、星の中心との距離をチェック
            const distSq = getDistanceSqToSegment(body.position, startPos, shipPos);
            
            if (distSq < collisionDist * collisionDist) {
                if (body === this.homeStar) {
                    this.state = 'returned';
                    this.stateTimer = 2.0; 
                    this.ui.message.textContent = 'RETURNED TO BASE';
                    this.ui.status.textContent = 'RELOADING...';
                    this.resolveItems('returned'); 
                } else {
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
            const shipAngle = Math.atan2(shipPos.y - this.canvas.height / 2, shipPos.x - this.canvas.width / 2);
            
            // いずれかのゴール内に入っているかチェック
            let hitGoal = null;
            for (const goal of this.goals) {
                // 角度の差分を -PI to PI に正規化
                let diff = shipAngle - goal.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                
                if (Math.abs(diff) < goal.width / 2) {
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
        const accBonus = acc ? (acc.precisionMultiplier || 0) : 0;
        const precision = (rocket.totalPrecision || 0) * ((rocket.totalMultiplier || 0) + accBonus);

        for (let i = 0; i < precision; i++) { 
            if (i % 5 === 0) points.push(new Vector2(tempPos.x, tempPos.y));
            
            const prevTempPos = new Vector2(tempPos.x, tempPos.y); // 前の座標を保存
            const acc = calculateAcceleration(tempPos, this.bodies, mass);
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
        this.boundaryRadius = Math.min(width, height) * 0.95;

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
                if (category === 'LOGIC_OPTIONS') targetList = this.inventory.logicOptions;
                if (category === 'ACC_OPTIONS') targetList = this.inventory.accOptions;

                if (targetList) {
                    const existing = targetList.find(i => i.id === item.id);
                    if (existing) {
                        if (category === 'ACCELERATORS') {
                            if (existing.hp !== undefined) existing.hp++;
                            else existing.hp = item.durability || 2;
                        } else {
                            if (existing.count !== undefined) existing.count++;
                            else existing.count = 2; // 初回取得
                        }
                    } else {
                        if (category === 'ACCELERATORS') {
                            targetList.push({ ...item, hp: item.durability || 2 });
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
                    if (rocket.logicOption) {
                        for (const [optId, count] of Object.entries(rocket.logicOption)) {
                            const optBase = PARTS.LOGIC_OPTIONS.find(o => o.id === optId);
                            if (optBase) {
                                for(let c=0; c<count; c++) {
                                    if (Math.random() < 0.5) parts.push({ category: 'LOGIC_OPTIONS', item: optBase });
                                }
                            }
                        }
                    }
                    if (rocket.accOption && Math.random() < 0.5) {
                        parts.push({ category: 'ACC_OPTIONS', item: rocket.accOption });
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


