import itemsData from '../assets/data/items.json';
import storiesData from '../assets/data/content_stories.json';
import uiData from '../assets/data/content_ui.json';
import configData from '../assets/data/config.json';
import Item from '../systems/entities/Item.js';
import RocketItem from '../systems/entities/RocketItem.js';

export const PARTS = itemsData;
export const ITEM_REGISTRY = Object.fromEntries(
    Object.values(itemsData).flat().map(item => [item.id, item])
);
export const STORY_DATA = storiesData.stories;
export const RARITY = configData.rarity;

let mockLanguage = 'ja';

function expandLanguageResource(source) {
    if (Array.isArray(source)) {
        return source.map(item => expandLanguageResource(item));
    }

    if (source && typeof source === 'object') {
        const store = source['lang-store'];
        if (store) {
            return store[mockLanguage] ?? store.ja ?? store.en ?? '';
        }

        return Object.fromEntries(
            Object.entries(source).map(([key, value]) => [key, expandLanguageResource(value)])
        );
    }

    return source;
}

export function setMockLanguage(language) {
    mockLanguage = language;
}

export const mockGameDataRepository = {
    getItemDefinition(id) {
        const item = Object.values(itemsData).flat().find(candidate => candidate.id === id);
        if (!item) {
            throw new Error(`[mockGameDataRepository] Item not found: ${id}`);
        }
        return item;
    },

    getStoryContent(id) {
        const story = storiesData.stories[id];
        if (!story) {
            throw new Error(`[mockGameDataRepository] Story not found: ${id}`);
        }
        return expandLanguageResource(story);
    },

    getStoryIds() {
        return Object.keys(storiesData.stories);
    },

    getStoryCategoryDefinition(id) {
        const category = configData.storyCategories[id];
        if (!category) {
            throw new Error(`[mockGameDataRepository] Story category not found: ${id}`);
        }
        return expandLanguageResource(category);
    },

    getUiText(path) {
        const value = path.split('.').reduce((current, key) => current?.[key], uiData.ui);
        if (value === undefined) {
            throw new Error(`[mockGameDataRepository] UI text not found: ${path}`);
        }
        return value['lang-store']?.en ?? value;
    },

    getFacilityDefinition(idOrType) {
        return configData.facilities[idOrType]
            || Object.values(configData.facilities).find(facility => facility.id === idOrType);
    }
};

export function createMockItem(source, state = {}) {
    const id = typeof source === 'string' ? source : source.id;
    const item = new Item(id, mockGameDataRepository);

    if (state.enhancement) {
        item.enhancement = { ...state.enhancement };
    }

    Object.entries(state).forEach(([key, value]) => {
        if (key !== 'enhancement') {
            item[key] = value;
        }
    });

    return item;
}

export function createItemViewData(source, state = {}, viewState = {}) {
    return {
        ...createMockItem(source, state).getViewData(),
        ...viewState
    };
}

export function createRocketItemViewData({ chassis, logic, modules = [] }, viewState = {}) {
    const rocketItem = new RocketItem(
        createMockItem(chassis),
        createMockItem(logic),
        modules.map(module => createMockItem(module.source || module, module.state || {}))
    );

    return {
        ...rocketItem.getViewData(),
        ...viewState
    };
}
