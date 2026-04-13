import { Vector2, calculateAcceleration, getDistanceSqToSegment, G } from '../utils/Physics.js';
import { ANIMATION_DURATION, GAME_BALANCE, MAP_CONSTANTS, UI_COLORS } from '../core/Data.js';

export class PhysicsOrchestrator {
    constructor(game) {
        this.game = game;
    }

    /**
     * 現在のセクターに基づいたスケーリング済みの重力定数を取得する
     */
    getCurrentGravityConstant() {
        return G * (1 + (this.game.sector - 1) * GAME_BALANCE.GRAVITY_SCALING_FACTOR);
    }

    updateHover() {
        const game = this.game;
        // ホバーを許可するステートのホワイトリスト
        const allowedStates = ['building', 'aiming', 'flying', 'result', 'gameover'];
        if (!allowedStates.includes(game.state)) {
            game.hoveredStar = null;
            return;
        }
        // マウスホバー判定
        const worldMouse = game.getWorldPos(game.mousePos);
        game.hoveredStar = null;
        for (const body of game.bodies) {
            const distWorld = worldMouse.sub(body.position).length();
            const distScreen = distWorld * game.zoom;
            // 判定半径 (master 準拠のロジック)
            const hitRadius = (body.radius || MAP_CONSTANTS.STAR_DEFAULT_RADIUS) * game.zoom + MAP_CONSTANTS.STAR_HIT_MARGIN;

            if (distScreen < hitRadius) {
                game.hoveredStar = body;
            }
        }
    }

    step(dt) {
        if (this.game.state === 'flying') {
            this.handleFlight(dt);
        } else if (this.game.state === 'finishing') {
            this.handleFinishing(dt);
        }
    }

    /**
     * ステートに関わらず自機が存在すれば実行する共通処理（ソナー音など）
     */
    updateCommon(dt) {
        const game = this.game;
        const ship = game.ship;
        if (!ship) return;

        // 波紋が表示される条件（スキャナー範囲が有効、かつ表示対象ステート）をチェック
        const radius = (ship.pickupRange || 0) * (ship.pickupMultiplier || 1);
        // ソナー波紋が表示されるステート（エイミング、飛行中）。
        // finishing ステートでは新しいパルスを撃ち止める（v0.26 仕様準拠）。
        const visibleStates = ['aiming', 'flying'];
        if (radius <= 0 || !visibleStates.includes(game.state)) return;

        // ソナー音のトリガー (1.0秒間隔)
        // エイミング中でもレンダラーの波紋と等しく同期させる
        const prevTime = game.simulatedTime - dt;
        if (Math.floor(game.simulatedTime) !== Math.floor(prevTime)) {
             game.audioSystem.playSonar();
        }
    }

    updateStateTimer(dt) {
        const game = this.game;
        game.stateTimer -= dt;
        if (game.stateTimer <= 0) {
            if (game.state === 'preparing') {
                game.setState('building');
            } else if (game.state === 'finishing') {
                // 演出終了、実際の結果ステートへ
                const result = game.finishResult;
                if (result === 'cleared' || result === 'returned') {
                    game.setState(result);
                } else {
                    // crashed / lost は即座に結果を表示して result ステートへ
                    game.showResult(result);
                    game.setState('result');
                }
            } else if (['cleared', 'returned'].includes(game.state)) {
                game.showResult(game.state);
                game.setState('result');
            }
        }
    }

