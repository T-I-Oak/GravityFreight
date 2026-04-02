import { Vector2, calculateAcceleration, getDistanceSqToSegment } from '../utils/Physics.js';
import { ANIMATION_DURATION } from '../core/Data.js';

export class PhysicsOrchestrator {
    constructor(game) {
        this.game = game;
    }

    updateHover() {
        const game = this.game;
        // マウスホバー判定
        const worldMouse = game.getWorldPos(game.mousePos);
        game.hoveredStar = null;
        for (const body of game.bodies) {
            const distWorld = worldMouse.sub(body.position).length();
            const distScreen = distWorld * game.zoom;
            // 判定半径 (master 準拠のロジック)
            const hitRadius = (body.radius || 20) * game.zoom + 15;

            if (distScreen < hitRadius) {
                game.hoveredStar = body;
                break;
            }
        }
    }

    step(dt) {
        if (this.game.state === 'flying') {
            this.handleFlight(dt);
        }
    }

    updateStateTimer(dt) {
        const game = this.game;
        game.stateTimer -= dt;
        if (game.stateTimer <= 0) {
            game.showResult(game.state);
            game.state = 'result';
            game.updateUI();
        }
    }

    handleFlight(dt) {
        const game = this.game;
        const ship = game.ship;

        if (ship) {
            // Magnetic Pulse 効果: 時間経過で範囲拡大
            const booster = game.selection.rocket.booster;
            if (booster && booster.id === 'boost_magnet') {
                const elapsed = game.simulatedTime - game.launchTime;
                ship.pickupRange = (game.selection.rocket.totalPickupRange || 0) + elapsed * 20;
            }

            game.bodies.forEach(body => {
                if (body === game.homeStar) return;
                const dist = ship.position.sub(body.position).length();
                const surfaceDist = dist - body.radius;
                const pickupRadius = (ship.pickupRange || 0) * (ship.pickupMultiplier || 1);

                if (surfaceDist <= pickupRadius && !body.isCollected) {
                    game.collectItems(body);
                    body.isCollected = true;
                }
            });
        }

        if (ship && !ship.isSafeToReturn) {
            const dist = ship.position.sub(game.homeStar.position).length();
            if (dist > game.homeStar.radius + 30) {
                ship.isSafeToReturn = true;
            }
        }

        const prevPos = new Vector2(ship.position.x, ship.position.y);

        const acc = this.calculateGravity(ship.position, game.bodies, ship.mass);
        ship.velocity = ship.velocity.add(acc.scale(dt));
        ship.position = ship.position.add(ship.velocity.scale(dt));

        // simulatedTime の更新は Game.js 側で行われるが、score はステップごとに加算 (事実ベース)
        game.score += 1;

        // 衝突判定をサブステップごとに行う (事実ベースの復元)
        if (this.checkCollisions(prevPos)) return;

        // トレイルの更新 (0.01s ごと)
        if (game.simulatedTime % 0.01 < dt) {
            // 5.1 規約に基づき、ガードではなくアサーティブに振る舞う
            if (!ship.trail) {
                throw new Error("Critical: ship.trail is undefined during flight. Check initialization in EventSystem.");
            }
            ship.trail.push(new Vector2(ship.position.x, ship.position.y));
            if (ship.trail.length > 40) ship.trail.shift();
        }
    }

    calculateGravity(pos, bodies, mass) {
        const game = this.game;
        const ship = game.ship;
        const acc = calculateAcceleration(pos, bodies, mass);
        let mult = ship.gravityMultiplier || 1.0;

        if (ship.activeBoosterEffect && ship.activeBoosterEffect.type === 'gravityMultiplier') {
            mult *= ship.activeBoosterEffect.value;
            if (ship.activeBoosterEffect.duration !== undefined) {
                ship.activeBoosterEffect.duration--;
                if (ship.activeBoosterEffect.duration <= 0) {
                    ship.activeBoosterEffect = null;
                }
            }
        }
        return acc.scale(mult);
    }

