import Rocket from '../entities/Rocket.js';

class LaunchSelectionFactory {
    constructor({
        sessionState,
        buildFlowController,
        gameDataRepository,
        getCurrentSector,
        getLaunchAngle
    }) {
        this.sessionState = sessionState;
        this.buildFlowController = buildFlowController;
        this.gameDataRepository = gameDataRepository;
        this.getCurrentSector = getCurrentSector;
        this.getLaunchAngle = getLaunchAngle;
    }

    createRocketFromSelection() {
        const selection = this.buildFlowController.currentBuildSelection;
        if (!selection.rocket || !selection.launcher) {
            throw new Error('[LaunchSelectionFactory] rocket and launcher selections are required.');
        }

        const rocketItem = this.#popSelectedStack(selection.rocket, 'rocket');
        const launcher = this.#popSelectedStack(selection.launcher, 'launcher');
        const booster = selection.booster
            ? this.#popSelectedStack(selection.booster, 'booster')
            : null;
        const angle = this.getLaunchAngle();
        const rocket = new Rocket(
            rocketItem,
            launcher,
            booster,
            angle,
            this.getLaunchPosition(angle)
        );

        this.#consumeLaunchPart(launcher, !booster?.preventsLauncherWear);
        this.#consumeLaunchPart(booster, true);
        this.buildFlowController.resetFlightSelection();
        this.buildFlowController.showBuildScreen();
        return rocket;
    }

    getLaunchPosition(angle) {
        const home = this.getCurrentSector()?.bodies?.find(body => body.isHome) ?? {
            position: { x: 0, y: 0 },
            radius: 0
        };

        return {
            x: home.position.x + Math.cos(angle) * this.#getLaunchRadius(home),
            y: home.position.y + Math.sin(angle) * this.#getLaunchRadius(home)
        };
    }

    #popSelectedStack(uid, category) {
        const item = this.sessionState.inventory.popItemByUid(uid);
        if (!item) {
            throw new Error(`[LaunchSelectionFactory] selected ${category} is not available.`);
        }
        return item;
    }

    #consumeLaunchPart(item, shouldConsume) {
        if (!item) {
            return;
        }

        const maxCharges = item.maxCharges ?? 0;
        if (shouldConsume) {
            if (maxCharges === 0) {
                return;
            }
            item.consumeCharge?.(1);
        }

        if (maxCharges === 0 || (item.charges ?? 0) > 0) {
            this.sessionState.inventory.addItem(item);
        }
    }

    #getLaunchRadius(home) {
        if (!Number.isFinite(home.radius)) {
            throw new Error('[LaunchSelectionFactory] home body radius must be a finite number.');
        }

        const offset = this.gameDataRepository.getGameBalance().SHIP_START_OFFSET;
        if (!Number.isFinite(offset)) {
            throw new Error('[LaunchSelectionFactory] gameBalance.SHIP_START_OFFSET must be a finite number.');
        }

        return home.radius + offset;
    }
}

export default LaunchSelectionFactory;