    handleFlight(dt) {
        const game = this.game;
        const ship = game.ship;

        if (ship) {
            // ロケットの速度に応じた航行音の更新 (飛行中のみ)
            this.game.audioSystem.updateFlightSound(ship.velocity.length());

            // Magnetic Pulse 効果: 時間経過で範囲拡大 (飛行中のみ)
            const booster = game.activeBoosterAtLaunch;
            if (booster && booster.id === 'boost_magnet') {
                const elapsed = game.simulatedTime - (game.launchTime || 0);
                ship.pickupRange = ship.basePickupRange + elapsed * GAME_BALANCE.MAGNET_PULSE_GROWTH;
            }

            game.bodies.forEach(body => {
                const dist = ship.position.sub(body.position).length();
                const surfaceDist = dist - body.radius;
                const pickupRadius = (ship.pickupRange || 0) * (ship.pickupMultiplier || 1);

                // 母星のアイテムは「発射直後の母星表面」でも確実に回収できるようにする。
                // 通常の星は pickupRadius に依存するが、母星はカーゴの再回収導線として扱う。
                const isHomeStar = (body === game.homeStar);
                const isOnLaunchPadSurface = isHomeStar && surfaceDist <= GAME_BALANCE.SHIP_START_OFFSET;
                const canPickup = (surfaceDist <= pickupRadius) || isOnLaunchPadSurface;

                if (canPickup && !body.isCollected) {
                    game.collectItems(body);
                    body.isCollected = true;
                }
            });
        }

        if (ship && !ship.isSafeToReturn) {
            const dist = ship.position.sub(game.homeStar.position).length();
            if (dist > game.homeStar.radius + GAME_BALANCE.SAFE_DISTANCE_FROM_HOME) {
                ship.isSafeToReturn = true;
            }
        }

        const prevPos = new Vector2(ship.position.x, ship.position.y);

        const currentG = this.getCurrentGravityConstant();
        const acc = this.calculateGravity(ship.position, game.bodies, ship.mass, currentG);
        ship.velocity = ship.velocity.add(acc.scale(dt));
        const moveVec = ship.velocity.scale(dt);
        ship.position = ship.position.add(moveVec);

        // simulatedTime の更新は Game.js 側で行われるが、score はステップごとに加算 (事実ベース)
        game.score += GAME_BALANCE.SCORE_PER_STEP;

        // トレイルの更新 (0.01s ごと)
        if (game.simulatedTime % 0.01 < dt) {
            ship.trail.push(new Vector2(ship.position.x, ship.position.y));
            if (ship.trail.length > GAME_BALANCE.TRAIL_MAX_LENGTH) ship.trail.shift();
        }

        // 衝突判定をサブステップごとに行う (事実ベースの復元)
        if (this.checkCollisions(prevPos)) return;
    }

    /**
     * 回収フェーズ中の更新処理。ロケットは動かさず、軌跡とアイテムだけを吸い込ませる。
     */
    handleFinishing(dt) {
        const game = this.game;
        const ship = game.ship;
        if (!ship) return;

        // トレイルの更新 (毎ステップ) - 停止位置に点を蓄積させる
        ship.trail.push(new Vector2(ship.position.x, ship.position.y));
        if (ship.trail.length > GAME_BALANCE.TRAIL_MAX_LENGTH) ship.trail.shift();
    }

    calculateGravity(pos, bodies, mass, gravityConstant = G) {
        const game = this.game;
        const ship = game.ship;

        // 直近で回避・バウンドした星からの重力を一時的に無視 (母星と同様の挙動)
        const activeBodies = bodies.filter(body => {
            if (body === ship.lastEvasionBody) {
                const dist = pos.sub(body.position).length();
                if (dist < body.radius + GAME_BALANCE.SAFE_DISTANCE_FROM_HOME) {
                    return false;
                }
                // 十分に離れたらフラグをリセット
                ship.lastEvasionBody = null;
            }
            return true;
        });

        const acc = calculateAcceleration(pos, activeBodies, mass, null, gravityConstant);
        let mult = ship.gravityMultiplier || 1.0;

        if (ship.activeBoosterEffect && ship.activeBoosterEffect.gravityMultiplier !== undefined) {
            mult *= ship.activeBoosterEffect.gravityMultiplier;
            if (ship.activeBoosterEffect.duration !== undefined) {
                ship.activeBoosterEffect.duration--;
                if (ship.activeBoosterEffect.duration <= 0) {
                    ship.activeBoosterEffect = null;
                }
            }
        }
        return acc.scale(mult);
    }

