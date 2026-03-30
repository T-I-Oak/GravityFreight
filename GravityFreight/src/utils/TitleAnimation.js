export class TitleAnimation {
    constructor(bgCanvas, fgCanvas) {
        this.bgCanvas = bgCanvas;
        this.fgCanvas = fgCanvas;
        this.bgCtx = bgCanvas.getContext('2d');
        this.fgCtx = fgCanvas.getContext('2d');
        
        this.rocketColor = '#ffffff'; // 共通色
        this.accentColor = '#00ffcc'; // ネオン色
        
        this.trail = [];
        this.maxTrail = 60;
        this.time = 0;
        
        this.orbitA = 380; // 長半径
        this.orbitB = 120; // 短半径
        this.inclination = -30 * Math.PI / 180; // 逆方向に30度傾斜
        this.cargoGap = 10; // 荷物との間隔（将来的な調整用）
        
        this.isRunning = false;
        this.requestId = null;

        this.handleResize = this.resize.bind(this);
        window.addEventListener('resize', this.handleResize);
        this.resize();
    }

    resize() {
        this.bgCanvas.width = window.innerWidth;
        this.bgCanvas.height = window.innerHeight;
        this.fgCanvas.width = window.innerWidth;
        this.fgCanvas.height = window.innerHeight;
        
        // 画面サイズに応じて軌道を調整
        const minDim = Math.min(window.innerWidth, window.innerHeight);
        this.orbitA = Math.min(450, window.innerWidth * 0.4);
        this.orbitB = this.orbitA * 0.35;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }

    stop() {
        this.isRunning = false;
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }

    animate() {
        if (!this.isRunning) return;
        
        this.update();
        this.render();
        
        this.requestId = requestAnimationFrame(() => this.animate());
    }

    update() {
        this.time += 0.015; // 周回速度
        const t = this.time;
        
        // 楕円軌道上の座標 (x', y')
        const xp = this.orbitA * Math.cos(t);
        const yp = this.orbitB * Math.sin(t);
        
        // 30度回転を適用 (x, y)
        const x = xp * Math.cos(this.inclination) - yp * Math.sin(this.inclination);
        const y = xp * Math.sin(this.inclination) + yp * Math.cos(this.inclination);
        
        // 深度判定 (sin(t) > 0 なら手前、< 0 なら奥)
        const isFront = Math.sin(t) > 0;
        
        // 角度（進行方向）
        const dx = -this.orbitA * Math.sin(t) * Math.cos(this.inclination) - this.orbitB * Math.cos(t) * Math.sin(this.inclination);
        const dy = -this.orbitA * Math.sin(t) * Math.sin(this.inclination) + this.orbitB * Math.cos(t) * Math.cos(this.inclination);
        const angle = Math.atan2(dy, dx);

        const currentPos = {
            x: x + window.innerWidth / 2,
            y: y + window.innerHeight * 0.45, // タイトル位置に合わせる
            isFront,
            angle
        };

        this.trail.push(currentPos);
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }
    }

    render() {
        this.bgCtx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        this.fgCtx.clearRect(0, 0, this.fgCanvas.width, this.fgCanvas.height);
        
        if (this.trail.length < 2) return;

        // 軌跡の描画 (セグメントごとにキャンバスを切り替え)
        for (let i = 1; i < this.trail.length; i++) {
            const p1 = this.trail[i-1];
            const p2 = this.trail[i];
            const alpha = i / this.trail.length;
            
            const ctx = p2.isFront ? this.fgCtx : this.bgCtx;
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
        }

        // ロケットの描画
        const head = this.trail[this.trail.length - 1];
        const ctx = head.isFront ? this.fgCtx : this.bgCtx;
        
        ctx.save();
        ctx.translate(head.x, head.y);
        ctx.rotate(head.angle);
        
        // ロケット本体
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.accentColor;
        ctx.fillStyle = this.rocketColor;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-6, 5);
        ctx.lineTo(-6, -5);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();

        // 貨物（Cargo）の描画
        const cargoIdx = this.trail.length - 1 - this.cargoGap;
        if (cargoIdx >= 0) {
            const p = this.trail[cargoIdx];
            const cargoCtx = p.isFront ? this.fgCtx : this.bgCtx;
            cargoCtx.save();
            cargoCtx.shadowBlur = 8;
            cargoCtx.shadowColor = '#00e5ff'; // CATEGORY_COLORS.CARGO
            cargoCtx.fillStyle = '#00e5ff';
            cargoCtx.beginPath();
            cargoCtx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            cargoCtx.fill();
            cargoCtx.restore();
        }
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', this.handleResize);
    }
}
