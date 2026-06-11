const BUILD_SECTIONS = {
    rocket: 'rocket',
    launcher: 'launcher',
    booster: 'booster',
    chassis: 'chassis',
    logic: 'logic',
    module: 'module'
};

class BuildScreenPresenter {
    constructor(gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[BuildScreenPresenter] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
    }

    createViewData(sessionState, selection = {}) {
        return {
            sections: Object.fromEntries(Object.keys(BUILD_SECTIONS).map(category => [
                category,
                this.#createSection(sessionState, category, selection)
            ])),
            assembly: this.#createAssemblyState(selection),
            launch: this.#createLaunchState(selection)
        };
    }

    #createSection(sessionState, category, selection) {
        const section = {
            entries: [...sessionState.inventory.getItemsByCategory(category)]
                .sort((a, b) => this.#compareStacksForDisplay(a, b))
                .map(stack => this.#createEntry(category, stack, selection)),
            emptyText: this.#getText(`build.empty.${category}.text`),
            emptySubtext: this.#getText(`build.empty.${category}.subtext`)
        };

        if (category === 'rocket' && section.entries.length === 0) {
            section.emptyAction = 'open-assembly';
            section.emptyNotable = true;
        }

        return section;
    }

    #createEntry(category, stack, selection) {
        const selectedCount = this.#getSelectedCount(category, stack, selection);

        return {
            uid: stack.uid,
            item: stack.representative,
            itemViewData: stack.getViewData(),
            selected: selectedCount > 0,
            selectedCount,
            disabled: this.#isDisabled(category, stack.representative)
        };
    }

    #compareStacksForDisplay(a, b) {
        return this.#getStackSortKey(a).localeCompare(this.#getStackSortKey(b));
    }

    #getStackSortKey(stack) {
        return stack?.representative?.uid ?? stack?.uid ?? '';
    }

    #getSelectedCount(category, stack, selection) {
        if (category === 'module') {
            return selection.module?.[stack.uid] ?? 0;
        }

        return selection[category] === stack.uid ? 1 : 0;
    }

    #isDisabled(category, item) {
        return category === 'launcher'
            && item.maxCharges > 0
            && item.charges <= 0;
    }

    #createLaunchState(selection) {
        const ready = !!(selection.rocket && selection.launcher);

        return {
            ready,
            label: this.#getText('build.launch.label'),
            subtext: this.#getText(ready
                ? 'build.launch.readySubtext'
                : 'build.launch.waitingSubtext')
        };
    }

    #createAssemblyState(selection) {
        const ready = !!(selection.chassis && selection.logic);

        return {
            ready,
            label: this.#getText('build.assemble.label'),
            subtext: this.#getText(ready
                ? 'build.assemble.readySubtext'
                : 'build.assemble.waitingSubtext')
        };
    }

    #getText(path) {
        return this.gameDataRepository.getUiText(path);
    }
}

export default BuildScreenPresenter;