    checkCollisions(startPos) {
        const game = this.game;
        const ship = game.ship;
        if (!ship) return false;

        const shipPos = ship.position;

        // 回避・バウンド直後の星を除外して衝突判定（粘着防止）
        const filteredBodies = game.bodies.filter(b => b !== ship.lastEvasionBody);
        const hitBody = this.findBodyCollision(shipPos, startPos, ship.isSafeToReturn, filteredBodies);

        if (hitBody) {
            // 回避モジュールの処理
            if (this.handleCollisionEvasion(hitBody)) return false;

            if (hitBody === game.homeStar) {
                game.audioSystem.playReturn(); // 帰還専用のチャイム音
                game.finishResult = 'returned';
                game.resolveItems('returned');
            } else {
                game.audioSystem.playCrash();
                game.finishResult = 'crashed';
                game.consumeRocketOnFailure();
                game.resolveItems('crashed', hitBody);
            }
            game.state = 'finishing';
            game.stateTimer = ANIMATION_DURATION / 1000;
            return true;
        }

        const distFromCenter = shipPos.sub(new Vector2(game.canvas.width / 2, game.canvas.height / 2)).length();
        if (distFromCenter >= game.boundaryRadius) {
            // Emergency Thruster
            if (this.handleEmergencyThruster(shipPos)) return false;

            const shipAngle = Math.atan2(shipPos.y - game.canvas.height / 2, shipPos.x - game.canvas.width / 2);
            let hitGoal = null;
            const arcBonus = ship.arcMultiplier || 1.0;

            for (const goal of game.goals) {
                let diff = shipAngle - goal.angle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;

                if (Math.abs(diff) < (goal.width * arcBonus) / 2) {
                    hitGoal = goal;
                    break;
                }
            }

            if (hitGoal) {
                game.audioSystem.playGoal();
                game.finishResult = 'cleared';
                game.totalSectorsCompleted++;
                game.lastHitGoal = hitGoal;
                game.resolveItems('success', hitGoal);
            } else {
                game.audioSystem.playLost();
                game.finishResult = 'lost';
                game.consumeRocketOnFailure();
                game.resolveItems('lost');
            }
            game.state = 'finishing';
            game.stateTimer = ANIMATION_DURATION / 1000;
            return true;
        }
        return false;
    }

    handleCollisionEvasion(body) {
        const game = this.game;
        const ship = game.ship;

        // 母星への帰還時は回避ロジックを適用せず、帰還成功判定を優先させる
        if (body === game.homeStar) return false;

        // 1. Star Breaker
        const breaker = ship.equippedModules.find(m => m.id === 'mod_star_breaker' && m.charges > 0);
        if (breaker) {
            breaker.charges--;
            game.bodies = game.bodies.filter(b => b !== body);
            ship.lastEvasionBody = null; // ブレイカーは星を消すので回避フラグ不要
            return true;
        }

        // 2. Impact Cushion
        const cushion = ship.equippedModules.find(m => m.id === 'mod_cushion' && m.charges > 0);
        if (cushion) {
            const normal = ship.position.sub(body.position).normalize();
            const dot = ship.velocity.dot(normal);
            
            // 接近中（dot < 0）の場合のみ跳ね返す
            if (dot < 0) {
                cushion.charges--;
                ship.velocity = ship.velocity.sub(normal.scale(2 * dot)).scale(GAME_BALANCE.CUSHION_BOUNCE);
                
                // 表面に押し出し、その星からの重力を一時的に無効化
                const surfaceRadius = body.radius + (ship.radius || 2) + GAME_BALANCE.COLLISION_MARGIN + 0.1;
                ship.position = body.position.add(normal.scale(surfaceRadius));
                ship.lastEvasionBody = body;
                
                return true;
            }
        }
        return false;
    }

    handleEmergencyThruster(shipPos) {
        const game = this.game;
        const ship = game.ship;
        const emergency = ship.equippedModules.find(m => m.id === 'mod_emergency' && m.charges > 0);
        if (emergency) {
            const center = new Vector2(game.canvas.width / 2, game.canvas.height / 2);
            const toCenter = center.sub(shipPos).normalize();
            const dot = ship.velocity.dot(toCenter);
            
            if (dot < 0) {
                emergency.charges--;
                ship.velocity = toCenter.scale(ship.velocity.length() * GAME_BALANCE.EMERGENCY_THRUST_MULT);
                ship.lastEvasionBody = null; // 境界線回避なので体当たりフラグは不要
                return true;
            }
        }
        return false;
    }