    checkCollisions(prevPos = null) {
        const game = this.game;
        const ship = game.ship;
        if (!ship) return false;

        const shipPos = ship.position;
        const startPos = prevPos || shipPos;

        const hitBody = this.findBodyCollision(shipPos, startPos, ship.isSafeToReturn);

        if (hitBody) {
            const body = hitBody;
            if (body === game.homeStar) {
                game.state = 'returned';
                game.stateTimer = ANIMATION_DURATION / 1000;
                game.resolveItems('returned');
            } else {
                // アドオンによる衝突回避判定
                if (this.handleCollisionEvasion(body)) return false;

                game.state = 'crashed';
                game.stateTimer = ANIMATION_DURATION / 1000;
                game.consumeRocketOnFailure();
                game.resolveItems('crashed', body);
            }
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
                game.state = 'cleared';
                game.stateTimer = ANIMATION_DURATION / 1000;
                game.lastHitGoal = hitGoal;
                game.pendingGoalBonus = hitGoal.score;
                game.pendingCoins += (hitGoal.coins || 0);
                game.flightResults.bonuses.push({ name: 'Goal Bonus', value: hitGoal.score, coins: hitGoal.coins || 0 });
                game.sector++;
                game.resolveItems('success', hitGoal);
            } else {
                game.state = 'lost';
                game.stateTimer = ANIMATION_DURATION / 1000;
                game.consumeRocketOnFailure();
                game.resolveItems('lost');
            }
            return true;
        }
        return false;
    }

    handleCollisionEvasion(body) {
        const game = this.game;
        const ship = game.ship;

        // 1. Star Breaker
        const breaker = ship.equippedModules.find(m => m.id === 'mod_star_breaker' && m.charges > 0);
        if (breaker) {
            breaker.charges--;
            game.bodies = game.bodies.filter(b => b !== body);
            return true;
        }

        // 2. Impact Cushion
        const cushion = ship.equippedModules.find(m => m.id === 'mod_cushion' && m.charges > 0);
        if (cushion) {
            cushion.charges--;
            const normal = ship.position.sub(body.position).normalize();
            const dot = ship.velocity.dot(normal);
            ship.velocity = ship.velocity.sub(normal.scale(2 * dot)).scale(0.5);
            return true;
        }
        return false;
    }

    handleEmergencyThruster(shipPos) {
        const game = this.game;
        const ship = game.ship;
        const emergency = ship.equippedModules.find(m => m.id === 'mod_emergency' && m.charges > 0);
        if (emergency) {
            emergency.charges--;
            const center = new Vector2(game.canvas.width / 2, game.canvas.height / 2);
            const toCenter = center.sub(shipPos).normalize();
            ship.velocity = toCenter.scale(ship.velocity.length() * 0.8);
            return true;
        }
        return false;
    }

    findBodyCollision(pos, prevPos, isSafeToReturn, bodies = null) {
        const game = this.game;
        const targetBodies = bodies || game.bodies;
        for (const body of targetBodies) {
            if (body === game.homeStar && !isSafeToReturn) continue;

            const radius = body.radius || (Math.sqrt(body.mass) / 5 + 2);
            const shipRadius = game.ship ? (game.ship.radius || 2) : 2;
            const collisionDist = radius + shipRadius + 1;
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
            const mass = rocket.mass || 10;
            const massFactor = Math.sqrt(10 / mass);
            let tempVel = dir.scale(power * massFactor);
            
            // EventSystem.js の初期化位置 (centerY - 25 - 12) と完全に一致させる
            let tempPos = game.homeStar.position.add(dir.scale(game.homeStar.radius + 12));

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
            let tempBodies = [...game.bodies];
            
            const hasGhostBreaker = rocket.modules && Object.values(rocket.modules).some(m => m.ghostType === 'breaker');
            const hasGhostCushion = rocket.modules && Object.values(rocket.modules).some(m => m.ghostType === 'cushion');
            const hasGhostEmergency = rocket.modules && Object.values(rocket.modules).some(m => m.ghostType === 'emergency');

            for (let i = 0; i < precision; i++) {
                if (i % 5 === 0) points.push(new Vector2(tempPos.x, tempPos.y));

                const prevTempPos = new Vector2(tempPos.x, tempPos.y);
                const grav = calculateAcceleration(tempPos, tempBodies, mass);
                
                let currentGMult = gravityMultiplier;
                if (boosterDuration > 0) {
                    currentGMult *= boosterGravityMult;
                    boosterDuration--;
                }
                
                const gravityAcc = grav.scale(currentGMult);
                tempVel = tempVel.add(gravityAcc.scale(simDt));
                tempPos = tempPos.add(tempVel.scale(simDt));

                if (!tempIsSafeToReturn) {
                    const dist = tempPos.sub(game.homeStar.position).length();
                    if (dist > game.homeStar.radius + 30) tempIsSafeToReturn = true;
                }

                const hitBody = this.findBodyCollision(tempPos, prevTempPos, tempIsSafeToReturn, tempBodies);
                if (hitBody) {
                    if (hitBody === game.homeStar) return points;
                    if (hasGhostBreaker) {
                        tempBodies = tempBodies.filter(b => b !== hitBody);
                        continue;
                    } else if (hasGhostCushion) {
                        const normal = tempPos.sub(hitBody.position).normalize();
                        const dot = tempVel.dot(normal);
                        tempVel = tempVel.sub(normal.scale(2 * dot)).scale(0.5);
                        continue;
                    }
                    return points;
                }

                const d = tempPos.sub(new Vector2(game.canvas.width / 2, game.canvas.height / 2)).length();
                if (d > game.boundaryRadius) {
                    if (hasGhostEmergency) {
                        const center = new Vector2(game.canvas.width / 2, game.canvas.height / 2);
                        const toCenter = center.sub(tempPos).normalize();
                        tempVel = toCenter.scale(tempVel.length() * 0.8);
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

    draw(ctx) {
        const game = this.game;
        const renderer = game.renderer;
        if (!renderer) return;

        renderer.clear();
        renderer.drawStars(game.cameraOffset, game.simulatedTime * 1000);

        renderer.applyCamera(game.zoom, game.cameraOffset);

        if (game.state === 'aiming') {
            const points = this.getPredictionPoints();
            renderer.drawPrediction(points, game.zoom);
        }

        game.bodies.forEach(body => {
            const glow = (game.hoveredStar === body);
            // 通常の星は明るい黄色 (#ffcc00) で表示
            renderer.drawBody(body, body.color || '#ffcc00', glow ? '#ffcc00' : (body.color || 'rgba(255,204,0,0.5)'));
        });

        if (game.ship && (['aiming', 'flying', 'crashed', 'returned'].includes(game.state))) {
            renderer.drawTrail(game.ship.trail);
            renderer.drawShip(game.ship);
        }

        const arcBonus = game.ship ? (game.ship.arcMultiplier || 1.0) : 1.0;
        renderer.drawGoals(game.goals, game.boundaryRadius, arcBonus);

        renderer.restoreCamera();
        renderer.drawVersion(game.version);
    }
}
