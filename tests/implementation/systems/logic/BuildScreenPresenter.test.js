import { describe, it, expect, vi } from 'vitest';
import BuildScreenPresenter from '../../../../src/systems/logic/BuildScreenPresenter.js';

function createRepository() {
    return {
        getUiText: vi.fn(key => ({
            'build.empty.rocket.text': 'NO ROCKET EQUIPPED',
            'build.empty.rocket.subtext': 'ASSEMBLE A ROCKET',
            'build.empty.launcher.text': 'NO LAUNCHER',
            'build.empty.launcher.subtext': 'ACQUIRE A LAUNCHER',
            'build.empty.booster.text': 'NO BOOSTER EQUIPPED',
            'build.empty.booster.subtext': 'BOOSTER IS OPTIONAL',
            'build.empty.chassis.text': 'NO CHASSIS',
            'build.empty.chassis.subtext': 'ACQUIRE CHASSIS',
            'build.empty.logic.text': 'NO LOGIC',
            'build.empty.logic.subtext': 'ACQUIRE LOGIC',
            'build.empty.module.text': 'NO MODULE',
            'build.empty.module.subtext': 'MODULE IS OPTIONAL',
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
        items: [item],
        getViewData: vi.fn(() => ({
            ...item.getViewData(),
            uid: `stack_${uid}`,
            count: 1
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
        expect(viewData.sections.chassis.emptyText).toBe('NO CHASSIS');
        expect(viewData.launch).toEqual({
            ready: true,
            label: 'LAUNCH ENGINE',
            subtext: 'Confirm the launch angle to fire.'
        });
    });
});