    findBodyCollision(pos, prevPos, isSafeToReturn, bodies = null) {
        const game = this.game;
        const ship = game.ship;
        const targetBodies = bodies || game.bodies;
        for (const body of targetBodies) {
            // 母星は安全帰還フラグが立つまで衝突を回避
            if (body === game.homeStar && !isSafeToReturn) continue;

            const shipRadius = ship ? (ship.radius || 2) : 2;
            const radius = body.radius || (Math.sqrt(body.mass) / 5 + 2);
            const collisionDist = radius + shipRadius + GAME_BALANCE.COLLISION_MARGIN;
            const distSq = getDistanceSqToSegment(body.position, prevPos, pos);

            if (distSq < collisionDist * collisionDist) {
                return body;
            }
        }
        return null;
    }

    getPredictionPoints() {
        const game = this.game;
        if (game.state !== 'aiming') return [];
        try {
            const points = [];
            const rotation = (game.ship && game.ship.rotation !== undefined) ? game.ship.rotation : -Math.PI / 2;
            const dir = new Vector2(Math.cos(rotation), Math.sin(rotation));
            const rocket = game.selection.rocket;
            if (!rocket) {
                return [];
            }

            const launcher = game.selection.launcher;
            let power = launcher ? launcher.power : 1200;
            if (game.selection.booster && game.selection.booster.powerMultiplier) {
                power *= game.selection.booster.powerMultiplier;
            }
            power *= (1 + game.returnBonus);
            const mass = rocket.mass || GAME_BALANCE.DEFAULT_SHIP_MASS;
            const massFactor = Math.sqrt(GAME_BALANCE.DEFAULT_SHIP_MASS / mass);
            let tempVel = dir.scale(power * massFactor);
            
            // EventSystem.js の初期化位置 (centerY - 25 - 12) と完全に一致させる
            let tempPos = game.homeStar.position.add(dir.scale(game.homeStar.radius + GAME_BALANCE.SHIP_START_OFFSET));

            const currentG = this.getCurrentGravityConstant();
            const simDt = game.fixedDt;
            const accBonus = launcher ? (launcher.precisionMultiplier || 1.0) : 1.0;
            const precision = ((rocket.totalPrecision || 0) + (launcher ? (launcher.precision || 0) : 0)) * ((rocket.precisionMultiplier || 1.0) * accBonus);

            const gravityMultiplier = rocket.gravityMultiplier || 1.0;
            let boosterGravityMult = 1.0;
            let boosterDuration = 0;
            if (game.selection.booster && game.selection.booster.gravityMultiplier !== undefined) {
                boosterGravityMult = game.selection.booster.gravityMultiplier;
                boosterDuration = game.selection.booster.duration || 0;
            }

            let tempIsSafeToReturn = false;
            let tempLastEvasionBody = null; 
            let tempBodies = [...game.bodies];
            
            const modules = rocket.modules ? Object.values(rocket.modules) : [];
            const hasGhostBreaker = modules.some(m => m.ghostType === 'breaker');
            const hasGhostCushion = modules.some(m => m.ghostType === 'cushion');
            const hasGhostEmergency = modules.some(m => m.ghostType === 'emergency');

            for (let i = 0; i < precision; i++) {
                // 周期的にポイントを保存 (最初の点も含む)
                if (i % 5 === 0) points.push(new Vector2(tempPos.x, tempPos.y));

                const prevTempPos = new Vector2(tempPos.x, tempPos.y);
                
                // 重力計算（回避直後の星を除外）
                const activeTempBodies = tempBodies.filter(b => {
                    if (b === tempLastEvasionBody) {
                        const dist = tempPos.sub(b.position).length();
                        if (dist < b.radius + GAME_BALANCE.SAFE_DISTANCE_FROM_HOME) return false;
                        tempLastEvasionBody = null; // 十分に離れたらリセット
                    }
                    return true;
                });
                const grav = calculateAcceleration(tempPos, activeTempBodies, mass, null, currentG);
                
                let currentGMult = gravityMultiplier;
                if (boosterDuration > 0) {
                    currentGMult *= boosterGravityMult;
                    boosterDuration--;
                }
                
                const gravityAcc = grav.scale(currentGMult);
                tempVel = tempVel.add(gravityAcc.scale(simDt));
                tempPos = tempPos.add(tempVel.scale(simDt));

                // 母星から十分離れたかチェック
                if (!tempIsSafeToReturn) {
                    const dist = tempPos.sub(game.homeStar.position).length();
                    if (dist > game.homeStar.radius + GAME_BALANCE.SAFE_DISTANCE_FROM_HOME) tempIsSafeToReturn = true;
                }

                // 衝突判定（回避直後の星を除外）
                const filteredCollBodies = tempBodies.filter(b => b !== tempLastEvasionBody);
                const hitBody = this.findBodyCollision(tempPos, prevTempPos, tempIsSafeToReturn, filteredCollBodies);
                
                if (hitBody) {
                    if (hitBody === game.homeStar) return points;
                    
                    if (hasGhostBreaker) {
                        tempBodies = tempBodies.filter(b => b !== hitBody);
                        tempLastEvasionBody = null;
                        continue;
                    } else if (hasGhostCushion) {
                        const normal = tempPos.sub(hitBody.position).normalize();
                        const dot = tempVel.dot(normal);
                        if (dot < 0) {
                            tempVel = tempVel.sub(normal.scale(2 * dot)).scale(GAME_BALANCE.CUSHION_BOUNCE);
                            const surfaceRadius = hitBody.radius + 2 + GAME_BALANCE.COLLISION_MARGIN + 0.1;
                            tempPos = hitBody.position.add(normal.scale(surfaceRadius));
                            tempLastEvasionBody = hitBody;
                            continue;
                        }
                    }
                    return points;
                }

                const d = tempPos.sub(new Vector2(game.canvas.width / 2, game.canvas.height / 2)).length();
                if (d > game.boundaryRadius) {
                    if (hasGhostEmergency) {
                        const center = new Vector2(game.canvas.width / 2, game.canvas.height / 2);
                        const toCenter = center.sub(tempPos).normalize();
                        tempVel = toCenter.scale(tempVel.length() * GAME_BALANCE.EMERGENCY_THRUST_MULT);
                        tempLastEvasionBody = null;
                        continue;
                    }
                    points.push(new Vector2(tempPos.x, tempPos.y));
                    break;
                }
            }
            return points;
        } catch (e) {
            return [];
        }
    }

