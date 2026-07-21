import { describe, expect, it, vi } from 'vitest';
import BuildFlowController from '../../../../src/systems/logic/BuildFlowController.js';

function createContext() {
    const stacks = {};
    const removedItems = [];
    const addedItems = [];
    const sessionState = {
        inventory: {
            getItemsByCategory: vi.fn(category => stacks[category] ?? []),
            popItemByUid: vi.fn(uid => {
                const stack = Object.values(stacks).flat().find(candidate => candidate.uid === uid);
                if (!stack || stack.items.length === 0) {
                    return null;
                }

                const item = stack.items.pop();
                stack.count = stack.items.length;
                removedItems.push(item);
                return item;
            }),
            addItem: vi.fn(item => {
                addedItems.push(item);
            })
        }
    };
    const uiController = {
        showBuildScreen: vi.fn()
    };
    const buildScreenPresenter = {
        createViewData: vi.fn((state, selection) => ({
            state,
            selection: { ...selection }
        }))
    };

    const controller = new BuildFlowController({
        sessionState,
        uiController,
        buildScreenPresenter
    });

    return { controller, sessionState, uiController, buildScreenPresenter, stacks, removedItems, addedItems };
}

function createStack(uid, category, { slots = 0, count = 1 } = {}) {
    const gameDataRepository = {
        getItemDefinition: () => ({
            id: `${uid}_master`,
            name: uid,
            category,
            rarity: 'common',
            description: '',
            slots
        })
    };
    const items = Array.from({ length: count }, (_, index) => ({
        uid: `${uid}_item_${index}`,
        id: `${uid}_master`,
        category,
        slots,
        name: uid,
        gameDataRepository,
        enhancement: {},
        createSnapshot: vi.fn(() => ({
            uid: `${uid}_item_${index}`,
            id: `${uid}_master`,
            charges: 0,
            enhancements: {}
        })),
        calculateAppraisalValue: vi.fn(() => 10)
    }));

    return {
        uid,
        representative: items[0],
        items,
        count
    };
}

