/**
 * TutorialDiagrams.js
 * チュートリアルの図解（Canvasアニメーション等）の描画ロジックを担当する。
 */
import { GOAL_COLORS, GOAL_NAMES, UI_COLORS, MAP_CONSTANTS, GAME_BALANCE } from '../../core/Data.js';
import { Renderer } from '../RenderingSystem.js';
import { Vector2 } from '../../utils/Physics.js';

export class TutorialDiagrams {
    constructor(game) {
        this.game = game;
        this.activeIntervals = [];
        this.activeTimeouts = [];
    }

    /**
     * アニメーションの停止とクリーンアップ
     */
    stopAll() {
        this.activeIntervals.forEach(clearInterval);
        this.activeIntervals = [];
        this.activeTimeouts.forEach(clearTimeout);
        this.activeTimeouts = [];
    }

    /**
     * 01. ASSEMBLE (建造) アニメーション
     */
    startAssembleAnimation(container) {
        const cards = container.querySelectorAll('.item-card');
        const button = container.querySelector('.btn-neon');
        if (!cards.length || !button) return;

        const runCycle = () => {
            cards.forEach(c => c.classList.remove('selected'));
            button.classList.remove('is-hovered');

            this.activeTimeouts.push(setTimeout(() => cards[0].classList.add('selected'), 750));
            this.activeTimeouts.push(setTimeout(() => cards[1].classList.add('selected'), 1500));
            this.activeTimeouts.push(setTimeout(() => cards[2].classList.add('selected'), 2250));
            this.activeTimeouts.push(setTimeout(() => button.classList.add('is-hovered'), 3300));

            this.activeTimeouts.push(setTimeout(() => {
                cards.forEach(c => c.classList.remove('selected'));
                button.classList.remove('is-hovered');
            }, 5200));
        };

        runCycle();
        const interval = setInterval(runCycle, 6700);
        this.activeIntervals.push(interval);
    }

    /**
     * 02. LAUNCH (発射) アニメーション
     */
    startLaunchAnimation(container, canvasId, currentSlideTracker) {
        const cards = container.querySelectorAll('.item-card');
        const button = container.querySelector('.btn-neon');
        const canvas = document.getElementById(canvasId);
        if (!cards.length || !button || !canvas) return;

        let swingAngle = 0;
        let currentOffset = 0;
        let isAiming = false;
        let showRocket = false;

        const runCycle = () => {
            isAiming = false;
            showRocket = false;
            currentOffset = 0;
            swingAngle = 0;
            cards.forEach(c => c.classList.remove('selected'));
            button.classList.remove('is-hovered');

            this.activeTimeouts.push(setTimeout(() => cards[0].classList.add('selected'), 750));
            this.activeTimeouts.push(setTimeout(() => {
                cards[1].classList.add('selected');
                showRocket = true;
            }, 1500));
            this.activeTimeouts.push(setTimeout(() => cards[2].classList.add('selected'), 2250));
            this.activeTimeouts.push(setTimeout(() => isAiming = true, 3300));
            this.activeTimeouts.push(setTimeout(() => {
                isAiming = false;
                button.classList.add('is-hovered');
            }, 5500));
            this.activeTimeouts.push(setTimeout(() => {
                cards.forEach(c => c.classList.remove('selected'));
                button.classList.remove('is-hovered');
                showRocket = false;
            }, 8000));
        };

        const animInterval = setInterval(() => {
            // カレントスライドが変更されたら停止（trackerは現在のスライド番号を返す関数）
            if (currentSlideTracker() !== 3) {
                clearInterval(animInterval);
                return;
            }

            // リサイズ追従
            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            if (isAiming) {
                swingAngle += 0.05;
                currentOffset = Math.sin(swingAngle) * 0.15;
            }
            this.drawLaunchDiagram(canvasId, currentOffset, showRocket);
        }, 30);

        this.activeIntervals.push(animInterval);
        runCycle();
        const cycleInterval = setInterval(runCycle, 9500);
        this.activeIntervals.push(cycleInterval);
    }

    /**
     * 発射図解の1フレーム描画
     */
    drawLaunchDiagram(canvasId, angleOffset = 0, showRocket = true) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const renderer = new Renderer(canvas, this.game);
        renderer.clear();

        const centerX = 55;
        const centerY = canvas.height - 30;
        const baseAngle = -Math.PI * 0.12;
        const angle = baseAngle + angleOffset;
        const zoom = 0.6;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(zoom, zoom);
        ctx.translate(-centerX, -centerY);

        const homeStar = {
            position: { x: centerX, y: centerY },
            radius: MAP_CONSTANTS.HOME_STAR_RADIUS,
            isHome: true
        };
        renderer.drawBody(homeStar, UI_COLORS.HOME_STAR, UI_COLORS.HOME_STAR_GLOW);

