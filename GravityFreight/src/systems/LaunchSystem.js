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
            
            // 既存または新規の ship オブジェクトに対してプロパティを保証（初期化漏れを防止）
            game.ship.trail = [];
            game.ship.collectedItems = [];
            game.ship.equippedModules = [];
            game.ship.velocity = new Vector2(0, 0);
            game.ship.isSafeToReturn = false;

            if (game.ship.rotation === undefined) game.ship.rotation = -Math.PI / 2;

            // 位置を母星表面の適切な発射位置に強制リセット (不具合修正)
            const homePos = game.homeStar.position;
            const resetOffset = new Vector2(Math.cos(game.ship.rotation), Math.sin(game.ship.rotation)).scale(game.homeStar.radius + GAME_BALANCE.SHIP_START_OFFSET);
            game.ship.position = homePos.add(resetOffset);

            // 性能計算 (ロケットベース性能 + ランチャー・ブースターの補正)
            const r = game.selection.rocket;
            const l = game.selection.launcher;
            const b = game.selection.booster;

            // 各倍率の初期化 (ロケットとランチャーの基本値を合成)
            let pMult = (l.precisionMultiplier || 1.0) * (r.precisionMultiplier || 1.0);
            let pickMult = (r.pickupMultiplier || 1.0);
            let gMult = (r.gravityMultiplier || 1.0);
            let aMult = (r.arcMultiplier || 1.0);

            if (b) {
                if (b.precisionMultiplier) pMult *= b.precisionMultiplier;
                if (b.pickupMultiplier) pickMult *= b.pickupMultiplier;
                if (b.gravityMultiplier) gMult *= b.gravityMultiplier;
                if (b.arcMultiplier) aMult *= b.arcMultiplier;
            }

            // モジュールリスト（既に個別に展開済み）を同期
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

            // ロケットの基本設定を同期
            game.ship.mass = r.mass || 10;
            game.ship.pickupRange = r.pickupRange || 0;
            game.ship.pickupMultiplier = pickMult;
            game.ship.gravityMultiplier = gMult;
            game.ship.arcMultiplier = aMult;
            game.ship.precision = r.totalPrecision * pMult;

            game.updateUI();
        } else {
            game.setState('building');
            // ステートが既に building の場合 setState は何もしないため、明示的に UI を更新する
            game.updateUI();
        }
    }

    launch() {
        const game = this.game;
        if (game.state !== 'aiming') return;
        game.audioSystem.playLaunch();

        const l = game.selection.launcher;
        const r = game.selection.rocket;
        const b = game.selection.booster;

        if (l.charges <= 0) {
            game.showStatus('発射台の残り回数がありません。', 'error');
            return;
        }

        game.setState('flying');
        game.activeBoosterAtLaunch = b ? { ...b } : null;
        game.launchTime = game.simulatedTime;

        if (b) {
            // ブースター独自の航行中効果（閃光推進剤など）
            if (b.gravityMultiplier !== undefined) {
                game.ship.activeBoosterEffect = { ...b };
            }
            // マグネティック・パルス用の基準値を保存
            game.ship.basePickupRange = game.ship.pickupRange;
        }

        let power = l.power * (r.powerMultiplier || 1);
        if (b && b.powerMultiplier) power *= b.powerMultiplier;
        power *= (1 + game.returnBonus);

        const angle = game.ship.rotation;
        const massFactor = Math.sqrt(10 / game.ship.mass);
        game.ship.velocity = new Vector2(Math.cos(angle) * (power * massFactor), Math.sin(angle) * (power * massFactor));

        // 耐久度消費の判定 (v0.17: 高反応燃料などがランチャーの身代わりになるロジック)
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

        // 2. ランチャーの消費 (保護されていない場合)
        if (!protectsLauncher) {
            const takenL = game.inventorySystem.takeItem('launchers', l.instanceId, 1);
            if (takenL) {
                takenL.charges--;
                if (takenL.charges > 0) {
                    game.inventorySystem.addItem(takenL, { isNew: false });
                } else {
                    game.showStatus('ランチャーの耐久度が尽きました。', 'info');
                }
            }
        }
        game.selection.launcher = null;

        game.launchScore = game.score;
        game.launchCoins = game.coins;
        game.updateUI();
    }
}
