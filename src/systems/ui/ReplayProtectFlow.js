const MAX_PROTECTED_REPLAYS = 5;

class ReplayProtectFlow {
    constructor({ document, operationBinder, gameDataRepository }) {
        this.document = document;
        this.operationBinder = operationBinder;
        this.gameDataRepository = gameDataRepository;
        this.commitHandler = null;
        this.recordsProvider = () => [];
    }

    setCommitHandler(handler) {
        this.commitHandler = handler;
    }

    setRecordsProvider(provider) {
        this.recordsProvider = provider || (() => []);
    }

    request(options) {
        if (!this.commitHandler) {
            throw new Error('[ReplayProtectFlow] commitHandler is required.');
        }

        if (options.source === 'result' && options.favorite && options.forceDialog) {
            this.#showSelectionDialog(options);
            return { status: 'pending', success: false };
        }

        if (!options.favorite || !this.#needsReplacement(options.recordId)) {
            return this.#commitTarget(options);
        }

        if (options.source !== 'result') {
            return {
                status: 'limit',
                success: false,
                recordId: options.recordId,
                favorite: false,
                message: this.#getUiText('flightResult.favoriteLimit.archiveMessage')
            };
        }

        this.#showSelectionDialog(options);
        return { status: 'pending', success: false };
    }

    #needsReplacement(recordId) {
        const records = this.#getRecords();
        const target = records.find(record => record.id === recordId);
        if (target?.favorite) {
            return false;
        }

