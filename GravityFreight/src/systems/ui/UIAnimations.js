/**
 * UI 演出用のアニメーションロジックを管理するクラス。
 */
export class UIAnimations {
    /**
     * 数値のカウントアップ演出を実行する。
     * @param {HTMLElement} element 対象の DOM 要素
     * @param {number} start 開始値
     * @param {number} end 終了値
     * @param {number} duration 期間（秒）
     * @param {Object} gameProgressCallback displayScore/displayCoins を更新するためのコールバック (オプション)
     */
    static animateValue(element, start, end, duration, gameProgressCallback = null) {
        if (!element) return;
        const startTime = performance.now();
        const durationMs = duration * 1000;

        const update = (now) => {
            const elapsed = (now - startTime) / durationMs;
            if (elapsed < 1) {
                const current = Math.floor(start + (end - start) * elapsed);
                element.textContent = current.toLocaleString();
                if (gameProgressCallback) gameProgressCallback(current);
                requestAnimationFrame(update);
            } else {
                element.textContent = end.toLocaleString();
                if (gameProgressCallback) gameProgressCallback(end);
            }
        };
        requestAnimationFrame(update);
    }
}