describe('BuildFlowController', () => {
    it('shows the build screen from the current selection', () => {
        const { controller, sessionState, uiController, buildScreenPresenter } = createContext();

        const viewData = controller.showBuildScreen();

        expect(buildScreenPresenter.createViewData).toHaveBeenCalledWith(sessionState, {});
        expect(uiController.showBuildScreen).toHaveBeenCalledWith(viewData);
    });

    it('creates build view data without changing the current screen', () => {
        const { controller, sessionState, uiController, buildScreenPresenter } = createContext();

        const viewData = controller.createViewData();

        expect(buildScreenPresenter.createViewData).toHaveBeenCalledWith(sessionState, {});
        expect(viewData).toEqual({ state: sessionState, selection: {} });
        expect(uiController.showBuildScreen).not.toHaveBeenCalled();
    });

    it('switches single selection categories and resets when selecting the same stack again', () => {
        const { controller, uiController, stacks } = createContext();
        stacks.launcher = [
            createStack('stack_launcher', 'launcher'),
            createStack('stack_launcher_next', 'launcher')
        ];

        let viewData = controller.handleItemSelection({ category: 'launcher', uid: 'stack_launcher' });
        expect(controller.currentBuildSelection.launcher).toBe('stack_launcher');
        expect(viewData.selection).toEqual({
            launcher: 'stack_launcher'
        });
        expect(uiController.showBuildScreen).not.toHaveBeenCalled();

        viewData = controller.handleItemSelection({ category: 'launcher', uid: 'stack_launcher_next' });
        expect(controller.currentBuildSelection.launcher).toBe('stack_launcher_next');
        expect(viewData.selection).toEqual({
            launcher: 'stack_launcher_next'
        });

        controller.handleItemSelection({ category: 'launcher', uid: 'stack_launcher_next' });
        expect(controller.currentBuildSelection.launcher).toBeUndefined();
    });

    it('adds one module per click and resets that stack when count exceeds owned quantity', () => {
        const { controller, stacks } = createContext();
        stacks.chassis = [createStack('stack_chassis', 'chassis', { slots: 3 })];
        stacks.logic = [createStack('stack_logic', 'logic', { slots: 0 })];
        stacks.module = [createStack('stack_module', 'module', { slots: 0, count: 2 })];

        controller.handleItemSelection({ category: 'chassis', uid: 'stack_chassis' });
        controller.handleItemSelection({ category: 'logic', uid: 'stack_logic' });

        controller.handleItemSelection({ category: 'module', uid: 'stack_module' });
        expect(controller.currentBuildSelection.module).toEqual({ stack_module: 1 });

        controller.handleItemSelection({ category: 'module', uid: 'stack_module' });
        expect(controller.currentBuildSelection.module).toEqual({ stack_module: 2 });

        controller.handleItemSelection({ category: 'module', uid: 'stack_module' });
        expect(controller.currentBuildSelection.module).toEqual({});
    });

    it('replaces the latest module when selecting an unselected module at slot capacity', () => {
        const { controller, stacks } = createContext();
        stacks.chassis = [createStack('stack_chassis', 'chassis', { slots: 1 })];
        stacks.logic = [createStack('stack_logic', 'logic', { slots: 0 })];
        stacks.module = [
            createStack('stack_module_a', 'module', { slots: 0, count: 1 }),
            createStack('stack_module_b', 'module', { slots: 0, count: 1 })
        ];

        controller.handleItemSelection({ category: 'chassis', uid: 'stack_chassis' });
        controller.handleItemSelection({ category: 'logic', uid: 'stack_logic' });

        controller.handleItemSelection({ category: 'module', uid: 'stack_module_a' });
        expect(controller.currentBuildSelection.module).toEqual({ stack_module_a: 1 });

        controller.handleItemSelection({ category: 'module', uid: 'stack_module_b' });
        expect(controller.currentBuildSelection.module).toEqual({ stack_module_b: 1 });
    });

    it('resets a selected module stack when selecting it at slot capacity', () => {
        const { controller, stacks } = createContext();
        stacks.chassis = [createStack('stack_chassis', 'chassis', { slots: 1 })];
        stacks.logic = [createStack('stack_logic', 'logic', { slots: 0 })];
        stacks.module = [createStack('stack_module', 'module', { slots: 0, count: 2 })];

        controller.handleItemSelection({ category: 'chassis', uid: 'stack_chassis' });
        controller.handleItemSelection({ category: 'logic', uid: 'stack_logic' });
        controller.handleItemSelection({ category: 'module', uid: 'stack_module' });
        controller.handleItemSelection({ category: 'module', uid: 'stack_module' });

        expect(controller.currentBuildSelection.module).toEqual({});
    });

    it('applies slot-providing modules immediately and removes overflow modules from the latest selection', () => {
        const { controller, stacks } = createContext();
        stacks.chassis = [
            createStack('stack_chassis_large', 'chassis', { slots: 2 }),
            createStack('stack_chassis_small', 'chassis', { slots: 1 })
        ];
        stacks.logic = [createStack('stack_logic', 'logic', { slots: 0 })];
        stacks.module = [
            createStack('stack_module_slot', 'module', { slots: 1, count: 1 }),
            createStack('stack_module_plain', 'module', { slots: 0, count: 2 })
        ];

        controller.handleItemSelection({ category: 'chassis', uid: 'stack_chassis_large' });
        controller.handleItemSelection({ category: 'logic', uid: 'stack_logic' });
        controller.handleItemSelection({ category: 'module', uid: 'stack_module_slot' });
        controller.handleItemSelection({ category: 'module', uid: 'stack_module_plain' });
        controller.handleItemSelection({ category: 'module', uid: 'stack_module_plain' });

        expect(controller.currentBuildSelection.module).toEqual({
            stack_module_slot: 1,
            stack_module_plain: 2
        });

        controller.handleItemSelection({ category: 'chassis', uid: 'stack_chassis_small' });

        expect(controller.currentBuildSelection.module).toEqual({
            stack_module_slot: 1,
            stack_module_plain: 1
        });
    });

    it('assembles a RocketItem from selected chassis, logic, and modules', () => {
        const { controller, stacks, sessionState, addedItems } = createContext();
        stacks.chassis = [createStack('stack_chassis', 'chassis', { slots: 2 })];
        stacks.logic = [createStack('stack_logic', 'logic', { slots: 0 })];
        stacks.module = [createStack('stack_module', 'module', { slots: 0, count: 2 })];

        controller.handleItemSelection({ category: 'chassis', uid: 'stack_chassis' });
        controller.handleItemSelection({ category: 'logic', uid: 'stack_logic' });
        controller.handleItemSelection({ category: 'module', uid: 'stack_module' });
        controller.handleItemSelection({ category: 'module', uid: 'stack_module' });

        const rocketItem = controller.assembleRocket();

        expect(rocketItem.category).toBe('rocket');
        expect(rocketItem.chassis.uid).toBe('stack_chassis_item_0');
        expect(rocketItem.logic.uid).toBe('stack_logic_item_0');
        expect(rocketItem.modules[0].items).toHaveLength(2);
        expect(sessionState.inventory.addItem).toHaveBeenCalledWith(rocketItem);
        expect(addedItems).toContain(rocketItem);
        expect(controller.currentBuildSelection.chassis).toBeUndefined();
        expect(controller.currentBuildSelection.logic).toBeUndefined();
        expect(controller.currentBuildSelection.module).toEqual({});
    });

    it('throws when assembly is missing required parts', () => {
        const { controller } = createContext();

        expect(() => controller.assembleRocket())
            .toThrow('[BuildFlowController] chassis and logic selections are required.');
    });
});
