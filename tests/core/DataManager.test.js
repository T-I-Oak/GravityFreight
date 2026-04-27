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
        it('should get facility by ID and have correct structure', () => {
            const facility = DataManager.getFacilityById('T');
            expect(facility).toBeDefined();
            expect(facility.id).toBe('T');
            expect(facility.type).toBe('TRADING_POST');
            expect(facility.name).toBeDefined();
            expect(facility.icon).toBeDefined();
            expect(facility.className).toBeDefined();
        });
    });

    describe('Content API (Story & Achievements)', () => {
        it('should have all 39 stories with correct steps and combinations', () => {
            const facilities = ['T', 'R', 'B'];
            
            // Step 1: 3 combinations
            facilities.forEach(f1 => {
                const story = DataManager.getStoryById(f1);
                expect(story, `Story ${f1} missing`).toBeDefined();
                expect(story.step).toBe(1);
            });

            // Step 2: 9 combinations
            facilities.forEach(f1 => {
                facilities.forEach(f2 => {
                    const id = f1 + f2;
                    const story = DataManager.getStoryById(id);
                    expect(story, `Story ${id} missing`).toBeDefined();
                    expect(story.step).toBe(2);
                });
            });

            // Step 3: 27 combinations
            facilities.forEach(f1 => {
                facilities.forEach(f2 => {
                    facilities.forEach(f3 => {
                        const id = f1 + f2 + f3;
                        const story = DataManager.getStoryById(id);
                        expect(story, `Story ${id} missing`).toBeDefined();
                        expect(story.step).toBe(3);
                    });
                });
            });
        });

        it('should get story by ID and have correct structure', () => {
            const story = DataManager.getStoryById('T');
            expect(story).toBeDefined();
            expect(story.branch).toBe('T');
            expect(story.step).toBeDefined();
            expect(story.title).toBeDefined();
            expect(story.discovery).toBeDefined();
            expect(story.content).toBeDefined();
        });

        it('should get achievement by ID and have correct structure', () => {
            const achievement = DataManager.getAchievementById('stat_total_coins');
            expect(achievement).toBeDefined();
            expect(achievement.label).toBeDefined();
            expect(Array.isArray(achievement.tiers)).toBe(true);
            expect(achievement.tiers[0].goal).toBeDefined();
            expect(achievement.tiers[0].title).toBeDefined();
        });

        it('should get all achievements', () => {
            const achievements = DataManager.getAllAchievements();
            expect(Array.isArray(achievements)).toBe(true);
            expect(achievements.length).toBeGreaterThan(0);
        });
    });

    describe('Configuration API', () => {
        it('should get game balance config with required properties', () => {
            const config = DataManager.getGameBalance();
            expect(config).toBeDefined();
            expect(config.DEFAULT_SHIP_MASS).toBeDefined();
            expect(config.DELIVERY_REWARD).toBeDefined();
            expect(config.DELIVERY_REWARD.SCORE).toBeDefined();
            expect(config.DELIVERY_REWARD.COINS).toBeDefined();
            expect(config.MAGNET_PULSE_GROWTH).toBeDefined();
        });

        it('should get map constants with required properties', () => {
            const constants = DataManager.getMapConstants();
            expect(constants).toBeDefined();
            expect(constants.BOUNDARY_RADIUS).toBeDefined();
            expect(constants.MIN_STAR_DISTANCE).toBeDefined();
            expect(constants.HOME_STAR_RADIUS).toBeDefined();
            expect(constants.HOME_STAR_MASS).toBeDefined();
        });

        it('should get rarity settings', () => {
            const settings = DataManager.getRaritySettings();
            expect(settings).toBeDefined();
            expect(settings.COMMON).toBeDefined();
            expect(settings.UNCOMMON).toBeDefined();
            expect(settings.RARE).toBeDefined();
            expect(settings.ANOMALY).toBeDefined();
        });
    });

    describe('Setup API', () => {
        it('should get initial setup data', () => {
            const setup = DataManager.getInitialSetup();
            expect(setup).toBeDefined();
            expect(Array.isArray(setup.initialInventory)).toBe(true);
            expect(typeof setup.initialCoins).toBe('number');
        });
    });
});
