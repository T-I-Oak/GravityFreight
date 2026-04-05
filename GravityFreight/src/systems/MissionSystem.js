import { PARTS, CATEGORY_COLORS, GOAL_COLORS, GOAL_NAMES, RARITY, ANIMATION_DURATION } from '../core/Data.js';
import { Body, Vector2 } from '../utils/Physics.js';

export class MissionSystem {
    constructor(game) {
        this.game = game;
    }

    initStage(starCount = 5) {
        const game = this.game;
        game.currentStarCount = starCount;
        const centerX = game.canvas.width / 2;
        const centerY = game.canvas.height / 2;

        game.homeStar = new Body(new Vector2(centerX, centerY), 4000, true);
        game.homeStar.radius = 25;
        game.homeStar.isHome = true;

        game.bodies = [game.homeStar];
        game.boundaryRadius = 900;
        game.goals = [];

        this.initGoals();
        this.generateStars(starCount);

        game.currentCoinDiscount = 0;
        game.dismantleCount = 0;
        game.blackMarketUsed = false;

        // 自機の初期設定
        game.ship = new Body(new Vector2(centerX, centerY - game.homeStar.radius - 12), 10);
        game.ship.collectedItems = [];
        game.ship.lastCollectedStar = null;
        game.ship.pickupRange = 0;
        game.ship.pickupMultiplier = 1;

        game.accumulator = 0;
        game.pendingItems = [];
    }

    initGoals() {
        const game = this.game;
        const centerX = game.canvas.width / 2;
        const centerY = game.canvas.height / 2;

        const goalTypes = [
            { id: 'TRADING_POST', color: GOAL_COLORS.TRADING_POST, angleWidth: 60, score: 2000, coins: 20, bonusItems: 1, label: GOAL_NAMES.TRADING_POST },
            { id: 'REPAIR_DOCK', color: GOAL_COLORS.REPAIR_DOCK, angleWidth: 40, score: 3000, coins: 30, bonusItems: 2, label: GOAL_NAMES.REPAIR_DOCK },
            { id: 'BLACK_MARKET', color: GOAL_COLORS.BLACK_MARKET, angleWidth: 20, score: 5000, coins: 50, bonusItems: 3, label: GOAL_NAMES.BLACK_MARKET }
        ];

        game.goals = [];
        const baseAngle = Math.random() * Math.PI * 2;

        goalTypes.forEach((type, i) => {
            const targetAngle = baseAngle + (i * Math.PI * 2 / 3) + (Math.random() - 0.5) * 0.4;
            game.goals.push({
                ...type,
                x: centerX,
                y: centerY,
                angle: targetAngle,
                width: type.angleWidth * Math.PI / 180
            });
        });
    }

    generateStars(starCount) {
        const game = this.game;
        const centerX = game.canvas.width / 2;
        const centerY = game.canvas.height / 2;
        const minDistance = 180; // master ブランチの事実に基づく制限

        for (let i = 0; i < starCount; i++) {
            let attempts = 0;
            let pos;
            let tooClose;
            do {
                attempts++;
                tooClose = false;
                const angle = Math.random() * Math.PI * 2;
                // 境界(900)から確実に内側に収まるように配置
                const dist = 180 + Math.random() * (game.boundaryRadius - 380);
                pos = new Vector2(centerX + Math.cos(angle) * dist, centerY + Math.sin(angle) * dist);
                for (const body of game.bodies) {
                    if (pos.sub(body.position).length() < minDistance) {
                        tooClose = true;
                        break;
                    }
                }
                if (attempts > 100) break;
            } while (tooClose);

            if (!tooClose) {
                const mass = 5000 + Math.random() * 15000;
                const body = new Body(pos, mass);
                body.radius = Math.sqrt(mass) / 5 + 2;
                
                // 各天体(星)の周囲に 1～2 個のアイテムを配置 (仕様 4.1.3, 7.2 に準拠)
                body.items = [];
                const itemCount = 1 + Math.floor(Math.random() * 2);
                for (let j = 0; j < itemCount; j++) {
                    const item = this.getWeightedRandomItem();
                    if (item) {
                        body.items.push(item);
                    }
                }

                game.bodies.push(body);
            }
        }
    }

