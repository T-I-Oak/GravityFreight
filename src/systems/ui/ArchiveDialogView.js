class ArchiveDialogView {
    constructor(options = {}) {
        this.document = options.document || document;
        this.operationBinder = options.operationBinder;
        if (!this.operationBinder) {
            throw new Error('[ArchiveDialogView] operationBinder is required.');
        }
        this.overlay = this.document.querySelector('#archive-screen-overlay');
        this.root = this.document.querySelector('#archive-screen-root') || this.overlay;
        this.openButton = this.document.querySelector('#archive-btn');
        this.replayStartHandler = null;
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
        this.root.innerHTML = components.generateHTML(viewData);
        this.#show();
        this.#wireTabs();
        this.#wireRankingTabs();
        this.#wireReplaySelection();
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
}

export default ArchiveDialogView;
