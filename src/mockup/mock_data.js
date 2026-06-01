import itemsData from '../assets/data/items.json';
import contentData from '../assets/data/content.json';
import configData from '../assets/data/config.json';
import Item from '../systems/entities/Item.js';
import RocketItem from '../systems/entities/RocketItem.js';

export const PARTS = itemsData;
export const ITEM_REGISTRY = Object.fromEntries(
    Object.values(itemsData).flat().map(item => [item.id, item])
);
export const STORY_DATA = contentData.stories;
export const RARITY = configData.rarity;

export const mockGameDataRepository = {
    getItemDefinition(id) {
        const item = Object.values(itemsData).flat().find(candidate => candidate.id === id);
        if (!item) {
            throw new Error(`[mockGameDataRepository] Item not found: ${id}`);
        }
        return item;
    },

    getStoryContent(id) {
        return contentData.stories[id];
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