        return records.filter(record => record.favorite).length >= MAX_PROTECTED_REPLAYS;
    }

    #showSelectionDialog(options) {
        this.#hideReplacementDialog(options);
        const root = options.root;
        const rows = this.#createSelectionRows(options);
        const modal = this.document.createElement('div');
        modal.className = 'replay-protect-modal';
        const dialog = this.document.createElement('section');
        dialog.className = options.dialogClassName;
        dialog.innerHTML = `
            <header class="replay-protect-dialog-header">
                <h2>${this.#getUiText('flightResult.favoriteLimit.title')}</h2>
            </header>
            <p class="${options.messageClassName}">${this.#getUiText('flightResult.favoriteLimit.message')}</p>
            <div class="replay-protect-count" data-replay-protect-count></div>
            <div class="${options.optionsClassName} Well ScrollArea replay-protect-table-wrap">
                <table class="ArchiveTable table-header replay-protect-table">
                    <thead>
                        <tr>
                            <th class="col-fav">${this.#getUiText('flightResult.favoriteLimit.protectColumn')}</th>
                            <th class="col-no">${this.#getUiText('flightResult.favoriteLimit.noColumn')}</th>
                            <th class="col-sector sector">${this.#getUiText('flightResult.favoriteLimit.sector')}</th>
                            <th class="col-score score">${this.#getUiText('flightResult.favoriteLimit.score')}</th>
                            <th class="col-date">${this.#getUiText('flightResult.favoriteLimit.dateColumn')}</th>
                        </tr>
                    </thead>
                </table>
                <div class="archive-table-scroll-area">
                    <table class="ArchiveTable table-body replay-protect-table">
                        <tbody>
                            ${rows.map(row => this.#createSelectionRowHTML(row)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <footer class="replay-protect-actions">
                <button class="Button button-large state-primary replay-protect-ok">
                    <span class="btn-main-label">${this.#getUiText('flightResult.favoriteLimit.ok')}</span>
                </button>
                <button class="Button button-large state-secondary ${options.cancelClassName}">
                    <span class="btn-main-label">${this.#getUiText('flightResult.favoriteLimit.cancel')}</span>
                </button>
            </footer>
        `;
        modal.append(dialog);
        root.append(modal);
        const state = new Map(rows.map(row => [row.id, row.selected]));
        const sync = () => this.#syncSelectionDialog(dialog, state);

        dialog.querySelectorAll('[data-replay-protect-toggle]').forEach(button => {
            this.operationBinder(button, element => {
                const recordId = element.dataset.replayProtectToggle;
                const selected = state.get(recordId) ?? false;
                const selectedCount = this.#countSelected(state);
                if (!selected && selectedCount >= MAX_PROTECTED_REPLAYS) {
                    return;
                }
                state.set(recordId, !selected);
                sync();
            });
        });
        this.operationBinder(dialog.querySelector('.replay-protect-ok'), () => {
            if (this.#countSelected(state) > MAX_PROTECTED_REPLAYS) {
                return;
            }
            const result = this.#commitSelection(options, rows, state);
            this.#hideReplacementDialog(options);
            options.onComplete?.(result);
        });
        this.operationBinder(dialog.querySelector(`.${options.cancelClassName}`), () => {
            this.#hideReplacementDialog(options);
            options.onComplete?.({
                status: 'canceled',
                success: false,
                recordId: options.recordId,
                favorite: false
            });
        });
        sync();
    }

    #hideReplacementDialog(options) {
        const dialog = options.root.querySelector(options.dialogSelector);
        const modal = dialog?.closest('.replay-protect-modal');
        (modal || dialog)?.remove();
    }

    #commitTarget(options) {
        const record = this.commitHandler({
            source: options.source,
            recordId: options.recordId,
            favorite: options.favorite,
            replaceRecordId: options.replaceRecordId
        });
        return {
            status: 'updated',
            success: true,
            recordId: record?.id ?? options.recordId,
            favorite: record?.favorite ?? options.favorite,
            record
        };
    }

    #getRecords() {
        return this.recordsProvider() || [];
    }

    #createSelectionRows(options) {
        const current = {
            id: options.recordId,
            displayNo: this.#getUiText('flightResult.favoriteLimit.currentRecord'),
            score: options.currentRecord?.score ?? options.currentRecord?.totalScore ?? 0,
            reachedSector: options.currentRecord?.reachedSector ?? '-',
            createdAt: options.currentRecord?.createdAt ?? null,
            isNew: !!options.currentRecord?.isNew,
            favorite: true,
            current: true
        };
        const records = this.#getRecords()
            .filter(record => record.id !== options.recordId)
            .sort((a, b) => this.#compareRecords(a, b))
            .map((record, index) => ({
                ...record,
                displayNo: String(index + 1).padStart(2, '0')
            }))
            .map(record => ({
                ...record,
                current: false
            }));

        return [current, ...records]
            .sort((a, b) => this.#compareRecords(a, b))
            .map(record => ({
                ...record,
                selected: !!record.favorite
            }));
    }

    #createSelectionRowHTML(row) {
        const view = this.#createRecordView(row);
        const currentClass = row.current ? ' state-current' : '';
        const selectedClass = row.selected ? ' state-active' : ' state-inactive';
        const newClass = row.isNew ? ' state-new' : '';
        const newBadge = row.isNew ? '<span class="Badge state-new">NEW</span>' : '';

        return `
            <tr class="replay-protect-row${currentClass}${selectedClass}${newClass}" data-replay-protect-row="${this.#escapeHtml(row.id)}">
                <td class="col-fav">
                    <button class="favorite-star state-clickable${selectedClass}" data-replay-protect-toggle="${this.#escapeHtml(row.id)}">★</button>
                </td>
                <td class="col-no">${this.#escapeHtml(row.displayNo ?? '-')}</td>
                <td class="col-sector sector">${this.#escapeHtml(view.sectorValue)}</td>
                <td class="col-score score">${this.#escapeHtml(view.scoreValue)}</td>
                <td class="col-date">
                    <span class="date-cell">
                        <span class="date-label">${this.#escapeHtml(view.dateLabel)}</span>
                        ${newBadge}
                    </span>
                </td>
            </tr>
        `;
    }

    #syncSelectionDialog(dialog, state) {
        const selectedCount = this.#countSelected(state);
        const isValid = selectedCount <= MAX_PROTECTED_REPLAYS;
        const count = dialog.querySelector('[data-replay-protect-count]');
        if (count) {
            count.textContent = this.#formatText(
                this.#getUiText('flightResult.favoriteLimit.count'),
                { count: selectedCount, max: MAX_PROTECTED_REPLAYS }
            );
            count.classList.toggle('state-invalid', !isValid);
        }
        dialog.querySelectorAll('[data-replay-protect-row]').forEach(row => {
            const selected = state.get(row.dataset.replayProtectRow) ?? false;
            row.classList.toggle('state-active', selected);
            row.classList.toggle('state-inactive', !selected);
            row.querySelector('.favorite-star')?.classList.toggle('state-active', selected);
            row.querySelector('.favorite-star')?.classList.toggle('state-inactive', !selected);
        });
        const ok = dialog.querySelector('.replay-protect-ok');
        if (ok) {
            ok.disabled = !isValid;
            ok.classList.toggle('state-disabled', !isValid);
        }
    }

    #commitSelection(options, rows, state) {
        const releasedRecordIds = [];
        const recordsById = new Map(rows.map(row => [row.id, row]));

        rows.forEach(row => {
            if (row.id === options.recordId) {
                return;
            }
            if (row.favorite && !state.get(row.id)) {
                releasedRecordIds.push(row.id);
                this.commitHandler({
                    ...options,
                    source: 'record',
                    recordId: row.id,
                    favorite: false
                });
            }
        });

        const targetSelected = state.get(options.recordId) ?? false;
        const targetRecord = recordsById.get(options.recordId);
        const record = this.commitHandler({
            source: options.source,
            recordId: options.recordId,
            favorite: targetSelected,
            replaceRecordId: releasedRecordIds[0] ?? null
        });

        return {
            status: 'updated',
            success: true,
            recordId: record?.id ?? options.recordId,
            favorite: record?.favorite ?? targetSelected,
            record: record ?? targetRecord,
            releasedRecordId: releasedRecordIds[0],
            releasedRecordIds
        };
    }

    #createRecordView(record) {
        const score = record.score ?? record.totalScore ?? 0;
        const sector = record.reachedSector ?? '-';
        const date = this.#formatDate(record.createdAt);

        return {
            sectorValue: this.#formatNumber(sector),
            scoreValue: this.#formatNumber(score),
            dateLabel: date
        };
    }

    #compareRecords(a, b) {
        const scoreDifference = (b.score ?? b.totalScore ?? 0) - (a.score ?? a.totalScore ?? 0);
        if (scoreDifference !== 0) {
            return scoreDifference;
        }

        return this.#toTimestamp(b.createdAt) - this.#toTimestamp(a.createdAt);
    }

    #toTimestamp(value) {
        if (!value) {
            return Number.MAX_SAFE_INTEGER;
        }
        const timestamp = Date.parse(value);
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }

    #getUiText(key) {
        return this.gameDataRepository?.getUiText?.(key) || key;
    }

    #formatNumber(value) {
        if (value === '-' || value === null || value === undefined) {
            return '-';
        }
        return new Intl.NumberFormat('en-US').format(value ?? 0);
    }

    #formatDate(value) {
        if (!value) {
            return this.#getUiText('flightResult.favoriteLimit.currentDate');
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        const pad = number => String(number).padStart(2, '0');
        return [
            date.getFullYear(),
            pad(date.getMonth() + 1),
            pad(date.getDate())
        ].join('.') + ` ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    #countSelected(state) {
        return [...state.values()].filter(Boolean).length;
    }

    #formatText(template, values) {
        return Object.entries(values).reduce(
            (text, [key, value]) => text.replaceAll(`{${key}}`, value),
            template
        );
    }

    #escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
}

export default ReplayProtectFlow;