        if (showRocket) {
            const dist = MAP_CONSTANTS.HOME_STAR_RADIUS + GAME_BALANCE.SHIP_START_OFFSET;
            const shipPos = {
                x: centerX + Math.cos(angle) * dist,
                y: centerY + Math.sin(angle) * dist
            };
            renderer.drawShip({
                position: shipPos,
                velocity: new Vector2(0, 0),
                rotation: angle
            });

            const pPoints = Array.from({ length: 100 }, (_, i) => ({
                x: shipPos.x + Math.cos(angle) * (i * 4),
                y: shipPos.y + Math.sin(angle) * (i * 4)
            }));
            renderer.drawPrediction(pPoints);
        }
        ctx.restore();

        if (showRocket) {
            ctx.fillStyle = UI_COLORS.SCANNER;
            ctx.font = 'bold 8px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('TAP TO AIM', canvas.width - 20, canvas.height - 15);
        }
    }

    /**
     * 03. NAVIGATION (航行) シミュレーションアニメーション
     */
    startNavigationAnimation(canvasId, currentSlideTracker) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const renderer = new Renderer(canvas, this.game);

        const star = { position: new Vector2(80, canvas.height / 2 + 10), radius: 12, mass: 14000 };
        const boundaryRadius = 180;
        
        let shipPos, shipVel, trail, isGoal, isResetting;
        const resetFlight = () => {
            shipPos = new Vector2(-20, canvas.height / 2 - 50);
            shipVel = new Vector2(1.7, 6.2);
            trail = [];
            isGoal = false;
            isResetting = false;
        };
        resetFlight();

        const animate = () => {
            if (currentSlideTracker() !== 4) return;

            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }

            if (!isGoal) {
                const toStar = star.position.sub(shipPos);
                const distSq = Math.max(toStar.lengthSq(), 625);
                const force = toStar.normalize().scale(3000 / distSq);
                shipVel = shipVel.add(force);
                shipPos = shipPos.add(shipVel);
                trail.push({ x: shipPos.x, y: shipPos.y, alpha: 1.0 });

                if (shipPos.sub(star.position).length() >= boundaryRadius || shipPos.x > canvas.width + 50) {
                    isGoal = true;
                    isResetting = true;
                }
            }

            trail.forEach(pt => pt.alpha -= 0.008);
            trail = trail.filter(pt => pt.alpha > 0);
            if (isResetting && trail.length === 0) resetFlight();

            renderer.clear();
            renderer.drawBody(star, UI_COLORS.NORMAL_STAR, UI_COLORS.NORMAL_STAR_GLOW);

            // アーク描画
            ctx.save();
            ctx.translate(star.position.x, star.position.y);
            this._drawArcLabel(ctx, GOAL_NAMES.TRADING_POST, boundaryRadius, GOAL_COLORS.TRADING_POST);
            ctx.restore();

            // 航跡
            if (trail.length > 1) {
                ctx.save();
                ctx.lineWidth = 1.5;
                trail.forEach((p, i) => {
                    if (i === 0) return;
                    ctx.strokeStyle = UI_COLORS.TRAIL;
                    ctx.globalAlpha = p.alpha;
                    ctx.beginPath();
                    ctx.moveTo(trail[i-1].x, trail[i-1].y);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                });
                ctx.restore();
            }

            if (!isGoal) {
                ctx.save();
                ctx.fillStyle = "#ffffff";
                ctx.shadowBlur = 12;
                ctx.shadowColor = UI_COLORS.TRAIL;
                ctx.translate(shipPos.x, shipPos.y);
                ctx.rotate(Math.atan2(shipVel.y, shipVel.x));
                ctx.beginPath();
                ctx.moveTo(12, 0); ctx.lineTo(-6, 6); ctx.lineTo(-6, -6);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        };

        const interval = setInterval(animate, 16);
        this.activeIntervals.push(interval);
    }

    /**
     * アークとラベルの曲線描画ヘルパー
     */
    _drawArcLabel(ctx, label, radius, color) {
        const textRadius = radius + 15;
        ctx.font = 'bold 12px Orbitron, sans-serif';
        const totalTextWidth = ctx.measureText(label).width + (label.length * 3);
        const totalTextAngle = totalTextWidth / textRadius;
        const arcWidth = totalTextAngle + 0.15;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(0, 0, radius, -arcWidth / 2, arcWidth / 2);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let currentAngle = -totalTextAngle / 2;
        for (const char of label) {
            const charW = ctx.measureText(char).width + 3;
            const angle = currentAngle + (charW / 2) / textRadius;
            ctx.save();
            ctx.rotate(angle);
            ctx.translate(textRadius, 0);
            ctx.rotate(Math.PI / 2);
            ctx.fillText(char, 0, 0);
            ctx.restore();
            currentAngle += charW / textRadius;
        }
    }
}