    collectItems(body) {
        if (!body.items || body.items.length === 0) return;

        body.items.forEach(itemData => {
            const category = itemData.category;

            this.game.pendingItems.push({
                itemData,
                originalBody: body,
                collectedTime: this.game.simulatedTime
            });

            if (this.game.ship) {
                this.game.ship.collectedItems.push({
                    color: CATEGORY_COLORS[category] || '#fff',
                    timestamp: Date.now()
                });
            }

            if (category !== 'CARGO' && category !== 'COIN') {
                this.game.flightResults.items.push({ ...itemData });
            }
        });

        body.items = [];
        this.game.updateUI();
    }

    resolveItems(result, hitGoal = null) {
        const game = this.game;
        if (game.storySystem) game.storySystem.resetFlightFlag();

        if (result === 'success') {
            let luckCount = 0;

            // 【Spec 6.1】ゴールの基本報酬（スコア・コイン）は貨物に関係なく常に 1 回だけ付与する
            if (hitGoal) {
                game.pendingScore += (hitGoal.score || 0);
                game.pendingCoins += (hitGoal.coins || 0);
                game.flightResults.bonuses.push({ 
                    name: `${hitGoal.label} Reward`, 
                    value: hitGoal.score || 0, 
                    coins: hitGoal.coins || 0 
                });
            }

            game.pendingItems.forEach((pItem) => {
                const itemData = pItem.itemData;
                const { category } = itemData;

                if (category === 'CARGO') {
                    game.incrementCollectedItems(itemData.count || 1);
                    if (hitGoal && itemData.deliveryGoalId) {
                        const isMatch = hitGoal.id === itemData.deliveryGoalId;
                        if (isMatch) {
                            // 【Spec 6.2】配送ボーナスは一致する貨物の数 (N) に応じて個別に加算（N倍）
                            game.pendingScore += 1500;
                            game.pendingCoins += 100;
                            game.flightResults.bonuses.push({ 
                                name: 'Delivery Bonus', 
                                value: 1500, 
                                coins: 100 
                            });

                            const deliveryItem = { ...itemData, isDelivery: true, isMatch: true, bonusItems: [] };
                            game.flightResults.items.push(deliveryItem);

                            // ボーナスアイテムの付与 (一致貨物 1 個につき 6.1 の定義数分)
                            const bonusItemCount = hitGoal.bonusItems || 0;
                            for (let k = 0; k < bonusItemCount; k++) {
                                const bonus = game.getWeightedRandomItem({ thresholdBonus: 5, excludeCargo: true });
                                if (!bonus) continue;
                                deliveryItem.bonusItems.push({ ...bonus });

                                if (bonus.category === 'COIN') {
                                    game.pendingCoins += bonus.score || 0;
                                } else {
                                    game._addItemToInventory(bonus);
                                }
                            }
                            game.totalDeliveries++;

                            // ストーリー解放のトリガー (v0.15 新機能)
                            const branchMap = { 'TRADING_POST': 'T', 'REPAIR_DOCK': 'R', 'BLACK_MARKET': 'B' };
                            const branch = branchMap[hitGoal.id];
                            if (branch) {
                                game.storySystem.unlockNext(branch);
                            }
                        } else {
                            // 不一致配送: 一律 +10 コインのみ
                            game.pendingCoins += 10;
                            game.flightResults.items.push({ ...itemData, isDelivery: true, isMatch: false });
                            game.flightResults.bonuses.push({ name: 'Cargo (Unmatched)', value: 0, coins: 10 });
                        }
                    } else if (hitGoal) {
                        if (itemData.id === 'cargo_lucky') luckCount++;
                        game.flightResults.items.push({ ...itemData });
                    } else {
                        // 母星帰還
                        if (!game.homeStar.items) game.homeStar.items = [];
                        game.homeStar.items.push(itemData);
                        game.homeStar.isCollected = false;
                    }
                    return;
                }

                if (category === 'COIN') {
                    game.incrementCollectedItems(itemData.count || 1);
                    game.pendingCoins += itemData.score || 0;
                    game.flightResults.items.push(itemData);
                    return;
                }

                game._addItemToInventory(itemData);
            });

            game.pendingItems = [];
            game.currentCoinDiscount = Math.min(0.5, luckCount * 0.1);

        } else if (result === 'crashed' || result === 'lost') {
            game.flightResults.items = [];

            // 保険モジュール（mod_insurance）を装備しているか確認 (Spec 7.3)
            const insuranceModules = game.ship?.equippedModules ? game.ship.equippedModules.filter(m => m.onLostBonus) : [];
            const rocket = game.selection.rocket;

            if (insuranceModules.length > 0 && rocket) {
                let totalUnitValue = 0;
                if (rocket.chassis) totalUnitValue += game.calculateValue(rocket.chassis);
                if (rocket.logic) totalUnitValue += game.calculateValue(rocket.logic);

                // 搭載されている全モジュールの査定額を加算 (Spec 7.3)
                const modules = game.ship?.equippedModules || [];
                modules.forEach(m => {
                    totalUnitValue += game.calculateValue(m);
                });

                // 保険モジュール1つにつき1倍の査定額が支払われる (Spec 7.3.324)
                const totalPayout = totalUnitValue * insuranceModules.length;
                game.pendingCoins += totalPayout;
                game.flightResults.bonuses.push({ name: 'Insurance Payout', value: 0, coins: totalPayout });
            }

            if (game.pendingItems && game.pendingItems.length > 0) {
                if (result === 'crashed' && hitGoal) {
                    game.pendingItems.forEach(({ itemData }) => {
                        hitGoal.items.push(itemData);
                        hitGoal.isCollected = false;
                    });
                }
                game.pendingItems = [];
            }

            if (result === 'crashed' && game.selection.rocket && hitGoal) {
                const rocket = game.selection.rocket;
                const parts = [];
                if (rocket.chassis && Math.random() < 0.5) parts.push({ ...rocket.chassis, category: 'CHASSIS' });
                if (rocket.logic && Math.random() < 0.5) parts.push({ ...rocket.logic, category: 'LOGIC' });
                if (rocket.modules) {
                    for (const [modId, count] of Object.entries(rocket.modules)) {
                        const master = game.inventory.modules.find(m => m.id === modId) || PARTS.MODULES.find(m => m.id === modId);
                        if (master) {
                            for (let c = 0; c < count; c++) {
                                if (Math.random() < 0.5) parts.push({ ...master, category: 'MODULES' });
                            }
                        }
                    }
                }
                if (rocket.booster && Math.random() < 0.5) {
                    parts.push({ ...rocket.booster, category: 'BOOSTERS' });
                }

                parts.forEach(partData => {
                    hitGoal.items.push(partData);
                    hitGoal.isCollected = false;
                });
            }

        } else if (result === 'returned') {
            if (game.pendingItems && game.pendingItems.length > 0) {
                game.missionSystem.resolveItems('success');
            }
            game.activeBoosterAtLaunch = null;
        }

        game.updateUI();
    }

