import { PhysicsEngine, Body, Vector2 } from './Physics.js';

export class Game {
    constructor(canvas, ui) {
        this.physics = new PhysicsEngine();
        this.canvas = canvas;
        this.ui = ui;
        this.state = 'aiming'; // aiming, flying, crashed, cleared
        this.bodies = [];
        this.ship = null;
        this.portal = null;
        this.mousePos = new Vector2();

        this.initStage();
        this.setupListeners();
    }

    initStage() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 星（重力源）の配置
        this.bodies = [
            new Body(new Vector2(centerX + 200, centerY - 100), 5000, true),
            new Body(new Vector2(centerX - 150, centerY + 150), 3000, true)
        ];
        this.bodies.forEach(b => this.physics.bodies.push(b));

        // 脱出ポータル（弧）
        this.portal = {
            x: centerX,
            y: centerY,
            radius: Math.min(this.canvas.width, this.canvas.height) * 0.45,
            startAngle: -Math.PI / 4,
            endAngle: Math.PI / 4
        };

        // 自機ポテンシャル位置（中央）
        this.ship = new Body(new Vector2(centerX, centerY), 10);
        this.state = 'aiming';
    }

    setupListeners() {
        window.addEventListener('mousemove', (e) => {
            this.mousePos.x = e.clientX;
            this.mousePos.y = e.clientY;
        });

        const launch = () => {
            if (this.state === 'aiming') {
                const dir = this.mousePos.sub(this.ship.position).normalize();
                this.ship.velocity = dir.scale(300); // 初期速度
                this.physics.bodies.push(this.ship);
                this.state = 'flying';
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
            this.physics.update(dt);
            this.checkCollisions();
        }
    }

    checkCollisions() {
        const shipPos = this.ship.position;

        // 星との衝突
        for (const body of this.bodies) {
            const dist = shipPos.sub(body.position).length();
            const radius = Math.sqrt(body.mass) / 5 + 2;
            if (dist < radius + 5) {
                this.state = 'crashed';
                this.ui.message.textContent = 'CRASHED';
                this.ui.status.textContent = 'CLICK TO RESTART';
            }
        }

        // ポータル（外周）との接触判定
        const distFromCenter = shipPos.sub(new Vector2(this.canvas.width / 2, this.canvas.height / 2)).length();
        if (distFromCenter >= this.portal.radius) {
            const angle = Math.atan2(shipPos.y - this.portal.y, shipPos.x - this.portal.x);
            // 角度がポータルの範囲内かチェック (簡易的)
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
        
        // 簡易的な将来予測
        const points = [];
        const dir = this.mousePos.sub(this.ship.position).normalize();
        let tempPos = new Vector2(this.ship.position.x, this.ship.position.y);
        let tempVel = dir.scale(300);
        const simDt = 0.1;

        for (let i = 0; i < 50; i++) {
            points.push(new Vector2(tempPos.x, tempPos.y));
            
            let totalForce = new Vector2();
            for (const body of this.bodies) {
                const diff = body.position.sub(tempPos);
                const distSq = diff.lengthSq();
                if (distSq < 100) continue;
                const forceMag = (1000 * 10 * body.mass) / distSq;
                totalForce = totalForce.add(diff.normalize().scale(forceMag));
            }
            
            const acc = totalForce.scale(1 / 10);
            tempVel = tempVel.add(acc.scale(simDt));
            tempPos = tempPos.add(tempVel.scale(simDt));
        }
        return points;
    }
}
