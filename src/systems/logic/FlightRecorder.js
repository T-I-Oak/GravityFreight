import IDGenerator from '../../core/utils/IDGenerator.js';
import Rocket from '../entities/Rocket.js';
import Sector from '../world/Sector.js';

const MAX_RECORDS = 20;
const VALID_RESULT_TYPES = new Set(['cleared', 'returned', 'crashed', 'lost']);

function copyData(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
}

class FlightRecorder {
    constructor(gameDataRepository, options = {}) {
        if (!gameDataRepository) {
            throw new Error('[FlightRecorder] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.idFactory = options.idFactory || (() => IDGenerator.generate('flight'));
        this.now = options.now || (() => new Date().toISOString());
        this.rocketClass = options.rocketClass || Rocket;
        this.sectorClass = options.sectorClass || Sector;
        this.records = [];
        this.pendingRecordDraft = null;
        this.pendingRecord = null;
    }

    initialize() {
        const data = this.gameDataRepository.getSavedFlightRecordIndex({
            init: () => ({ records: [] })
        }) || {};

        this.records = (data.records || []).map(record => this.#normalizeRecord(record));
        this.#assertUniqueIds(this.records);
        this.pendingRecordDraft = null;
        this.pendingRecord = null;
    }

    captureLaunchSnapshot(rocket, sector) {
        if (!rocket?.createSnapshot || !sector?.createSnapshot) {
            throw new Error('[FlightRecorder] rocket and sector snapshots are required.');
        }

        this.pendingRecordDraft = {
            rocket: copyData(rocket.createSnapshot()),
            sector: copyData(sector.createSnapshot())
        };
        this.pendingRecord = null;
    }

    recordFlightResult(result = {}) {
        if (!this.pendingRecordDraft) {
            throw new Error('[FlightRecorder] Launch snapshot has not been captured.');
        }

        const record = this.#createRecord(result);
        this.pendingRecordDraft = null;

        if (this.#shouldAutoSave(record)) {
            this.#addRecord(record);
            this.#save();
            this.pendingRecord = null;
            return copyData(record);
        }

        this.pendingRecord = record;
        return null;
    }

    createReplayContext(recordId) {
        const record = this.records.find(candidate => candidate.id === recordId);
        if (!record) {
            throw new Error(`[FlightRecorder] Record not found: ${recordId}`);
        }

        return {
            record: copyData(record),
            rocket: this.rocketClass.fromSnapshot(record.snapshots.rocket, this.gameDataRepository),
            sector: this.sectorClass.fromSnapshot(record.snapshots.sector, this.gameDataRepository)
        };
    }

    setFavorite(recordId, favorite) {
        const record = this.records.find(candidate => candidate.id === recordId);
        if (!record) {
            throw new Error(`[FlightRecorder] Record not found: ${recordId}`);
        }

        record.favorite = !!favorite;
        this.#save();
        return copyData(record);
    }

    savePendingRecordAsFavorite() {
        if (!this.pendingRecord) {
            throw new Error('[FlightRecorder] Pending record not found.');
        }
        this.pendingRecord.favorite = true;
        const record = this.pendingRecord;
        this.#addRecord(record);
        this.#save();
        this.pendingRecord = null;

        return copyData(record);
    }

    discardPendingRecord() {
        this.pendingRecord = null;
    }

    getRecords() {
        return this.#sortRecordsForDisplay(this.records).map(record => copyData(record));
    }

    getFlightRecordIndex() {
        return {
            records: this.records.map(record => copyData(record))
        };
    }

    getPendingRecord() {
        return copyData(this.pendingRecord);
    }

    #createRecord(result) {
        const resultType = result.resultType || 'lost';
        if (!VALID_RESULT_TYPES.has(resultType)) {
            throw new Error(`[FlightRecorder] Invalid resultType: ${resultType}`);
        }

        return {
            id: this.idFactory(),
            createdAt: this.now(),
            score: result.score ?? result.totalScore ?? 0,
            reachedSector: result.reachedSector ?? 0,
            gameSessionId: result.gameSessionId ?? null,
            resultType,
            destinationType: result.destinationType ?? null,
            favorite: false,
            snapshots: copyData(this.pendingRecordDraft)
        };
    }

    #shouldAutoSave(record) {
        if (this.records.length < MAX_RECORDS) {
            return true;
        }

        const removable = this.#findLowestNonFavoriteRecord();
        if (!removable) {
            return false;
        }

        return record.score >= removable.score;
    }

    #addRecord(record) {
        this.records.push(copyData(record));
        this.#pruneRecords();
    }

    #pruneRecords() {
        while (this.records.length > MAX_RECORDS) {
            const removable = this.#findLowestNonFavoriteRecord();
            if (!removable) {
                throw new Error('[FlightRecorder] No removable record available.');
            }

            this.records = this.records.filter(record => record.id !== removable.id);
        }
    }

    #findLowestNonFavoriteRecord() {
        const candidates = this.records.filter(record => !record.favorite);
        if (candidates.length === 0) {
            return null;
        }

        return candidates.reduce((lowest, record) => {
            if (record.score < lowest.score) {
                return record;
            }
            if (record.score === lowest.score && record.createdAt < lowest.createdAt) {
                return record;
            }
            return lowest;
        }, candidates[0]);
    }

    #sortRecordsForDisplay(records) {
        return [...records].sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.createdAt.localeCompare(a.createdAt);
        });
    }

    #normalizeRecord(record) {
        if (!record?.id) {
            throw new Error('[FlightRecorder] Invalid record.');
        }

        return {
            id: record.id,
            createdAt: record.createdAt,
            score: record.score ?? 0,
            reachedSector: record.reachedSector ?? 0,
            gameSessionId: record.gameSessionId ?? null,
            resultType: record.resultType,
            destinationType: record.destinationType ?? null,
            favorite: !!record.favorite,
            snapshots: copyData(record.snapshots)
        };
    }

    #assertUniqueIds(records) {
        const ids = new Set();
        for (const record of records) {
            if (ids.has(record.id)) {
                throw new Error(`[FlightRecorder] Duplicate record id: ${record.id}`);
            }
            ids.add(record.id);
        }
    }

    #save() {
        this.gameDataRepository.setSavedFlightRecordIndex(this.getFlightRecordIndex());
    }
}

export default FlightRecorder;
