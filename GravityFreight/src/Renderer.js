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
    }

    clear() {
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawStars() {
        // 固定の星々（背景）
        this.ctx.fillStyle = '#ffffff';
        // 簡易的な実装: シード値に基づかないが、本来は生成すべき。
        // 今回はフレームごとに描画するのではなく、一度だけ描画するか
        // ここでは単純にランダムに描画する（デモ用）
    }

    drawBody(body, color, glowColor) {
        const { x, y } = body.position;
        const radius = Math.sqrt(body.mass) / 5 + 2;

        this.ctx.save();
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = glowColor || color;
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    drawShip(ship) {
        const { x, y } = ship.position;
        const angle = Math.atan2(ship.velocity.y, ship.velocity.x);

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
    }

    drawPortal(portal) {
        const { x, y, radius, startAngle, endAngle } = portal;
        this.ctx.save();
        this.ctx.strokeStyle = '#00ffcc';
        this.ctx.lineWidth = 4;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00ffcc';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, startAngle, endAngle);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawPrediction(points) {
        if (points.length < 2) return;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }
}
