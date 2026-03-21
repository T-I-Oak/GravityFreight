import { Game } from './Game.js';
import { Renderer } from './Renderer.js';

function main() {
    const canvas = document.getElementById('gameCanvas');
    const ui = {
        layer: document.getElementById('ui-layer'),
        status: document.getElementById('status'),
        message: document.getElementById('message')
    };

    const renderer = new Renderer(canvas);
    const game = new Game(canvas, ui);

    let lastTime = 0;

    function loop(timestamp) {
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        // 更新
        game.update(dt);

        // 描画
        renderer.clear();
        
        // 背景の星（簡易）
        renderer.drawStars();

        // 重力源の描画
        for (const body of game.bodies) {
            renderer.drawBody(body, '#ffcc00', '#ff8800');
        }

        // ポータルの描画
        renderer.drawPortal(game.portal);

        // 予測線の描画
        if (game.state === 'aiming') {
            const points = game.getPredictionPoints();
            renderer.drawPrediction(points);
        }

        // 自機の描画
        renderer.drawShip(game.ship);

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

window.onload = main;
