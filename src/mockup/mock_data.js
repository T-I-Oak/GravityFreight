import itemsData from '../assets/data/items.json';
import contentData from '../assets/data/content.json';
import configData from '../assets/data/config.json';

export const PARTS = itemsData;
export const ITEM_REGISTRY = Object.fromEntries(
    Object.values(itemsData).flat().map(item => [item.id, item])
);
export const STORY_DATA = contentData.stories;
export const RARITY = configData.rarity;

export const mockGameDataRepository = {
    getStoryContent(id) {
        return contentData.stories[id];
    },

    getFacilityDefinition(idOrType) {
        return configData.facilities[idOrType]
            || Object.values(configData.facilities).find(facility => facility.id === idOrType);
    }
};
