import { CATEGORY_COLORS } from './Data.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.generateBgStars();
    }

    generateBgStars() {
        this.bgStars = [];
        const count = 200;
        for (let i = 0; i < count; i++) {
            this.bgStars.push({
                x: Math.random() * 4000 - 2000, // 広めに散らす
                y: Math.random() * 4000 - 2000,
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.5 + 0.3
            });
        }
    }


    clear() {
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    applyCamera(zoom) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-centerX, -centerY);
    }

    restoreCamera() {
        this.ctx.restore();
    }


    drawStars() {
        if (!this.bgStars) return;
        this.ctx.save();
        for (const star of this.bgStars) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x + this.canvas.width / 2, star.y + this.canvas.height / 2, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.restore();
    }


    drawBody(body, color, glowColor) {
        const { x, y } = body.position;
        const radius = body.radius || (Math.sqrt(body.mass) / 5 + 2);
        
        // 母星は赤く表示
        const finalColor = body.isHome ? '#ff4444' : color;
        const finalGlow = body.isHome ? '#ff0000' : (glowColor || color);

        this.ctx.save();
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = finalGlow;
        this.ctx.fillStyle = finalColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // アイテム保持時の縁取り (未取得の場合のみ)
        if (!body.isCollected && body.items && body.items.length > 0) {
            const itemCount = body.items.length;
            const angleStep = (Math.PI * 2) / itemCount;

            for (let i = 0; i < itemCount; i++) {
                const itemData = body.items[i];
                if (!itemData || !CATEGORY_COLORS[itemData.category]) continue;

                const startAngle = i * angleStep;
                // 複数アイテム時は少し隙間を空ける
                const gap = itemCount > 1 ? 0.1 : 0;
                const endAngle = startAngle + angleStep - gap;

                this.ctx.save();
                this.ctx.strokeStyle = CATEGORY_COLORS[itemData.category];
                this.ctx.lineWidth = 2;
                this.ctx.shadowBlur = 10;
                this.ctx.shadowColor = CATEGORY_COLORS[itemData.category];
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, radius + 4, startAngle, endAngle);
                this.ctx.stroke();
                
                this.ctx.restore();
            }
        }

        this.ctx.restore();
    }



    drawShip(ship) {
        const { x, y } = ship.position;
        // 速度がある場合はその方向、ない場合は rotation プロパティを使用
        const angle = (ship.velocity.lengthSq() > 0.1) 
            ? Math.atan2(ship.velocity.y, ship.velocity.x)
            : (ship.rotation || 0);

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        
        // 船体（三角形）
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#4488ff';
        this.ctx.fillStyle = '#4488ff';
        this.ctx.beginPath();
        this.ctx.moveTo(10, 0);
        this.ctx.lineTo(-5, 5);
        this.ctx.lineTo(-5, -5);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();

        // ソナー波紋（アイテム回収範囲）の描画
        this.drawScannerRipple(ship);

        // アイテム追従エフェクトの描画
        this.drawCollectedItems(ship);
    }

    drawScannerRipple(ship) {
        const radius = (ship.pickupRange || 0) * (ship.pickupMultiplier || 1);
        if (radius <= 0) return;

        const now = Date.now();
        const duration = 2000; // 2秒で1周

        [0, 0.5].forEach(offset => {
            const t = ((now + offset * duration) % duration) / duration;
            const rippleRadius = radius * t;
            const alpha = (1 - t) * 0.4;

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(ship.position.x, ship.position.y, rippleRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(0, 255, 204, ${alpha})`;
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();
            this.ctx.restore();
        });
    }

    drawGoals(goals, boundaryRadius) {
        this.ctx.save();
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 境界線全体を暗いグレーで描画
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, boundaryRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        goals.forEach(goal => {
            const startAngle = goal.angle - goal.width / 2;
            const endAngle = goal.angle + goal.width / 2;

            // 外周への発光エフェクト
            this.ctx.save();
            this.ctx.strokeStyle = goal.color;
            this.ctx.lineWidth = 6;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = goal.color;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, boundaryRadius, startAngle, endAngle);
            this.ctx.stroke();
            
            // ラベル表示 (削除)
            this.ctx.restore();
        });
        
        this.ctx.restore();
    }


    drawPrediction(points) {
        if (points.length < 2) return;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 1.5;
        // 破線を廃止（高密度な描画により実線の方が滑らかに見えるため）
        this.ctx.beginPath();

        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawCollectedItems(ship) {
        if (!ship.collectedItems || ship.collectedItems.length === 0) return;
        if (!ship.trail || ship.trail.length < 5) return;

        // 連なる感じで描画 (10フレームずつの間隔)
        ship.collectedItems.forEach((item, i) => {
            const gap = 8; // ドット間の間隔（トレイルのインデックス数）
            const trailIdx = Math.max(0, ship.trail.length - 1 - (i + 1) * gap);
            if (trailIdx >= 0) {
                const pos = ship.trail[trailIdx];
                this.ctx.save();
                this.ctx.shadowBlur = 8;
                this.ctx.shadowColor = item.color;
                this.ctx.fillStyle = item.color;
                this.ctx.beginPath();
                this.ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        });
    }

    drawTrail(points) {
        if (!points || points.length < 2) return;
        this.ctx.save();
        this.ctx.lineWidth = 2;
        
        // 後ろから前へ描画し、徐々に透明にする
        for (let i = 1; i < points.length; i++) {
            const alpha = (i / points.length) * 0.5; // 0.0から0.5まで
            this.ctx.strokeStyle = `rgba(68, 136, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.moveTo(points[i-1].x, points[i-1].y);
            this.ctx.lineTo(points[i].x, points[i].y);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawVersion(version, score = 0) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`VER ${version}`, 10, this.canvas.height - 25);
        this.ctx.fillText(`© T.I.OAK 2026`, 10, this.canvas.height - 10);

        // スコア表示 (中央上)
        this.ctx.font = 'bold 24px Inter, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillStyle = '#00ffcc';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#00ffcc';
        const displayScore = isNaN(score) ? 0 : score;
        this.ctx.fillText(`SCORE: ${Math.floor(displayScore).toLocaleString()}`, this.canvas.width / 2, 20);



        this.ctx.restore();
    }


}



