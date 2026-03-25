import { Game } from './Game.js';
import { Renderer } from './Renderer.js';
import { CATEGORY_COLORS, hexToRgba } from './Data.js';

function main() {
    const canvas = document.getElementById('gameCanvas');
    const ui = {
        layer: document.getElementById('ui-layer'),
        status: document.getElementById('status'),
        message: document.getElementById('message')
    };

    const renderer = new Renderer(canvas);
    const game = new Game(canvas, ui, 5); // 星を5個生成
    window.game = game;

    const starPanel = document.getElementById('star-info-panel');
    const starList = document.getElementById('star-info-list');
    const starTitle = document.getElementById('star-info-title');

    let lastTime = 0;
    let currentHoveredStar = null;

    function loop(timestamp) {
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        // 更新
        game.update(dt);

        // 描画
        renderer.clear();

        // 背景の星（カメラ適用前に描画し、パララックスのみ摘要）
        renderer.drawStars(game.cameraOffset, timestamp);

        // カメラ適用（天体、自機、軌跡など）
        renderer.applyCamera(game.zoom, game.cameraOffset);

        // 重力源の描画
        for (const body of game.bodies) {
            renderer.drawBody(body, '#ffcc00', '#ff8800');
        }

        // ゴールの描画 (ブースター効果を考慮)
        let currentArcMultiplier = 1.0;
        if (game.state === 'flying' && game.ship) {
            currentArcMultiplier = game.ship.arcMultiplier || 1.0;
        } else if (game.state === 'aiming' && game.selection.booster) {
            currentArcMultiplier = game.selection.booster.arcMultiplier || 1.0;
        }
        renderer.drawGoals(game.goals, game.boundaryRadius, currentArcMultiplier);

        // 予測線の描画 (エイム中のみ)
        if (game.state === 'aiming') {
            const points = game.getPredictionPoints();
            renderer.drawPrediction(points);
        }


        // 軌跡の描画
        if (game.ship && game.ship.trail) {
            renderer.drawTrail(game.ship.trail);
        }

        // 自機の描画 (建造中以外)
        if ((game.state === 'aiming' || game.state === 'flying') && game.ship) {
            renderer.drawShip(game.ship);
        }




        // カメラ復元
        renderer.restoreCamera();

        // UI情報の描画（カメラ空間外）
        renderer.drawVersion(game.version);

        // --- ホバーされた星の情報パネル更新 ---
        const isHoverableStar = game.hoveredStar && (
            (!game.hoveredStar.isHome && !game.hoveredStar.isCollected) || 
            (game.hoveredStar.isHome && game.hoveredStar.items && game.hoveredStar.items.length > 0)
        ) && game.hoveredStar.items && game.hoveredStar.items.length > 0;

        if (isHoverableStar) {
            const currentItemCount = game.hoveredStar.items.length;
            if (currentHoveredStar !== game.hoveredStar || starPanel.dataset.itemCount != currentItemCount) {
                currentHoveredStar = game.hoveredStar;
                starPanel.dataset.itemCount = currentItemCount;
                
                // 内容の更新
                starTitle.textContent = 'STAR ITEMS';
                starList.innerHTML = '';
                // 同一アイテムをマージする
                const mergedItems = new Map();
                game.hoveredStar.items.forEach(item => {
                    if (!item || !item.id) return;
                    
                    if (mergedItems.has(item.id)) {
                        mergedItems.get(item.id).count++;
                    } else {
                        mergedItems.set(item.id, { ...item, count: 1 });
                    }
                });

                mergedItems.forEach(item => {
                    const cardWrapper = document.createElement('div');
                    cardWrapper.className = 'tooltip-card-wrapper';
                    cardWrapper.style.marginBottom = '4px';
                    
                    cardWrapper.innerHTML = game.generateCardHTML(item, {
                        showInventory: true
                    });
                    
                    starList.appendChild(cardWrapper);
                });
            }

            starPanel.classList.remove('hidden');

            // マウス追従
            const offset = 20;
            let px = game.mousePos.x + offset;
            let py = game.mousePos.y + offset;
            
            // 画面外にはみ出さないように調整
            const rect = starPanel.getBoundingClientRect();
            if (px + rect.width > canvas.width) px = game.mousePos.x - rect.width - offset;
            if (py + rect.height > canvas.height) py = game.mousePos.y - rect.height - offset;
            
            starPanel.style.left = px + 'px';
            starPanel.style.top = py + 'px';

        } else {
            if (currentHoveredStar !== null) {
                currentHoveredStar = null;
                starPanel.classList.add('hidden');
            }
        }

        requestAnimationFrame(loop);
    }



    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        if (game) game.handleResize(canvas.width, canvas.height);
        if (renderer) renderer.generateBgStars();
    }

    window.addEventListener('resize', resize);
    resize(); // 初回実行

    requestAnimationFrame(loop);
}

main();



