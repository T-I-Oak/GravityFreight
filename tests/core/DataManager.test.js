import { describe, it, expect } from 'vitest';
import DataManager from '../../src/core/DataManager';

describe('DataManager', () => {
    describe('Items API', () => {
        it('should get an item by ID', () => {
            const item = DataManager.getItemById('hull_light');
            expect(item).toBeDefined();
            expect(item.id).toBe('hull_light');
        });

        it('should throw error for invalid item ID', () => {
            expect(() => DataManager.getItemById('invalid')).toThrow();
        });

        it('should get items by category', () => {
            const items = DataManager.getItemsByCategory('chassis');
            expect(Array.isArray(items)).toBe(true);
            expect(items.length).toBeGreaterThan(0);
        });

        it('should get all items', () => {
            const items = DataManager.getAllItems();
            expect(items.length).toBeGreaterThan(0);
        });
    });

    describe('Facilities API', () => {
        it('should get facility by ID', () => {
            const facility = DataManager.getFacilityById('T');
            expect(facility).toBeDefined();
            expect(facility.type).toBe('TRADING_POST');
        });
    });

    describe('Content API (Story & Achievements)', () => {
        it('should get story by ID', () => {
            const story = DataManager.getStoryById('T');
            expect(story).toBeDefined();
            expect(story.branch).toBe('T');
        });

        it('should get achievement by ID', () => {
            const achievement = DataManager.getAchievementById('total_coins');
            expect(achievement).toBeDefined();
            expect(achievement.label).toBeDefined();
        });

        it('should get all achievements', () => {
            const achievements = DataManager.getAllAchievements();
            expect(Array.isArray(achievements)).toBe(true);
            expect(achievements.length).toBeGreaterThan(0);
        });
    });

    describe('Configuration API', () => {
        it('should get game balance config', () => {
            const config = DataManager.getGameBalance();
            expect(config).toBeDefined();
            expect(config.DELIVERY_REWARD).toBeDefined();
        });

        it('should get map constants', () => {
            const constants = DataManager.getMapConstants();
            expect(constants).toBeDefined();
            expect(constants.BOUNDARY_RADIUS).toBeDefined();
        });

        it('should get rarity settings', () => {
            const settings = DataManager.getRaritySettings();
            expect(settings).toBeDefined();
            expect(settings.COMMON).toBeDefined();
        });
    });

    describe('Setup API', () => {
        it('should get initial setup data', () => {
            const setup = DataManager.getInitialSetup();
            expect(setup).toBeDefined();
            expect(setup.initialInventory).toBeDefined();
            expect(setup.initialCoins).toBeDefined();
        });
    });
});
