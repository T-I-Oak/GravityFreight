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
            launch: this.#createLaunchState(selection)
        };
    }

    #createSection(sessionState, category, selection) {
        return {
            entries: sessionState.inventory.getItemsByCategory(category)
                .map(stack => this.#createEntry(category, stack, selection)),
            emptyText: this.#getText(`build.empty.${category}.text`),
            emptySubtext: this.#getText(`build.empty.${category}.subtext`)
        };
    }

    #createEntry(category, stack, selection) {
        return {
            uid: stack.uid,
            item: stack.representative,
            itemViewData: stack.getViewData(),
            selected: selection[category] === stack.uid,
            disabled: this.#isDisabled(category, stack.representative)
        };
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

    #getText(path) {
        return this.gameDataRepository.getUiText(path);
    }
}

export default BuildScreenPresenter;
