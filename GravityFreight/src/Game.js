import { PhysicsEngine, Body, Vector2, G } from './Physics.js';

export class Game {
    constructor(canvas, ui) {
        this.physics = new PhysicsEngine();
        this.canvas = canvas;
        this.ui = ui;
        this.state = 'aiming'; // aiming, flying, crashed, cleared
        this.bodies = [];
        this.ship = null;
        this.homeStar = null;
        this.portal = null;
        this.mousePos = new Vector2();
        this.launchTime = 0;
        this.accumulator = 0;
        this.fixedDt = 0.002; // 2ms (超高精度モード)

        this.initStage();
        this.setupListeners();
    }

    initStage() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        this.homeStar = new Body(new Vector2(centerX, centerY), 4000, true);
        this.homeStar.radius = 25;
        this.homeStar.isHome = true;

        this.bodies = [
            this.homeStar,
            new Body(new Vector2(centerX + 350, centerY - 250), 18000, true),
            new Body(new Vector2(centerX - 400, centerY + 200), 15000, true),
            new Body(new Vector2(centerX - 100, centerY - 450), 12000, true),
            new Body(new Vector2(centerX + 500, centerY + 300), 20000, true),
            new Body(new Vector2(centerX - 600, centerY - 200), 14000, true),
            new Body(new Vector2(centerX + 150, centerY + 500), 10000, true),
            new Body(new Vector2(centerX - 300, centerY - 600), 16000, true)
        ];
        this.physics.bodies = [...this.bodies];

        this.portal = {
            x: centerX,
            y: centerY,
            radius: Math.min(this.canvas.width, this.canvas.height) * 0.95,
            startAngle: -Math.PI / 6,
            endAngle: Math.PI / 6
        };

        this.ship = new Body(new Vector2(centerX, centerY - this.homeStar.radius - 12), 10);
        this.state = 'aiming';
        this.accumulator = 0;
    }

    setupListeners() {
        window.addEventListener('mousemove', (e) => {
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;
            
            if (this.state === 'aiming') {
                const dir = this.mousePos.sub(this.homeStar.position).normalize();
                this.ship.position = this.homeStar.position.add(dir.scale(this.homeStar.radius + 12));
                this.ship.rotation = Math.atan2(dir.y, dir.x);
            }
        });

        const launch = () => {
            if (this.state === 'aiming') {
                const dir = this.mousePos.sub(this.homeStar.position).normalize();
                this.ship.velocity = dir.scale(1200);
                this.physics.bodies.push(this.ship);
                this.state = 'flying';
                this.launchTime = Date.now();
                this.accumulator = 0;
                this.ui.status.textContent = 'FLYING...';
            } else if (this.state === 'crashed' || this.state === 'cleared') {
                this.reset();
            }
        };

        window.addEventListener('mousedown', launch);
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') launch();
        });
    }

    reset() {
        this.physics.bodies = [];
        this.initStage();
        this.ui.status.textContent = 'CLICK or SPACE to LAUNCH';
        this.ui.message.textContent = '';
    }

    update(dt) {
        if (this.state === 'flying') {
            this.accumulator += dt;
            if (this.accumulator > 0.1) this.accumulator = 0.1;
            
            while (this.accumulator >= this.fixedDt) {
                this.physics.update(this.fixedDt);
                this.accumulator -= this.fixedDt;
            }
            this.checkCollisions();
        }
    }

    checkCollisions() {
        const shipPos = this.ship.position;
        const now = Date.now();

        for (const body of this.bodies) {
            if (body === this.homeStar && now - this.launchTime < 800) continue;

            const dist = shipPos.sub(body.position).length();
            const radius = body.radius || (Math.sqrt(body.mass) / 5 + 2);
            if (dist < radius + 5) {
                this.state = 'crashed';
                this.ui.message.textContent = 'CRASHED';
                this.ui.status.textContent = 'CLICK TO RESTART';
                return;
            }
        }

        const distFromCenter = shipPos.sub(new Vector2(this.canvas.width / 2, this.canvas.height / 2)).length();
        if (distFromCenter >= this.portal.radius) {
            const angle = Math.atan2(shipPos.y - this.portal.y, shipPos.x - this.portal.x);
            if (angle > this.portal.startAngle && angle < this.portal.endAngle) {
                this.state = 'cleared';
                this.ui.message.textContent = 'STAGE CLEAR';
                this.ui.status.textContent = 'CLICK TO NEXT';
            } else {
                this.state = 'crashed';
                this.ui.message.textContent = 'LOST IN SPACE';
                this.ui.status.textContent = 'CLICK TO RESTART';
            }
        }
    }

    getPredictionPoints() {
        if (this.state !== 'aiming') return [];
        
        const points = [];
        const dir = this.mousePos.sub(this.homeStar.position).normalize();
        let tempPos = this.homeStar.position.add(dir.scale(this.homeStar.radius + 12));
        let tempVel = dir.scale(1200);
        const simDt = this.fixedDt; 

        for (let i = 0; i < 4000; i++) { 
            // 5ステップ (10ms) ごとに記録（滑らかさの向上）
            if (i % 5 === 0) points.push(new Vector2(tempPos.x, tempPos.y));
            
            let totalForce = new Vector2();
            for (const body of this.bodies) {
                const diff = body.position.sub(tempPos);
                const distSq = diff.lengthSq();
                
                // 衝突判定 (シミュレーション内)
                const radius = body.radius || (Math.sqrt(body.mass) / 5 + 2);
                if (distSq < (radius + 5) ** 2) {
                    if (body === this.homeStar && i * simDt < 0.8) {
                        // 離脱時は重力を無視せず計算は続ける
                    } else {
                        // 衝突地点で終了
                        return points;
                    }
                }

                if (distSq < 100) continue;
                const forceMag = (G * 10 * body.mass) / distSq;
                totalForce = totalForce.add(diff.normalize().scale(forceMag));
            }
            
            const acc = totalForce.scale(1 / 10);
            tempVel = tempVel.add(acc.scale(simDt));
            tempPos = tempPos.add(tempVel.scale(simDt));

            const d = tempPos.sub(new Vector2(this.canvas.width / 2, this.canvas.height / 2)).length();
            if (d > this.portal.radius) {
                // ポータル到達点で終了
                points.push(new Vector2(tempPos.x, tempPos.y));
                break;
            }
        }
        return points;
    }
}
