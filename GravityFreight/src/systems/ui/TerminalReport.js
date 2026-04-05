/**
 * ゲーム終了時のターミナルレポート（receipt-overlay）の表示と制御を担当するクラス。
 */
export class TerminalReport {
    constructor(game, uiSystem) {
        this.game = game;
        this.uiSystem = uiSystem;
    }

    /**
     * ターミナルレポートを表示する。
     */
    show() {
        const game = this.game;
        const overlay = document.getElementById('receipt-overlay');
        const content = document.getElementById('receipt-content-area');
        if (!overlay || !content) return;

        const sectors = game.sector - 1;
        const collected = game.totalCollectedItems || 0;
        const score = Math.floor(game.score);

        // ランキングの保存
        const sectorRank = game.rankingSystem.addEntry('sector', sectors);
        const collectedRank = game.rankingSystem.addEntry('collected', collected);
        const scoreRank = game.rankingSystem.addEntry('score', score);

        // 各項目の評価計算
        const sectorInfo = this.uiSystem._getGradeInfo(sectors, 15);
        const collectedInfo = this.uiSystem._getGradeInfo(collected, 50);
        const scoreInfo = this.uiSystem._getGradeInfo(score, 100000);

        const totalScoreVal = sectorInfo.score + collectedInfo.score + scoreInfo.score;
        const totalInfo = this.uiSystem._getGradeInfo(totalScoreVal, 1, 'total');

        const now = new Date();
        const timestamp = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        const stampRotation = -10 - (Math.random() * 15);
        const stampOffsetX = (Math.random() - 0.5) * 20;
        const stampOffsetY = (Math.random() - 0.5) * 15;
        
        let sizeVariant = 'normal';
        if (totalInfo.grade === 'SS') sizeVariant = 'huge';
        if (totalInfo.grade === 'E') sizeVariant = 'mini';

        content.innerHTML = `
            <div class="receipt-header">
                <h1 class="receipt-title">TERMINAL REPORT</h1>
                <div class="receipt-subtitle">GRAVITY FREIGHT CO. - FINAL EVALUATION</div>
            </div>
            <div class="receipt-divider-dotted"></div>
            
            <div class="receipt-item-group">
                <div class="receipt-row"><span>SECTORS COMPLETED</span><span>${sectors} SCS</span></div>
                <div class="receipt-detail">${this._getRankText(sectorRank, 'SECTOR')} / GRADE <span class="grade-value receipt-grade-${sectorInfo.grade.toLowerCase()}">${sectorInfo.grade}</span></div>
            </div>

            <div class="receipt-item-group">
                <div class="receipt-row"><span>TOTAL COLLECTED</span><span>${collected} PCS</span></div>
                <div class="receipt-detail">${this._getRankText(collectedRank, 'COLLECTION')} / GRADE <span class="grade-value receipt-grade-${collectedInfo.grade.toLowerCase()}">${collectedInfo.grade}</span></div>
            </div>

            <div class="receipt-divider-solid"></div>
            <div class="receipt-row total"><span>FINAL SCORE</span><span>${score.toLocaleString()} PTS</span></div>
            <div class="receipt-detail">${this._getRankText(scoreRank, 'SCORE')} / GRADE <span class="grade-value receipt-grade-${scoreInfo.grade.toLowerCase()}">${scoreInfo.grade}</span></div>

            <div class="receipt-stamp-zone">
                <div class="receipt-official-seal stamp-${totalInfo.grade.toLowerCase()} ${sizeVariant}" 
                     id="report-stamp"
                     style="--stamp-rot: ${stampRotation}deg; --stamp-x: ${stampOffsetX}px; --stamp-y: ${stampOffsetY}px;">
                    <div class="receipt-stamp-left-half">
                        <div class="receipt-stamp-text-line small">OPERATOR AUTH.</div>
                        <div class="receipt-stamp-text-line medium">CONTRACT VERIFIED</div>
                        <div class="receipt-stamp-text-line large">GRADE</div>
                    </div>
                    <div class="receipt-stamp-right-half">
                        ${totalInfo.grade}
                    </div>
                </div>
            </div>

            <div class="barcode-container"></div>
            <div class="receipt-footer">
                <div class="auth-status">OFFICIAL PERFORMANCE LOG GRANTED</div>
                <div class="timestamp">${timestamp}</div>
            </div>
            <button class="receipt-btn" id="receipt-exit-btn">END CONTRACT</button>
        `;

        overlay.classList.remove('hidden');
        
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.classList.add('active');
                setTimeout(() => {
                    const stamp = document.getElementById('report-stamp');
                    if (stamp) stamp.classList.add('active');
                }, 800);
            });
        });

        const exitBtn = document.getElementById('receipt-exit-btn');
        if (exitBtn) {
            exitBtn.onclick = () => {
                overlay.classList.remove('active');
                const resultOverlay = document.getElementById('result-overlay');
                if (resultOverlay) resultOverlay.classList.add('hidden');

                setTimeout(() => {
                    overlay.classList.add('hidden');
                    this.game.fullReset();
                }, 800);
            };
        }
    }

    _getRankText(rankInfo, label) {
        if (!rankInfo || !rankInfo.rank) return `${label} OUT OF TOP 20`;
        const isTop = rankInfo.rank <= 3;
        const suffix = ['st', 'nd', 'rd'][(rankInfo.rank - 1) % 10] || 'th';
        const realSuffix = (rankInfo.rank >= 11 && rankInfo.rank <= 13) ? 'th' : suffix;
        const topClass = isTop ? 'top-rank' : '';
        return `<span class="${topClass}">${label} RANKING <span class="rank-value">${rankInfo.rank}${realSuffix}</span></span>`;
    }
}
