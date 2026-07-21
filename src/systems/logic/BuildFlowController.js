import RocketItem from '../entities/RocketItem.js';

class BuildFlowController {
    constructor({ sessionState, uiController, buildScreenPresenter }) {
        if (!sessionState) {
            throw new Error('[BuildFlowController] sessionState is required.');
        }
        if (!uiController) {
            throw new Error('[BuildFlowController] uiController is required.');
        }
        if (!buildScreenPresenter) {
            throw new Error('[BuildFlowController] buildScreenPresenter is required.');
        }

        this.sessionState = sessionState;
        this.uiController = uiController;
        this.buildScreenPresenter = buildScreenPresenter;
        this.currentBuildSelection = {};
        this.moduleSelectionOrder = [];
    }

    handleItemSelection({ category, uid }) {
        if (category && uid) {
            this.#toggleSelection(category, uid);
        }

        return this.createViewData();
    }

    showBuildScreen() {
        const viewData = this.createViewData();
        this.uiController.showBuildScreen?.(viewData);
        return viewData;
    }

    createViewData() {
        return this.buildScreenPresenter.createViewData(
            this.sessionState,
            this.currentBuildSelection
        );
    }

    assembleRocket() {
        const selection = this.currentBuildSelection;
        if (!selection.chassis || !selection.logic) {
            throw new Error('[BuildFlowController] chassis and logic selections are required.');
        }

        const chassis = this.sessionState.inventory.popItemByUid(selection.chassis);
        const logic = this.sessionState.inventory.popItemByUid(selection.logic);
        if (!chassis || !logic) {
            throw new Error('[BuildFlowController] selected chassis or logic is not available.');
        }

        const modules = Object.entries(selection.module ?? {})
            .flatMap(([uid, count]) => Array.from({ length: count }, () => {
                const moduleItem = this.sessionState.inventory.popItemByUid(uid);
                if (!moduleItem) {
                    throw new Error(`[BuildFlowController] selected module is not available: ${uid}`);
                }
                return moduleItem;
            }));
        const rocketItem = new RocketItem(chassis, logic, modules);
        this.sessionState.inventory.addItem(rocketItem);
        this.#resetAssemblySelection();
        this.showBuildScreen();

        return rocketItem;
    }

    resetFlightSelection() {
        delete this.currentBuildSelection.rocket;
        delete this.currentBuildSelection.launcher;
        delete this.currentBuildSelection.booster;
    }

    #toggleSelection(category, uid) {
        const stack = this.#findStack(category, uid);
        if (!stack) {
            return;
        }

        const selectedCount = this.#getSelectedCount(category, uid);
        const stackLimitReached = selectedCount >= this.#getStackCount(stack);
        const categoryLimitReached = this.#getSelectedCountInCategory(category) >= this.#getCategoryLimit(category);

        if (!stackLimitReached && !categoryLimitReached) {
            this.#incrementSelection(category, uid);
        } else if (selectedCount === 0 && categoryLimitReached) {
            this.#decrementHistoryTop(category);
            this.#incrementSelection(category, uid);
        } else {
            this.#resetSelection(category, uid);
        }

        this.#trimOverflowModules();
    }

    #incrementSelection(category, uid) {
        if (category !== 'module') {
            this.currentBuildSelection[category] = uid;
            return;
        }

        const moduleSelection = this.currentBuildSelection.module ?? {};
        moduleSelection[uid] = (moduleSelection[uid] ?? 0) + 1;
        this.currentBuildSelection.module = moduleSelection;
        this.moduleSelectionOrder.push(uid);
    }

    #trimOverflowModules() {
        while (this.#getUsedModuleSlots() > this.#getTotalSlots() && this.moduleSelectionOrder.length > 0) {
            const uid = this.moduleSelectionOrder.pop();
            const moduleSelection = this.currentBuildSelection.module ?? {};
            if (!moduleSelection[uid]) {
                continue;
            }

            moduleSelection[uid] -= 1;
            if (moduleSelection[uid] <= 0) {
                delete moduleSelection[uid];
            }
        }
    }

    #resetSelection(category, uid) {
        if (category !== 'module') {
            if (this.currentBuildSelection[category] === uid) {
                delete this.currentBuildSelection[category];
            }
            return;
        }

        const moduleSelection = this.currentBuildSelection.module ?? {};
        delete moduleSelection[uid];
        this.currentBuildSelection.module = moduleSelection;
        this.moduleSelectionOrder = this.moduleSelectionOrder.filter(selectedUid => selectedUid !== uid);
    }

    #resetAssemblySelection() {
        delete this.currentBuildSelection.chassis;
        delete this.currentBuildSelection.logic;
        this.currentBuildSelection.module = {};
        this.moduleSelectionOrder = [];
    }

    #decrementHistoryTop(category) {
        if (category !== 'module') {
            delete this.currentBuildSelection[category];
            return;
        }

        while (this.moduleSelectionOrder.length > 0) {
            const uid = this.moduleSelectionOrder.pop();
            const moduleSelection = this.currentBuildSelection.module ?? {};
            if (!moduleSelection[uid]) {
                continue;
            }

            moduleSelection[uid] -= 1;
            if (moduleSelection[uid] <= 0) {
                delete moduleSelection[uid];
            }
            return;
        }
    }

    #getUsedModuleSlots() {
        return this.#getSelectedCountInCategory('module');
    }

    #getSelectedCountInCategory(category) {
        if (category === 'module') {
            return Object.values(this.currentBuildSelection.module ?? {})
                .reduce((total, count) => total + count, 0);
        }

        return this.currentBuildSelection[category] ? 1 : 0;
    }

    #getSelectedCount(category, uid) {
        if (category === 'module') {
            return this.currentBuildSelection.module?.[uid] ?? 0;
        }

        return this.currentBuildSelection[category] === uid ? 1 : 0;
    }

    #getCategoryLimit(category) {
        return category === 'module' ? this.#getTotalSlots() : 1;
    }

    #getTotalSlots() {
        const chassisSlots = this.#getSelectedStackSlots('chassis');
        const logicSlots = this.#getSelectedStackSlots('logic');
        const moduleSlots = Object.entries(this.currentBuildSelection.module ?? {})
            .reduce((total, [uid, count]) => {
                const stack = this.#findStack('module', uid);
                return total + this.#getStackSlots(stack) * count;
            }, 0);

        return chassisSlots + logicSlots + moduleSlots;
    }

    #getSelectedStackSlots(category) {
        return this.#getStackSlots(this.#findStack(category, this.currentBuildSelection[category]));
    }

    #findStack(category, uid) {
        if (!category || !uid) {
            return null;
        }

        return this.sessionState.inventory?.getItemsByCategory?.(category)
            ?.find(stack => stack.uid === uid) ?? null;
    }

    #getStackSlots(stack) {
        return stack?.representative?.slots ?? 0;
    }

    #getStackCount(stack) {
        return stack?.count ?? stack?.items?.length ?? 0;
    }
}

export default BuildFlowController;