    getSectorItemThreshold() {
        return RARITY.RARE + ((this.game.stageLevel || 1) - 1);
    }

    getWeightedRandomItem(options = {}) {
        const {
            thresholdBonus = 0,
            excludeCargo = false,
            excludeCoin = false
        } = options;

        const baseThreshold = this.getSectorItemThreshold();
        const threshold = baseThreshold + thresholdBonus;

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
            if (!p.list) return;
            p.list.forEach(item => {
                const weight = threshold - item.rarity;
                if (weight > 0) {
                    items.push({ ...item, category: p.category, weight });
                }
            });
        });

        if (items.length === 0) return null;

        const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
        let rand = Math.random() * totalWeight;
        for (const i of items) {
            rand -= i.weight;
            if (rand <= 0) {
                const finalizedItem = { ...i };
                if (finalizedItem.maxCharges !== undefined && finalizedItem.charges === undefined) {
                    finalizedItem.charges = finalizedItem.maxCharges;
                }
                return finalizedItem;
            }
        }
        return items[0];
    }

    consumeRocketOnFailure() {
        const game = this.game;
        if (game.selection.rocket) {
            game.inventory.rockets = game.inventory.rockets.filter(r => r !== game.selection.rocket);
        }
    }

    isGameOver() {
        const game = this.game;
        const hasBuiltRockets = game.inventory.rockets.length > 0;
        const chassisCount = game.inventory.chassis.reduce((sum, c) => sum + (c.count || 0), 0);
        const logicCount = game.inventory.logic.reduce((sum, l) => sum + (l.count || 0), 0);

        const canBuildRockets = chassisCount > 0 && logicCount > 0;
        // 使用可能な（耐久度が残っている）発射台があるか (Spec 5.3.242)
        const hasLaunchers = game.inventory.launchers.some(l => (l.charges || 0) > 0);

        return !(hasBuiltRockets || canBuildRockets) || !hasLaunchers;
    }

    checkGameOver() {
        const game = this.game;
        if (this.isGameOver()) {
            game.setState('gameover');
            game.showResult('gameover');
        }
    }
}
