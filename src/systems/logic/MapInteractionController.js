import Rocket from '../entities/Rocket.js';

class MapInteractionController {
    constructor({
        gameDataRepository,
        sessionState,
        buildFlowController,
        trajectoryPredictor,
        uiController,
        worldRenderer,
        cameraController,
        getCurrentSector,
        getLaunchPosition
    }) {
        this.gameDataRepository = gameDataRepository;
        this.sessionState = sessionState;
        this.buildFlowController = buildFlowController;
        this.trajectoryPredictor = trajectoryPredictor;
        this.uiController = uiController;
        this.worldRenderer = worldRenderer;
        this.cameraController = cameraController;
        this.getCurrentSector = getCurrentSector;
        this.getLaunchPosition = getLaunchPosition;
        this.currentLaunchAngle = 0;
        this.mapInteraction = null;
        this.inputLocked = false;
    }

    handleInput(event) {
        if (!this.cameraController || !event) {
            return;
        }

        if (this.inputLocked) {
            return;
        }

        if (event.type === 'pointerdown') {
            this.#beginMapInteraction(event);
            return;
        }

        if (event.type === 'pointermove') {
            this.#continueMapInteraction(event);
            return;
        }

        if (event.type === 'pinch') {
            this.#handlePinch(event);
            return;
        }

        if (event.type === 'wheel') {
            this.#handleWheel(event);
            return;
        }

        if (event.type === 'hover') {
            this.#handleBodyHover(event);
            return;
        }

        if (event.type === 'hoverleave') {
            this.uiController.hideStarInfo?.();
            return;
        }

        if (event.type === 'pointerup') {
            this.#endMapInteraction();
        }
    }

    refreshPredictionPath() {
        const currentSector = this.getCurrentSector();
        if (!this.#canAim() || !this.trajectoryPredictor) {
            this.#clearAimVisuals();
            return;
        }

        const previewRocket = this.#createPreviewRocketFromFlightSelection();
        if (!previewRocket) {
            this.#clearAimVisuals();
            return;
        }

        previewRocket.velocity = previewRocket.getInitialVelocity(this.sessionState.returnBonus);
        const predictedRocket = this.trajectoryPredictor.predictPath(previewRocket, currentSector);
        const predictionPath = this.#createPredictionPath(previewRocket, predictedRocket.actualTrail);

        this.worldRenderer?.setAimRocket?.(previewRocket);
        this.worldRenderer?.enableSonar?.();
        this.worldRenderer?.setPredictionPath?.(predictionPath);
    }

    setInputLocked(locked) {
        this.inputLocked = Boolean(locked);
        if (this.inputLocked) {
            this.mapInteraction = null;
        }
    }