    draw(ctx, dt = 0.016) {
        const game = this.game;
        const renderer = game.renderer;
        if (!renderer) return;

        renderer.clear();
        renderer.drawStars(game.cameraOffset, game.simulatedTime * 1000, dt);

        // 最初のワープ（セクター0以前）の初期段階では、マップ要素を描画しない
        const isInitialWarpPhase = game.state === 'preparing' && !game.isWarpInitialized && game.totalSectorsCompleted === 0;

        const zoom = game.visualZoom || game.zoom;
        renderer.applyCamera(zoom, game.cameraOffset);

        if (!isInitialWarpPhase) {
            if (game.state === 'aiming') {
                const points = this.getPredictionPoints();
                renderer.drawPrediction(points, zoom);
            }

            game.bodies.forEach(body => {
                const isHovered = (game.hoveredStar === body);
                const baseColor = body.color || UI_COLORS.NORMAL_STAR;
                const glowColor = isHovered ? baseColor : (body.color || UI_COLORS.NORMAL_STAR_GLOW);
                renderer.drawBody(body, baseColor, glowColor);
            });

            const arcBonus = game.ship ? (game.ship.arcMultiplier || 1.0) : 1.0;
            renderer.drawGoals(game.goals, game.boundaryRadius, arcBonus);
        }

        if (game.ship) {
            const showShipStates = ['aiming', 'flying'];
            const showTrailStates = ['aiming', 'flying', 'finishing'];
            const showOthersStates = ['aiming', 'flying', 'finishing']; // Scanner ripple, trail, items
            
            if (showOthersStates.includes(game.state)) {
                renderer.drawTrail(game.ship.trail);
                renderer.drawCollectedItems(game.ship);
                renderer.drawScannerRipple(game.ship);
            }
            if (showShipStates.includes(game.state)) {
                renderer.drawShip(game.ship);
            }
        }

        renderer.restoreCamera();
        renderer.drawVersion(game.version);
    }
}
