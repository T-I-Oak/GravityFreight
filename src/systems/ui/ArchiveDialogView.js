class ArchiveDialogView {
    constructor(options = {}) {
        this.document = options.document || document;
        this.operationBinder = options.operationBinder;
        this.replayProtectFlow = options.replayProtectFlow || null;
        if (!this.operationBinder) {
            throw new Error('[ArchiveDialogView] operationBinder is required.');
        }
        this.overlay = this.document.querySelector('#archive-screen-overlay');
        this.root = this.document.querySelector('#archive-screen-root') || this.overlay;
        this.openButton = this.document.querySelector('#archive-btn');
        this.replayStartHandler = null;
        this.replayRows = [];
        this.protectToastTimer = null;
    }

    initialize() {
        this.#hide();
    }

    setOpenHandler(handler) {
        if (this.openButton) {
            this.operationBinder(this.openButton, handler);
        }
    }

    show(viewData, components) {
        if (!this.overlay || !this.root) {
            return;
        }
        this.replayRows = [...(viewData.replays || [])];
        this.root.innerHTML = components.generateHTML(viewData);
        this.#show();
        this.#wireTabs();
        this.#wireRankingTabs();
        this.#wireReplaySelection();
        this.#wireReplayFavorite();
        this.root.querySelectorAll('.archive-close-button').forEach(button => {
            this.operationBinder(button, () => this.#hide());
        });
    }

    setReplayStartHandler(handler) {
        this.replayStartHandler = handler;
    }

    #show() {
        this.overlay.hidden = false;
        this.overlay.classList.remove('state-hidden');
    }

    #hide() {
        if (!this.overlay) {
            return;
        }
        this.overlay.hidden = true;
        this.overlay.classList.add('state-hidden');
    }

    #wireTabs() {
        const tabs = [...this.root.querySelectorAll('.TabGroup .Button[data-tab]')];
        const sections = [...this.root.querySelectorAll('#tab-analytics, #tab-replays, #tab-achievements')];
        const activate = tabId => {
            tabs.forEach(tab => {
                const active = tab.dataset.tab === tabId;
                tab.classList.toggle('state-active', active);
                tab.classList.toggle('state-inactive', !active);
            });
            sections.forEach(section => {
                const active = section.id === `tab-${tabId}`;
                section.style.display = active ? 'grid' : 'none';
            });
        };
        tabs.forEach(tab => this.operationBinder(tab, () => activate(tab.dataset.tab)));
        activate('analytics');
    }

    #wireRankingTabs() {
        const tabs = [...this.root.querySelectorAll('[data-ranking]')];
        const panels = [...this.root.querySelectorAll('[data-ranking-panel]')];
        const graphSeries = [...this.root.querySelectorAll('[data-graph-series]')];
        const activate = ranking => {
            tabs.forEach(tab => {
                const active = tab.dataset.ranking === ranking;
                tab.classList.toggle('state-active', active);
                tab.classList.toggle('state-inactive', !active);
            });
            panels.forEach(panel => {
                const active = panel.dataset.rankingPanel === ranking;
                panel.hidden = !active;
            });
            graphSeries.forEach(series => {
                series.classList.toggle('state-active', series.dataset.graphSeries === ranking);
            });
        };
        tabs.forEach(tab => this.operationBinder(tab, () => activate(tab.dataset.ranking)));
        activate('score');
    }

    #wireReplaySelection() {
        const rows = [...this.root.querySelectorAll('[data-replay-id]')];
        const playButton = this.root.querySelector('#btn-play-replay');
        let selectedReplayId = null;

        rows.forEach(row => {
            this.operationBinder(row, element => {
                selectedReplayId = element.dataset.replayId;
                rows.forEach(candidate => {
                    candidate.classList.toggle('state-active', candidate === element);
                    candidate.classList.toggle('state-inactive', candidate !== element);
                });
                playButton?.classList.remove('state-disabled');
                if (playButton) {
                    playButton.disabled = false;
                }
            });
        });

        if (playButton) {
            this.operationBinder(playButton, () => {
                if (selectedReplayId) {
                    this.replayStartHandler?.(selectedReplayId);
                }
            });
        }
    }

    #wireReplayFavorite() {
        if (!this.replayProtectFlow) {
            return;
        }

        this.root.querySelectorAll('[data-replay-favorite]').forEach(star => {
            this.operationBinder(star, (element, event) => {
                event?.stopPropagation?.();
                const favorite = !element.classList.contains('state-active');
                const result = this.replayProtectFlow.request({
                    source: 'archive',
                    recordId: element.dataset.replayFavorite,
                    favorite,
                    root: this.root,
                    dialogSelector: '.archive-favorite-dialog',
                    dialogClassName: 'archive-favorite-dialog Panel archive',
                    messageClassName: 'archive-favorite-message',
                    optionsClassName: 'archive-favorite-options',
                    cancelClassName: 'archive-favorite-cancel',
                    onComplete: completed => this.#applyProtectResult(completed)
                });
                this.#applyProtectResult(result);
            });
        });
    }

    #applyProtectResult(result) {
        if (!result || result.status === 'pending') {
            return;
        }
        if (result.status === 'limit') {
            this.#showReplayProtectToast(result.message);
            this.#syncFavoriteStars();
            return;
        }
        if (result.releasedRecordId) {
            this.#applyFavoriteState(result.releasedRecordId, false);
        }
        if (result.recordId) {
            this.#applyFavoriteState(result.recordId, result.success ? result.favorite : false);
        }
        this.#syncFavoriteStars();
    }

    #showReplayProtectToast(message) {
        if (!this.overlay) {
            return;
        }

        let element = this.overlay.querySelector('.archive-protect-toast');
        if (!element) {
            element = this.document.createElement('p');
            element.className = 'archive-protect-toast';
            this.overlay.append(element);
        }
        element.textContent = message;
        element.classList.remove('state-exit');
        element.classList.add('state-active');

        if (this.protectToastTimer) {
            clearTimeout(this.protectToastTimer);
        }
        this.protectToastTimer = setTimeout(() => {
            element.classList.add('state-exit');
            element.classList.remove('state-active');
            this.protectToastTimer = null;
        }, 2800);
    }

    #applyFavoriteState(recordId, favorite) {
        const row = this.replayRows.find(candidate => candidate.id === recordId);
        if (row) {
            row.favorite = !!favorite;
        }

        const star = [...this.root.querySelectorAll('[data-replay-favorite]')]
            .find(candidate => candidate.dataset.replayFavorite === recordId);
        star?.classList.toggle('state-active', !!favorite);
        star?.classList.toggle('state-inactive', !favorite);
    }

    #syncFavoriteStars() {
        const favoriteById = new Map(this.replayRows.map(row => [row.id, !!row.favorite]));
        this.root.querySelectorAll('[data-replay-favorite]').forEach(star => {
            const favorite = favoriteById.get(star.dataset.replayFavorite) ?? false;
            star.classList.toggle('state-active', favorite);
            star.classList.toggle('state-inactive', !favorite);
        });
    }

}

export default ArchiveDialogView;
