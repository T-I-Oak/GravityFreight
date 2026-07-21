import { FACILITY_LABELS, FACILITY_THEME_CLASSES } from './facilityViewConstants.js';

class FlightResultViewDataFactory {
    constructor({ gameDataRepository, sessionState, flightRecorder, storySystem }) {
        this.gameDataRepository = gameDataRepository;
        this.sessionState = sessionState;
        this.flightRecorder = flightRecorder;
        this.storySystem = storySystem;
    }

    createContext(settlement) {
        return {
            gameSessionId: this.sessionState.gameSessionId,
            resultType: settlement.status,
            score: settlement.totalScore,
            totalScore: settlement.totalScore,
            reachedSector: this.sessionState.sectorNumber,
            destinationType: settlement.destination ?? null
        };
    }

    createViewData(settlement, replayRecord, achievements, unlockedStoryId = null, shareMap) {
        const pendingRecord = this.flightRecorder.getPendingRecord();
        const storyStatus = this.storySystem.getStoryStatus();
        const storyCards = storyStatus.filter(story => story.id === unlockedStoryId);

        return {
            title: this.#getTitle(settlement),
            status: settlement.status,
            themeClass: this.#getThemeClass(settlement),
            totalScore: settlement.totalScore,
            totalCoins: settlement.totalCoins,
            actionLabel: this.#getActionLabel(settlement),
            entries: settlement.entries || [],
            itemReport: settlement.itemReport || [],
            replay: {
                id: replayRecord?.id ?? pendingRecord?.id ?? null,
                recorded: !!replayRecord,
                favorite: !!replayRecord?.favorite,
                pending: !replayRecord && !!pendingRecord,
                score: settlement.totalScore,
                reachedSector: this.sessionState.sectorNumber,
                createdAt: replayRecord?.createdAt ?? pendingRecord?.createdAt ?? null
            },
            achievements,
            storyStatus,
            storyCards,
            shareMap
        };
    }

    #getThemeClass(settlement) {
        if (settlement.destination) {
            return FACILITY_THEME_CLASSES[settlement.destination] || 'home';
        }

        return 'home';
    }

    #getActionLabel(settlement) {
        if (settlement.status === 'cleared' && settlement.destination) {
            return this.#formatText(
                this.gameDataRepository.getUiText('flightResult.actions.toFacility'),
                { facility: FACILITY_LABELS[settlement.destination] || settlement.destination }
            );
        }

        if (settlement.status === 'returned' || settlement.status === 'crashed' || settlement.status === 'lost') {
            return this.gameDataRepository.getUiText('flightResult.actions.backToBase');
        }

        return this.gameDataRepository.getUiText('flightResult.actions.continue');
    }

    #getTitle(settlement) {
        const titleKey = settlement.status
            ? `flightResult.titles.${settlement.status}`
            : 'flightResult.titles.complete';
        const title = this.gameDataRepository.getUiText(titleKey);

        return this.#formatText(title, { sector: this.sessionState.sectorNumber });
    }

    #formatText(template, values) {
        return Object.entries(values).reduce(
            (text, [key, value]) => text.replaceAll(`{${key}}`, value),
            template
        );
    }
}

export default FlightResultViewDataFactory;
