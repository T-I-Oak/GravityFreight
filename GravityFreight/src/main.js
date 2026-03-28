import { Game } from './core/Game.js';

function main() {
    const canvas = document.getElementById('gameCanvas');
    const ui = {
        layer: document.getElementById('ui-layer'),
        status: document.getElementById('status'),
        message: document.getElementById('message')
    };

    const game = new Game(canvas, ui, 5); // 星を5個生成
    window.game = game;

    let lastTime = 0;

    function loop(timestamp) {
        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        // 更新
        game.update(dt);

        // 描画 (Game.js 側のオーケストレーターに一任)
        game.draw();

        requestAnimationFrame(loop);
    }

    function resize() {
        if (game) game.handleResize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', resize);
    resize(); // 初回実行

    requestAnimationFrame(loop);
}

main();