    #clearAimVisuals() {
        this.worldRenderer?.clearPredictionPath?.();
        this.worldRenderer?.clearAimRocket?.();
        this.worldRenderer?.disableSonar?.();
        this.worldRenderer?.render?.();
    }

    #beginMapInteraction(event) {
        if (event.pointerType === 'touch' && this.#showTouchInspectTarget(event)) {
            this.mapInteraction = null;
            return;
        }

        const mode = this.#resolveMapInteractionMode(event);
        this.mapInteraction = {
            mode,
            lastPoint: { ...event.point }
        };

        if (mode === 'aim') {
            this.#updateLaunchAngle(event.point);
        }
    }

    #continueMapInteraction(event) {
        if (!this.mapInteraction) {
            return;
        }

        const delta = {
            x: event.point.x - this.mapInteraction.lastPoint.x,
            y: event.point.y - this.mapInteraction.lastPoint.y
        };

        if (this.mapInteraction.mode === 'aim') {
            this.#updateLaunchAngle(event.point);
        } else if (this.mapInteraction.mode === 'rotate') {
            this.cameraController.rotate(this.mapInteraction.lastPoint, delta);
            this.#renderCameraChange();
        } else {
            this.cameraController.pan(delta);
            this.#renderCameraChange();
        }

        this.mapInteraction.lastPoint = { ...event.point };
    }

    #handlePinch(event) {
        this.mapInteraction = {
            mode: 'pinch',
            lastPoint: { ...event.point }
        };
        this.cameraController.pan(event.delta);
        if (Number.isFinite(event.scale) && Math.abs(event.scale - 1) > 0.01) {
            this.cameraController.zoom(event.scale, event.point);
        }
        this.#renderCameraChange();
    }

    #handleWheel(event) {
        const zoomSpeed = 0.001;
        const factor = 1 - event.deltaY * zoomSpeed;
        this.cameraController.zoom(Math.max(0.1, Math.min(2, factor)), event.point);
        this.#renderCameraChange();
        this.cameraController.save?.();
    }

    #handleBodyHover(event) {
        const body = this.#findHoveredBody(event.point);
        if (body?.items?.length > 0) {
            this.uiController.showStarInfo?.(body, event.displayPoint ?? event.point);
            return;
        }

        const deliveryTarget = this.#findHoveredDeliveryExit(event.point);
        if (deliveryTarget) {
            this.uiController.showDeliveryCargoInfo?.(deliveryTarget, event.displayPoint ?? event.point);
            return;
        }

        this.uiController.hideStarInfo?.();
    }

    #endMapInteraction() {
        if (this.mapInteraction?.mode !== 'aim') {
            this.cameraController?.save?.();
        }
        this.mapInteraction = null;
    }

    #showTouchInspectTarget(event) {
        const body = this.#findHoveredBody(event.point);
        if (body?.items?.length > 0) {
            this.uiController.showStarInfo?.(body, event.displayPoint ?? event.point);
            return true;
        }

        const deliveryTarget = this.#findHoveredDeliveryExit(event.point);
        if (deliveryTarget) {
            this.uiController.showDeliveryCargoInfo?.(deliveryTarget, event.displayPoint ?? event.point);
            return true;
        }

        return false;
    }

    #resolveMapInteractionMode(event) {
        if (event.shiftKey || event.ctrlKey) {
            return 'pan';
        }

        if (!this.cameraController.isInMapArea(event.point)) {
            return 'rotate';
        }

        if (this.#canAim()) {
            return 'aim';
        }

        return 'pan';
    }

    #findHoveredBody(screenPoint) {
        const currentSector = this.getCurrentSector();
        if (!currentSector || !this.cameraController) {
            return null;
        }

        const worldPoint = this.cameraController.toWorld(screenPoint);
        const hitMargin = this.gameDataRepository.getMapConstants().STAR_HIT_MARGIN;
        const zoomLevel = this.cameraController.zoomLevel || 1;

        return currentSector.bodies.findLast(body => {
            const distance = Math.hypot(
                worldPoint.x - body.position.x,
                worldPoint.y - body.position.y
            );
            return distance <= body.radius + hitMargin / zoomLevel;
        }) ?? null;
    }

    #findHoveredDeliveryExit(screenPoint) {
        const currentSector = this.getCurrentSector();
        if (!currentSector || !this.cameraController) {
            return null;
        }

        const worldPoint = this.cameraController.toWorld(screenPoint);
        const zoomLevel = this.cameraController.zoomLevel || 1;
        const hitRadius = 24 / zoomLevel;

        for (const exit of currentSector.exits ?? []) {
            const facilityType = exit.getFacilityType();
            const item = this.#findDeliveryCargoForFacility(facilityType);
            if (!item) {
                continue;
            }

            const angle = exit.angle * Math.PI / 180;
            const iconRadius = exit.radius + 85;
            const iconPosition = {
                x: Math.cos(angle) * iconRadius,
                y: Math.sin(angle) * iconRadius
            };
            const distance = Math.hypot(worldPoint.x - iconPosition.x, worldPoint.y - iconPosition.y);
            if (distance <= hitRadius) {
                return {
                    facilityType,
                    itemId: item.id
                };
            }
        }

        return null;
    }

    #findDeliveryCargoForFacility(facilityType) {
        return this.getCurrentSector().bodies
            .flatMap(body => body.items ?? [])
            .find(item => {
                const viewData = typeof item.getViewData === 'function' ? item.getViewData() : null;
                const category = item.category ?? viewData?.category;
                const deliveryGoalId = item.deliveryGoalId ?? viewData?.deliveryGoalId;
                return category === 'cargo' && deliveryGoalId === facilityType;
            }) ?? null;
    }

    #canAim() {
        const selection = this.buildFlowController.currentBuildSelection;
        return !!(selection.rocket && selection.launcher && this.getCurrentSector());
    }

    #updateLaunchAngle(screenPoint) {
        const home = this.getCurrentSector()?.bodies?.find(body => body.isHome);
        if (!home) {
            return;
        }

        const worldPoint = this.cameraController.toWorld(screenPoint);
        this.currentLaunchAngle = Math.atan2(
            worldPoint.y - home.position.y,
            worldPoint.x - home.position.x
        );
        this.refreshPredictionPath();
    }

    #renderCameraChange() {
        this.worldRenderer?.render?.();
    }

    #createPredictionPath(previewRocket, predictedTrail) {
        if (!Array.isArray(predictedTrail) || predictedTrail.length === 0) {
            throw new Error('[MapInteractionController] AIM-ready prediction must return at least one trail point.');
        }

        return [
            previewRocket.position,
            ...predictedTrail
        ];
    }

    #createPreviewRocketFromFlightSelection() {
        const selection = this.buildFlowController.currentBuildSelection;
        const rocketItem = this.#peekSelectedStack(selection.rocket, 'rocket');
        const launcher = this.#peekSelectedStack(selection.launcher, 'launcher');
        const booster = selection.booster
            ? this.#peekSelectedStack(selection.booster, 'booster')
            : null;

        if (!rocketItem || !launcher) {
            return null;
        }

        return new Rocket(
            rocketItem,
            launcher,
            booster,
            this.currentLaunchAngle,
            this.getLaunchPosition(this.currentLaunchAngle)
        );
    }

    #peekSelectedStack(uid, category) {
        if (!uid) {
            return null;
        }

        const stack = this.sessionState.inventory.getItemsByCategory(category)
            .find(candidate => candidate.uid === uid);
        return stack?.items?.at(-1) ?? null;
    }
}

export default MapInteractionController;
