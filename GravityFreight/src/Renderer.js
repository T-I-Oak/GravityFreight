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
        const count = 400; // 星の数を増やして密度を確保
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        for (let i = 0; i < count; i++) {
            this.bgStars.push({
                x: (Math.random() - 0.5) * 2000,
                y: (Math.random() - 0.5) * 2000,
                z: Math.random() * 2000, // 奥行き
                size: Math.random() * 1.5 + 0.5,
                alpha: Math.random() * 0.7 + 0.3,
                pulseRate: 0.5 + Math.random() * 2.0,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }
    }


    clear() {
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    applyCamera(zoom, offset = { x: 0, y: 0 }) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ctx.save();
        this.ctx.translate(centerX + offset.x, centerY + offset.y);
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-centerX, -centerY);
    }

    restoreCamera() {
        this.ctx.restore();
    }


    drawStars(offset = { x: 0, y: 0 }, timestamp = 0) {
        if (!this.bgStars) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const speed = 0.05; // 0.05まで減速（極めて微細な動きに）
        const maxZ = 2000;

        this.ctx.save();
        
        for (const star of this.bgStars) {
            // Zを減少させて手前に移動
            star.z -= speed;
            if (star.z <= 0) {
                star.z = maxZ;
                star.x = (Math.random() - 0.5) * 2000;
                star.y = (Math.random() - 0.5) * 2000;
            }

            // 透視投影
            const scale = 200 / (star.z || 1); // 投影係数
            const px = centerX + star.x * scale + offset.x * 0.2;
            const py = centerY + star.y * scale + offset.y * 0.2;

            // 画面外チェック
            if (px < 0 || px > this.canvas.width || py < 0 || py > this.canvas.height) continue;

            // 明滅と輝度計算（手前ほど明るく、大きく）
            const twinkle = 0.8 + 0.2 * Math.sin((timestamp / 1000) * star.pulseRate + star.pulseOffset);
            const brightness = (1 - star.z / maxZ) * star.alpha * twinkle;
            const size = Math.min(4, star.size * scale * 1.2); // 最大サイズを4pxに制限し、倍率を1.2に抑制

            this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            this.ctx.beginPath();
            this.ctx.arc(px, py, Math.max(0.2, size), 0, Math.PI * 2);
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
        this.ctx.shadowColor = CATEGORY_COLORS.UNIT;
        this.ctx.fillStyle = CATEGORY_COLORS.UNIT;
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
            // 不透明度と線幅を上げて視認性を高める
            const alpha = (1 - t) * 0.9;

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(ship.position.x, ship.position.y, rippleRadius, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(0, 255, 204, ${alpha * 0.15})`; // わずかに塗りつぶしを追加
            this.ctx.strokeStyle = `rgba(0, 255, 204, ${alpha})`;
            this.ctx.lineWidth = 2.5;
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.restore();
        });
    }

    drawGoals(goals, boundaryRadius, arcMultiplier = 1.0) {
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
            const width = goal.width * arcMultiplier;
            const startAngle = goal.angle - width / 2;
            const endAngle = goal.angle + width / 2;

            // 外周への発光エフェクト
            this.ctx.save();
            this.ctx.strokeStyle = goal.color;
            this.ctx.lineWidth = 6;
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = goal.color;
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, boundaryRadius, startAngle, endAngle);
            this.ctx.stroke();
            
            // ラベル表示 (曲線配置 - 視認性・順読性 最終改良版)
            if (goal.label) {
                this.ctx.save();
                this.ctx.font = 'bold 30px Orbitron, sans-serif';
                this.ctx.fillStyle = goal.color;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowColor = goal.color;
                
                const text = goal.label;
                const textRadius = boundaryRadius + 45; 
                
                let totalWidth = 0;
                const charWidths = [];
                for (let i = 0; i < text.length; i++) {
                    const w = this.ctx.measureText(text[i]).width + 6;
                    charWidths.push(w);
                    totalWidth += w;
                }
                const totalTextAngle = totalWidth / textRadius;

                // 2PIで正規化した角度
                const normalizedAngle = ((goal.angle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                
                // 下半分（概ね 0〜PI：右〜下〜左）かどうかの判定
                const isBottom = normalizedAngle > 0.0 * Math.PI && normalizedAngle < 1.0 * Math.PI;

                if (isBottom) {
                    // 下半分：円の外側から見て「左から右」に正立して読めるようにする
                    // 下半分では角度が増えると右から左へ移動するため、
                    // 左端（角度大）から開始して、角度を減らしながら（右へ）描画する
                    let currentAngle = goal.angle + totalTextAngle / 2;
                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        const charWidth = charWidths[i];
                        const charAngle = currentAngle - (charWidth / 2) / textRadius;
                        
                        this.ctx.save();
                        this.ctx.translate(
                            centerX + Math.cos(charAngle) * textRadius,
                            centerY + Math.sin(charAngle) * textRadius
                        );
                        // 文字を180度反転させて正立させる
                        this.ctx.rotate(charAngle - Math.PI / 2);
                        this.ctx.fillText(char, 0, 0);
                        this.ctx.restore();
                        
                        currentAngle -= charWidth / textRadius;
                    }
                } else {
                    // 上半分：通常通り（左端＝角度小 から開始して、角度を増やしながら右へ）
                    let currentAngle = goal.angle - totalTextAngle / 2;
                    for (let i = 0; i < text.length; i++) {
                        const char = text[i];
                        const charWidth = charWidths[i];
                        const charAngle = currentAngle + (charWidth / 2) / textRadius;
                        
                        this.ctx.save();
                        this.ctx.translate(
                            centerX + Math.cos(charAngle) * textRadius,
                            centerY + Math.sin(charAngle) * textRadius
                        );
                        // 通常の外向き配置
                        this.ctx.rotate(charAngle + Math.PI / 2);
                        this.ctx.fillText(char, 0, 0);
                        this.ctx.restore();
                        
                        currentAngle += charWidth / textRadius;
                    }
                }
                this.ctx.restore();
            }
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

    drawVersion(version) {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.font = '12px Inter, sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`VER ${version}`, 10, this.canvas.height - 25);
        this.ctx.fillText(`© T.I.OAK 2026`, 10, this.canvas.height - 10);
        this.ctx.restore();
    }


}



