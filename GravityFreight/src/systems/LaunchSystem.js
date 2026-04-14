import { Vector2 } from '../utils/Physics.js';
import { GAME_BALANCE, MAP_CONSTANTS } from '../core/Data.js';

export class LaunchSystem {
    constructor(game) {
        this.game = game;
    }

    checkReadyToAim() {
        const game = this.game;
        if (game.selection.rocket && game.selection.launcher) {
            game.setState('aiming');
            
            const centerX = game.canvas.width / 2;
            const centerY = game.canvas.height / 2;
            const prevRotation = game.ship ? game.ship.rotation : -Math.PI / 2;
            
            game.ship = {
                position: new Vector2(centerX, centerY - MAP_CONSTANTS.HOME_STAR_RADIUS - GAME_BALANCE.SHIP_START_OFFSET),
                velocity: new Vector2(),
                rotation: prevRotation
            };
            
            // 既存または新規の ship オブジェクトに対してプロパティを保証
            game.ship.trail = [];
            game.ship.collectedItems = [];
            game.ship.equippedModules = [];
            game.ship.velocity = new Vector2(0, 0);
            game.ship.isSafeToReturn = false;

            if (game.ship.rotation === undefined) game.ship.rotation = -Math.PI / 2;

            // 位置を母星表面の適切な発射位置にリセット
            const homePos = game.homeStar.position;
            const resetOffset = new Vector2(Math.cos(game.ship.rotation), Math.sin(game.ship.rotation)).scale(game.homeStar.radius + GAME_BALANCE.SHIP_START_OFFSET);
            game.ship.position = homePos.add(resetOffset);

            // 性能計算 (ロケットベース性能 + ランチャー・ブースターの補正)
            const r = game.selection.rocket;
            const l = game.selection.launcher;
            const b = game.selection.booster;

            // 各倍率の初期化
            let pMult = (l.precisionMultiplier || 1.0) * (r.precisionMultiplier || 1.0);
            let pickMult = (r.pickupMultiplier || 1.0);
            let gMult = (r.gravityMultiplier || 1.0);
            let aMult = (r.arcMultiplier || 1.0);

            if (b) {
                if (b.precisionMultiplier) pMult *= b.precisionMultiplier;
                if (b.pickupMultiplier) pickMult *= b.pickupMultiplier;
                if (b.gravityMultiplier && b.duration === undefined) gMult *= b.gravityMultiplier;
                if (b.arcMultiplier) aMult *= b.arcMultiplier;
            }

            // モジュールリストを同期
            game.ship.equippedModules = [];
            if (Array.isArray(r.modules)) {
                game.ship.equippedModules = r.modules.map(m => {
                    const inst = { ...m };
                    if (inst.charges === undefined && inst.maxCharges !== undefined) {
                        inst.charges = inst.maxCharges;
                    }
                    return inst;
                });
            }

            game.ship.mass = r.mass || 10;
            game.ship.pickupRange = r.pickupRange || 0;
            game.ship.pickupMultiplier = pickMult;
            game.ship.gravityMultiplier = gMult;
            game.ship.arcMultiplier = aMult;
            game.ship.precision = r.totalPrecision * pMult;

            game.updateUI();
        } else {
            game.setState('building');
            game.updateUI();
        }
    }

    launch() {
        const game = this.game;
        if (game.state !== 'aiming') return;
        game.audioSystem.playLaunch();
        game.achievementSystem.updateStat('stat_launches', 1);

        const l = game.selection.launcher;
        const r = game.selection.rocket;
        const b = game.selection.booster;

        if (l.charges <= 0) {
            game.showStatus('発射台の使用可能回数がありません。', 'error');
            return;
        }

        game.setState('flying');
        game.activeBoosterAtLaunch = b ? { ...b } : null;
        game.launchTime = game.simulatedTime;
        game.launchScore = game.score;
        game.launchCoins = game.coins;

        if (b) {
            if (b.gravityMultiplier !== undefined) {
                game.ship.activeBoosterEffect = { ...b };
            }
            game.ship.basePickupRange = game.ship.pickupRange;
        }

        let power = l.power * (r.powerMultiplier || 1);
        if (b && b.powerMultiplier) power *= b.powerMultiplier;
        power *= (1 + game.returnBonus);

        const angle = game.ship.rotation;
        const massFactor = Math.sqrt(10 / game.ship.mass);
        game.ship.velocity = new Vector2(Math.cos(angle) * (power * massFactor), Math.sin(angle) * (power * massFactor));

        // --- 録画機能 (Best Shot Replay) 用のスナップショット作成 ---
        // 規約2.1: 耐久消費や天体破壊が発生する前の「初期状態」を保存。
        // 速度計算直後に取得することで、リプレイ再生時に初速が正しく再現されるようにする。
        game.lastFlightRecordData = {
            sector: game.sector,
            returnBonus: game.returnBonus,
            bodies: JSON.parse(JSON.stringify(game.bodies)),
            goals: JSON.parse(JSON.stringify(game.goals)),
            selection: {
                rocket: r ? JSON.parse(JSON.stringify(r)) : null,
                launcher: l ? JSON.parse(JSON.stringify(l)) : null,
                booster: b ? JSON.parse(JSON.stringify(b)) : null
            },
            ship: {
                position: { x: game.ship.position.x, y: game.ship.position.y },
                velocity: { x: game.ship.velocity.x, y: game.ship.velocity.y },
                rotation: game.ship.rotation,
                mass: game.ship.mass,
                pickupRange: game.ship.pickupRange,
                basePickupRange: game.ship.basePickupRange,
                pickupMultiplier: game.ship.pickupMultiplier,
                gravityMultiplier: game.ship.gravityMultiplier,
                arcMultiplier: game.ship.arcMultiplier,
                precision: game.ship.precision,
                equippedModules: JSON.parse(JSON.stringify(game.ship.equippedModules || [])),
                activeBoosterEffect: game.ship.activeBoosterEffect ? JSON.parse(JSON.stringify(game.ship.activeBoosterEffect)) : null
            }
        };

        // 耐久度消費の判定
        const protectsLauncher = b && b.preventsLauncherWear;

        // 1. ブースターの消費
        if (b) {
            const takenB = game.inventorySystem.takeItem('boosters', b.instanceId, 1);
            if (takenB) {
                const currentCharges = (takenB.charges !== undefined ? takenB.charges : (takenB.maxCharges || 1));
                takenB.charges = currentCharges - 1;
                
                if (takenB.charges > 0) {
                    game.inventorySystem.addItem(takenB, { isNew: false });
                } else if (protectsLauncher) {
                    game.showStatus('燃料が空になりました。', 'info');
                }
            }
            game.selection.booster = null;
        }

        // 2. ランチャーの消費
        if (!protectsLauncher) {
            const takenL = game.inventorySystem.takeItem('launchers', l.instanceId, 1);
            if (takenL) {
                takenL.charges--;
                if (takenL.charges > 0) {
                    game.inventorySystem.addItem(takenL, { isNew: false });
                } else {
                    game.showStatus('発射台の耐久度が尽きました。', 'info');
                }
            }
        }
        game.selection.launcher = null;

        game.updateUI();
    }
}
