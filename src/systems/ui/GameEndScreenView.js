function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

const RECEIPT_SHOW_DELAY_MS = 2400;
const GRADE_SCALE = ['E', 'D', 'C', 'B', 'A', 'S', 'SS'];
const DEFAULT_GRADE_STEPS = { SINGLE: 20, TOTAL: 50 };
const GRADE_TARGETS = {
    sector: 15,
    collected: 50,
    score: 100000
};

class GameEndScreenView {
    constructor({ document, gameDataRepository, operationBinder }) {
        this.document = document;
        this.gameDataRepository = gameDataRepository;
        this.operationBinder = operationBinder;
        this.root = this.#requiredElement('#game-result-scene-container');
        this.returnHandler = null;
        this.showTimer = null;
    }

    show(gameResult = {}, gameOver = {}) {
        this.root.innerHTML = this.#createHTML(gameResult, gameOver);
        this.root.hidden = true;
        this.root.classList.add('state-hidden');
        this.root.classList.remove('state-active', 'impact');
        this.showTimer = globalThis.setTimeout(() => {
            this.root.hidden = false;
            this.root.classList.remove('state-hidden');
            void this.root.offsetWidth;
            this.root.classList.add('state-active');
            this.showTimer = null;
        }, RECEIPT_SHOW_DELAY_MS);
        this.#wireReturnButton();
        this.#startStampAnimation();
    }

    hide() {
        if (this.showTimer) {
            globalThis.clearTimeout(this.showTimer);
            this.showTimer = null;
        }
        this.root.hidden = true;
        this.root.classList.add('state-hidden');
        this.root.classList.remove('state-active', 'impact');
        this.root.innerHTML = '';
    }

    setReturnHandler(handler) {
        this.returnHandler = handler;
        this.#wireReturnButton();
    }

    #createHTML(gameResult, gameOver) {
        const evaluation = this.#createEvaluation(gameResult);
        const tier = this.#gradeToTier(evaluation.total.grade);
        const timestamp = this.#formatTimestamp(gameResult.createdAt);

