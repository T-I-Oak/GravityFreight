import { describe, it, expect, vi } from 'vitest';
import BuildScreenPresenter from '../../../../src/systems/logic/BuildScreenPresenter.js';

function createRepository() {
    return {
        getUiText: vi.fn(key => ({
            'build.empty.rocket.text': '待機中のロケットなし',
            'build.empty.rocket.subtext': 'ここをクリックしてロケットを建造してください',
            'build.empty.launcher.text': '発射台なし',
            'build.empty.launcher.subtext': '購入または回収してください',
            'build.empty.booster.text': 'ブースターなし',
            'build.empty.booster.subtext': '購入または回収してください',
            'build.empty.chassis.text': 'シャーシなし',
            'build.empty.chassis.subtext': '購入または回収してください',
            'build.empty.logic.text': 'ロジックなし',
            'build.empty.logic.subtext': '購入または回収してください',
            'build.empty.module.text': 'モジュールなし',
            'build.empty.module.subtext': '購入または回収してください',
            'build.assemble.label': 'ASSEMBLE ROCKET',
            'build.assemble.waitingSubtext': 'Select chassis and logic to assemble.',
            'build.assemble.readySubtext': 'Ready to assemble.',
            'build.launch.label': 'LAUNCH ENGINE',
            'build.launch.waitingSubtext': 'Select a rocket and launcher to begin launch prep.',
            'build.launch.readySubtext': 'Confirm the launch angle to fire.'
        })[key])
    };
}

function createStack(uid, category, overrides = {}) {
    const item = {
        uid,
        category,
        charges: overrides.charges,
        maxCharges: overrides.maxCharges,
        slots: overrides.slots ?? 0,
        getViewData: vi.fn(() => ({
            uid,
            id: uid,
            name: overrides.name || uid,
            category,
            stats: {}
        }))
    };

    return {
        uid: `stack_${uid}`,
        representative: item,
        items: Array.from({ length: overrides.count ?? 1 }, () => item),
        count: overrides.count ?? 1,
        getViewData: vi.fn(() => ({
            ...item.getViewData(),
            uid: `stack_${uid}`,
            count: overrides.count ?? 1
        }))
    };
}

describe('BuildScreenPresenter', () => {
    it('creates build screen view data from inventory stacks and launch selection', () => {
        const repository = createRepository();
        const launcherStack = createStack('launcher_empty', 'launcher', {
            name: 'Empty Launcher',
            charges: 0,
            maxCharges: 2
        });
        const rocketStack = createStack('rocket_basic', 'rocket', { name: 'Basic Rocket' });
        const sessionState = {
            inventory: {
                getItemsByCategory: vi.fn(category => ({
                    rocket: [rocketStack],
                    launcher: [launcherStack]
                }[category] ?? []))
            }
        };

        const viewData = new BuildScreenPresenter(repository).createViewData(sessionState, {
            rocket: rocketStack.uid,
            launcher: launcherStack.uid
        });

        expect(viewData.sections.rocket.entries[0]).toMatchObject({
            uid: rocketStack.uid,
            selected: true,
            disabled: false
        });
        expect(viewData.sections.launcher.entries[0]).toMatchObject({
            uid: launcherStack.uid,
            selected: true,
            disabled: true
        });
        expect(viewData.sections.chassis.emptyText).toBe('シャーシなし');
        expect(viewData.launch).toEqual({
            ready: true,
            label: 'LAUNCH ENGINE',
            subtext: 'Confirm the launch angle to fire.'
        });
        expect(viewData.assembly).toEqual({
            ready: false,
            label: 'ASSEMBLE ROCKET',
            subtext: 'Select chassis and logic to assemble.'
        });
    });

    it('marks module stacks selected by selected count', () => {
        const repository = createRepository();
        const moduleStack = createStack('mod_insurance', 'module', {
            name: 'Insurance',
            count: 2
        });
        const sessionState = {
            inventory: {
                getItemsByCategory: vi.fn(category => ({
                    module: [moduleStack]
                }[category] ?? []))
            }
        };

        const viewData = new BuildScreenPresenter(repository).createViewData(sessionState, {
            module: {
                [moduleStack.uid]: 2
            }
        });

        expect(viewData.sections.module.entries[0]).toMatchObject({
            uid: moduleStack.uid,
            selected: true,
            selectedCount: 2,
            disabled: false
        });
    });

    it('sorts build entries by representative item uid instead of inventory order', () => {
        const repository = createRepository();
        const laterStack = createStack('item_200', 'launcher', {
            charges: 2,
            maxCharges: 2
        });
        const earlierStack = createStack('item_100', 'launcher', {
            charges: 2,
            maxCharges: 2
        });
        const sessionState = {
            inventory: {
                getItemsByCategory: vi.fn(category => ({
                    launcher: [laterStack, earlierStack]
                }[category] ?? []))
            }
        };

        const viewData = new BuildScreenPresenter(repository).createViewData(sessionState, {});

        expect(viewData.sections.launcher.entries.map(entry => entry.uid)).toEqual([
            earlierStack.uid,
            laterStack.uid
        ]);
    });

    it('marks only empty rocket section as an assembly navigation placeholder', () => {
        const repository = createRepository();
        const sessionState = {
            inventory: {
                getItemsByCategory: vi.fn(() => [])
            }
        };

        const viewData = new BuildScreenPresenter(repository).createViewData(sessionState, {});

        expect(viewData.sections.rocket).toMatchObject({
            entries: [],
            emptyAction: 'open-assembly',
            emptyNotable: true
        });
        expect(viewData.sections.launcher.emptyAction).toBeUndefined();
        expect(viewData.sections.booster.emptyAction).toBeUndefined();
    });

    it('marks assembly ready when chassis and logic are selected', () => {
        const repository = createRepository();
        const chassisStack = createStack('hull_light', 'chassis');
        const logicStack = createStack('sensor_short', 'logic');
        const sessionState = {
            inventory: {
                getItemsByCategory: vi.fn(category => ({
                    chassis: [chassisStack],
                    logic: [logicStack]
                }[category] ?? []))
            }
        };

        const viewData = new BuildScreenPresenter(repository).createViewData(sessionState, {
            chassis: chassisStack.uid,
            logic: logicStack.uid
        });

        expect(viewData.assembly).toEqual({
            ready: true,
            label: 'ASSEMBLE ROCKET',
            subtext: 'Ready to assemble.'
        });
    });
});
