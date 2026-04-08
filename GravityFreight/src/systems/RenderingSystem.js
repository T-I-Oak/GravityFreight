import { CATEGORY_COLORS, STORY_DATA, UI_COLORS, MAP_CONSTANTS } from '../core/Data.js';

export class Renderer {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;
        this.ctx = canvas.getContext('2d');
        this.generateBgStars();
    }

    resize() {
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
        this.ctx.fillStyle = UI_COLORS.BG;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    applyCamera(zoom, offset = { x: 0, y: 0 }) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        this.ctx.save();
        
        // Model A: P_screen = Scale(Rotate(P_world - P_center)) + P_center + offset
        // ctxの適用順序はその逆
        this.ctx.translate(centerX + offset.x, centerY + offset.y);
        this.ctx.rotate(this.game ? this.game.mapRotation : 0);
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-centerX, -centerY);
    }

    restoreCamera() {
        this.ctx.restore();
    }


    drawStars(offset = { x: 0, y: 0 }, timestamp = 0, dt = 0.016) {
        if (!this.bgStars || !this.game) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const warpFactor = this.game.warpEffectSpeed || 1.0;
        const speed = 0.1 * warpFactor * (dt * 60); 
        const maxZ = 2000;
        const rotation = this.game.mapRotation;

        this.ctx.save();
        
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        for (const star of this.bgStars) {
            const oldZ = star.z;
            let wrapped = false;
            star.z -= speed;
            if (star.z <= 0) {
                star.z = maxZ - Math.random() * 800;
                star.x = (Math.random() - 0.5) * 2000;
                star.y = (Math.random() - 0.5) * 2000;
                wrapped = true;
            }

            const scale = 200 / (star.z || 1);
            const rx = star.x * cos - star.y * sin;
            const ry = star.x * sin + star.y * cos;
            const px = centerX + rx * scale + offset.x * 0.2;
            const py = centerY + ry * scale + offset.y * 0.2;

            if (px < 0 || px > this.canvas.width || py < 0 || py > this.canvas.height) continue;

            const twinkle = 0.8 + 0.2 * Math.sin((timestamp / 1000) * star.pulseRate + star.pulseOffset);
            let brightness = (0.15 + 0.85 * (1 - star.z / maxZ)) * star.alpha * twinkle;
            const size = Math.max(0.8, Math.min(4, star.size * scale * 1.2));

            const isWarping = !wrapped && warpFactor > 1.1;
            const drawAlpha = isWarping ? Math.min(1.0, brightness * 1.6) : brightness;

            this.ctx.strokeStyle = `rgba(255, 255, 255, ${drawAlpha})`;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${drawAlpha})`;
            
            if (isWarping) {
                const oldScale = 200 / oldZ;
                const opx = centerX + rx * oldScale + offset.x * 0.2;
                const opy = centerY + ry * oldScale + offset.y * 0.2;
                
                this.ctx.lineWidth = Math.max(0.8, size * 0.4);
                this.ctx.beginPath();
                this.ctx.moveTo(opx, opy);
                this.ctx.lineTo(px, py);
                this.ctx.stroke();
            } else {
                this.ctx.beginPath();
                this.ctx.arc(px, py, size * 0.45, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        
        this.ctx.restore();
    }


    drawBody(body, color, glowColor) {
        const { x, y } = body.position;
        const radius = body.radius || (Math.sqrt(body.mass) / 5 + 2);
        
        const finalColor = body.isHome ? UI_COLORS.HOME_STAR : color;
        const finalGlow = body.isHome ? UI_COLORS.HOME_STAR_GLOW : (glowColor || color);

        // ズーム倍率に応じたフェードアウト (2.0 -> 10.0 の間で透明度を 1.0 -> 0.0 へ)
        const visualZoom = this.game.visualZoom || 1.0;
        let alpha = 1.0;
        if (visualZoom > 2.0) {
            alpha = Math.max(0, 1.0 - (visualZoom - 2.0) / 8.0);
        }

        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = finalGlow;
        this.ctx.fillStyle = finalColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // アイテム保持時の縁取り (未取得の場合のみ)
        if (alpha > 0.1 && !body.isCollected && body.items && body.items.length > 0) {
            const itemCount = body.items.length;
            const angleStep = (Math.PI * 2) / itemCount;

            for (let i = 0; i < itemCount; i++) {
                const itemData = body.items[i];
                if (!itemData || !CATEGORY_COLORS[itemData.category]) continue;

                const startAngle = i * angleStep;
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
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = CATEGORY_COLORS.ROCKETS;
        this.ctx.fillStyle = CATEGORY_COLORS.ROCKETS;
        this.ctx.beginPath();
        this.ctx.moveTo(10, 0);
        this.ctx.lineTo(-5, 5);
        this.ctx.lineTo(-5, -5);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    drawScannerRipple(ship) {
        const radius = (ship.pickupRange || 0) * (ship.pickupMultiplier || 1);
        if (radius <= 0) return;

        const now = this.game.simulatedTime * 1000;
        const duration = 2000;

        [0, 0.5].forEach(offset => {
            const timeAtCurrent = now + offset * duration;
            const t = (timeAtCurrent % duration) / duration;

            if (this.game.state === 'finishing') {
                // インパクトの瞬間（1.2秒前）の時刻を推定
                const elapsed = (1.2 - this.game.stateTimer) * 1000;
                const timeAtImpact = (now - elapsed) + offset * duration;
                const tAtImpact = (timeAtImpact % duration) / duration;
                
                // 今のtがインパクト時より小さい = 周期が一周して「新しく発生した」パルスなので描画しない
                if (t < tAtImpact) return;
            }
            const rippleRadius = radius * t;
            // 不透明度と線幅を上げて視認性を高める
            const alpha = (1 - t) * 0.9;

            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(ship.position.x, ship.position.y, rippleRadius, 0, Math.PI * 2);
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = UI_COLORS.SCANNER_FILL;
            this.ctx.strokeStyle = UI_COLORS.SCANNER;
            this.ctx.lineWidth = 2.5;
            this.ctx.fill();
            this.ctx.stroke();
            this.ctx.restore();
        });
    }

    drawGoals(goals, boundaryRadius, arcMultiplier = 1.0) {
        const visualZoom = this.game.visualZoom || 1.0;
        let alpha = 1.0;
        if (visualZoom > 2.0) {
            alpha = Math.max(0, 1.0 - (visualZoom - 2.0) / 8.0);
        }
        if (alpha <= 0) return;

        this.ctx.save();
        this.ctx.globalAlpha *= alpha;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        // 境界線全体を暗いグレーで描画
        this.ctx.strokeStyle = UI_COLORS.BOUNDARY;
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

                // 画面上の絶対的な角度（視覚的な位置）を計算
                const visualAngle = goal.angle + (this.game ? this.game.mapRotation : 0);
                const normalizedVisual = ((visualAngle % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
                
                // 画面の下半分（0.0〜PI）に位置しているか判定
                const isBottom = normalizedVisual > 0.0 * Math.PI && normalizedVisual < 1.0 * Math.PI;

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

                // --- Cargo Presence Indicator (Backlog 46/47) ---
                const hasCargo = this.game.bodies.some(b => 
                    !b.isCollected && b.items && b.items.some(it => it.deliveryGoalId === goal.id)
                );

                if (hasCargo) {
                    const branchChar = goal.id[0]; // 'T', 'R', or 'B'
                    const nextId = this.game.storySystem.currentPath + branchChar;
                    const isNextUnread = STORY_DATA[nextId] && !this.game.storySystem.isRead(nextId);
                    
                    // 明滅ロジック：次に解放されるストーリーが「初見（未読）」の場合に明滅。周期をゆっくりに調整。
                    let iconAlpha = 1.0;
                    if (isNextUnread) {
                        iconAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 333); 
                    }

                    const iconRadius = boundaryRadius + 85; // 拡大したサイズに合わせて微調整（75 -> 85）
                    const iconAngle = goal.angle;
                    const iconX = centerX + Math.cos(iconAngle) * iconRadius;
                    const iconY = centerY + Math.sin(iconAngle) * iconRadius;

                    this.ctx.save();
                    this.ctx.globalAlpha = iconAlpha;
                    this.ctx.translate(iconX, iconY);
                    
                    // ラベルの反転ロジック (isBottom) に同期させる
                    if (isBottom) {
                        this.ctx.rotate(iconAngle - Math.PI / 2);
                    } else {
                        this.ctx.rotate(iconAngle + Math.PI / 2);
                    }
                    
                    this.ctx.strokeStyle = goal.color;
                    this.ctx.lineWidth = 2.5;
                    this.ctx.shadowBlur = 10;
                    this.ctx.shadowColor = goal.color;
                    
                    // --- 究極の 3D カーゴアイコン（非対象 3/4 ビュー ＆ 長辺方向ガムテープ） ---
                    const WL = -15, HL = -9; // 左奥へのベクトル
                    const WR = 30,  HR = -4.5; // 右奥へのベクトル（長辺・浅い角度）
                    const V = 18;            // 垂直方向の高さ

                    this.ctx.translate(-2, 2); // 視覚的な重心バランス調整

                    // 1. 外郭シルエット
                    this.ctx.beginPath();
                    this.ctx.moveTo(WL + WR, HL + HR); // 最奥頂点
                    this.ctx.lineTo(WL, HL);           // 左奥
                    this.ctx.lineTo(WL, HL + V);       // 左下
                    this.ctx.lineTo(0, V);             // 手前下
                    this.ctx.lineTo(WR, HR + V);       // 右下
                    this.ctx.lineTo(WR, HR);           // 右奥
                    this.ctx.closePath();
                    this.ctx.stroke();

                    // 2. 内部の稜線（手前の頂点からの Y 字） 
                    // ※ P4(0,0) を基準点
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(WL, HL);           // 左稜線
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(WR, HR);           // 右稜線（長辺）
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(0, V);             // 垂直稜線
                    this.ctx.stroke();

                    // 3. 上面のガムテープ（長辺方向：左短辺の中点から、奥の短辺の中点へ）
                    this.ctx.beginPath();
                    this.ctx.moveTo(WL / 2, HL / 2);                       // 手前・左辺の中点
                    this.ctx.lineTo(WL / 2 + WR, HL / 2 + HR);             // 奥・短辺の中点
                    this.ctx.stroke();

                    this.ctx.restore();
                }
            }
            this.ctx.restore();
        });
        
        this.ctx.restore();
    }


    drawPrediction(points, zoom = 1) {
        if (points.length < 2) return;
        this.ctx.save();
        // 点滅演出を復活 (master ブランチの事実に準拠)
        const alpha = 0.4 + 0.2 * Math.sin(Date.now() / 200);
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        this.ctx.lineWidth = 1.5 / zoom;
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

        // 連なる感じで描画 (gapフレームずつの間隔)
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
            // 色を白に変更し、アルファ値を ramping させる (master 準拠)
            const alpha = (i / points.length); 
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
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