        return `
            <section class="Panel receipt ScrollArea" id="receipt-content-area">
                <header class="panel-header TitleBox">
                    <h1 class="text-display text-center">${this.#text('gameEnd.title', 'TERMINAL REPORT')}</h1>
                    <p class="text-sub-display text-center">${this.#text('gameEnd.subtitle', 'GRAVITY FREIGHT CO. - FINAL EVALUATION')}</p>
                </header>

                <div class="divider dotted"></div>

                <div class="panel-body">
                    ${this.#createEvaluationSection('gameEnd.completedSectors', 'SECTORS COMPLETED', `${this.#formatNumber(gameResult.completedSectors)} SCS`, 'SECTOR', evaluation.sector)}
                    ${this.#createEvaluationSection('gameEnd.collectedItems', 'TOTAL COLLECTED', `${this.#formatNumber(gameResult.collectedItemCount)} PCS`, 'COLLECTION', evaluation.collected)}

                    <div class="divider solid"></div>

                    <section class="section hero">
                        <div class="SplitRow data-row">
                            <span class="stat-label">${this.#text('gameEnd.finalScore', 'FINAL SCORE')}</span>
                            <span class="stat-value score">${this.#formatNumber(gameResult.totalScore)} PTS</span>
                        </div>
                        ${this.#createDetailLine('SCORE', evaluation.score)}
                    </section>

                    <div class="receipt-stamp-zone">
                        <div class="receipt-official-seal tier-${tier} normal" id="report-stamp">
                            <div class="receipt-stamp-left-half">
                                <div class="receipt-stamp-text-line small">OPERATOR AUTH.</div>
                                <div class="receipt-stamp-text-line medium">CONTRACT VERIFIED</div>
                                <div class="receipt-stamp-text-line large">GRADE</div>
                            </div>
                            <div class="receipt-stamp-right-half">${evaluation.total.grade}</div>
                        </div>
                    </div>

                    <div class="barcode-container"></div>
                </div>

                <footer class="panel-footer FlexCenter">
                    <div class="auth-status">${this.#text('gameEnd.authStatus', 'OFFICIAL PERFORMANCE LOG GRANTED')}</div>
                    <div class="timestamp">${escapeHtml(timestamp)}</div>
                    <button class="Button state-primary button-large game-end-return-button" id="receipt-exit-btn">
                        <span class="btn-main-label">${this.#text('gameEnd.endContract', 'END CONTRACT')}</span>
                    </button>
                </footer>
            </section>
        `;
    }

    #createEvaluationSection(labelKey, fallback, value, rankingLabel, evaluation) {
        return `
            <section class="section">
                <div class="SplitRow data-row">
                    <span class="stat-label">${this.#text(labelKey, fallback)}</span>
                    <span class="stat-value">${escapeHtml(value)}</span>
                </div>
                ${this.#createDetailLine(rankingLabel, evaluation)}
            </section>
        `;
    }

    #createDetailLine(rankingLabel, evaluation) {
        return `
            <div class="section-subtitle">
                ${this.#createRankText(evaluation.rank, rankingLabel)} / GRADE
                <span class="grade-value receipt-grade-${evaluation.grade.toLowerCase()}">${evaluation.grade}</span>
            </div>
        `;
    }

    #wireReturnButton() {
        const button = this.root.querySelector('.game-end-return-button');
        if (!button || !this.returnHandler || button.dataset.handlerReady === 'true') {
            return;
        }

        button.dataset.handlerReady = 'true';
        this.operationBinder(button, () => this.returnHandler());
    }

    #startStampAnimation() {
        const stamp = this.root.querySelector('#report-stamp');
        if (!stamp) {
            return;
        }

        globalThis.setTimeout(() => {
            stamp.style.setProperty('--stamp-rot', '-7deg');
            stamp.style.setProperty('--stamp-x', '0px');
            stamp.style.setProperty('--stamp-y', '0px');
            stamp.classList.add('state-active');
            this.root.classList.add('impact');
        }, RECEIPT_SHOW_DELAY_MS + 1650);
    }

    #createEvaluation(gameResult) {
        const sector = this.#getGradeInfo(gameResult.completedSectors ?? 0, GRADE_TARGETS.sector);
        const collected = this.#getGradeInfo(gameResult.collectedItemCount ?? 0, GRADE_TARGETS.collected);
        const score = this.#getGradeInfo(gameResult.totalScore ?? 0, GRADE_TARGETS.score);
        const total = this.#getGradeInfo(sector.score + collected.score + score.score, 1, 'total');
        const rankings = gameResult.rankings || {};

        return {
            sector: { ...sector, rank: rankings.sectorRank },
            collected: { ...collected, rank: rankings.collectedRank },
            score: { ...score, rank: rankings.scoreRank },
            total
        };
    }

    #getGradeInfo(value, target, type = 'single') {
        const steps = this.gameDataRepository?.getGameBalance?.().GRADE_STEPS || DEFAULT_GRADE_STEPS;
        const score = type === 'single' ? Math.sqrt(Math.max(0, value) / target) * 100 : value;
        const step = type === 'single' ? steps.SINGLE : steps.TOTAL;
        const index = Math.min(GRADE_SCALE.length - 1, Math.floor(score / step));

        return {
            grade: GRADE_SCALE[index],
            score
        };
    }

    #createRankText(rank, label) {
        if (!rank) {
            return `${label} OUT OF TOP 20`;
        }

        return `${label} RANKING <span class="${rank <= 3 ? 'state-top-rank' : ''}"><span class="rank-value">${rank}${this.#ordinalSuffix(rank)}</span></span>`;
    }

    #ordinalSuffix(rank) {
        if (rank >= 11 && rank <= 13) {
            return 'th';
        }

        return ['th', 'st', 'nd', 'rd'][rank % 10] || 'th';
    }

    #gradeToTier(grade) {
        return { SS: 1, S: 2, A: 3, B: 4, C: 5, D: 6, E: 7 }[grade] ?? 7;
    }

    #formatTimestamp(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        const pad = number => String(number).padStart(2, '0');
        return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }

    #formatNumber(value) {
        return new Intl.NumberFormat('en-US').format(value ?? 0);
    }

    #text(key, fallback) {
        return this.gameDataRepository?.getUiText?.(key) || fallback;
    }

    #requiredElement(selector) {
        const element = this.document.querySelector(selector);
        if (!element) {
            throw new Error(`[GameEndScreenView] Required element not found: ${selector}`);
        }
        return element;
    }
}

export default GameEndScreenView;
