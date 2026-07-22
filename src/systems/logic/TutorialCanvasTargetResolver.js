import Rocket from '../entities/Rocket.js';

class TutorialCanvasTargetResolver {
    constructor({
        sessionState,
        buildFlowController,
        trajectoryPredictor,
        worldRenderer,
        mapInteractionController,
        getCurrentSector,
        getLaunchPosition
    }) {
        this.sessionState = sessionState;
        this.buildFlowController = buildFlowController;
        this.trajectoryPredictor = trajectoryPredictor;
        this.worldRenderer = worldRenderer;
        this.mapInteractionController = mapInteractionController;
        this.getCurrentSector = getCurrentSector;
        this.getLaunchPosition = getLaunchPosition;
    }

    calculateTargetRect(highlight) {
        const targetType = highlight?.targetType;
        if (targetType === 'aim-preview-rocket') {
            const previewRocket = this.#createPreviewRocket();
            return this.#createWorldRect(previewRocket.position, 36);
        }
        if (targetType === 'prediction-line') {
            return this.#createPredictionBoundsRect();
        }
        if (targetType === 'exit-arc') {
            const exit = this.#getFirstExit();
            const position = this.#getExitPosition(exit);
            return this.#createWorldRect(position, 96);
        }
        if (targetType === 'home-star') {
            const home = this.#getHomeBody();
            return this.#createWorldRect(home.position, home.radius * 2);
        }
        if (targetType === 'hover-star') {
            const body = this.#getHoverBody();
            return this.#createWorldRect(body.position, body.radius * 2);
        }
        throw new Error(`[TutorialCanvasTargetResolver] Unknown tutorial canvas target: ${targetType}`);
    }

    calculateFocusBounds(highlight) {
        const targetType = highlight?.targetType;
        if (targetType === 'aim-preview-rocket') {
            const previewRocket = this.#createPreviewRocket();
            return this.#createWorldFocusRect(previewRocket.position, 120);
        }
        if (targetType === 'prediction-line') {
            const previewRocket = this.#createPreviewRocket();
            previewRocket.velocity = previewRocket.getInitialVelocity(this.sessionState.returnBonus);
            const predictedRocket = this.trajectoryPredictor.predictPath(previewRocket, this.#getSector());
            if (!Array.isArray(predictedRocket.actualTrail) || predictedRocket.actualTrail.length === 0) {
                throw new Error('[TutorialCanvasTargetResolver] tutorial prediction-line requires predicted trail points.');
            }
            return this.#createWorldFocusBounds([
                previewRocket.position,
                ...predictedRocket.actualTrail
            ]);
        }
        if (targetType === 'exit-arc') {
            const exit = this.#getFirstExit();
            const position = this.#getExitPosition(exit);
            return this.#createWorldFocusRect(position, 220);
        }
        if (targetType === 'home-star') {
            const home = this.#getHomeBody();
            return this.#createWorldFocusRect(home.position, home.radius * 2);
        }
        if (targetType === 'hover-star') {
            const body = this.#getHoverBody();
            return this.#createWorldFocusRect(body.position, body.radius * 2);
        }
        throw new Error(`[TutorialCanvasTargetResolver] Unknown tutorial canvas target: ${targetType}`);
    }

    #createPredictionBoundsRect() {
        const previewRocket = this.#createPreviewRocket();
        previewRocket.velocity = previewRocket.getInitialVelocity(this.sessionState.returnBonus);
        const predictedRocket = this.trajectoryPredictor.predictPath(previewRocket, this.#getSector());
        if (!Array.isArray(predictedRocket.actualTrail) || predictedRocket.actualTrail.length === 0) {
            throw new Error('[TutorialCanvasTargetResolver] tutorial prediction-line requires predicted trail points.');
        }

        return this.#createWorldBoundsRect([
            previewRocket.position,
            ...predictedRocket.actualTrail
        ]);
    }

    #createPreviewRocket() {
        const selection = this.buildFlowController.currentBuildSelection;
        const rocketItem = this.#peekSelectedStack(selection.rocket, 'rocket');
        const launcher = this.#peekSelectedStack(selection.launcher, 'launcher');
        const booster = selection.booster
            ? this.#peekSelectedStack(selection.booster, 'booster')
            : null;
        if (!rocketItem || !launcher) {
            throw new Error('[TutorialCanvasTargetResolver] tutorial AIM target requires selected rocket and launcher.');
        }

        const angle = this.mapInteractionController.currentLaunchAngle;
        return new Rocket(
            rocketItem,
            launcher,
            booster,
            angle,
            this.getLaunchPosition(angle)
        );
    }

    #peekSelectedStack(uid, category) {
        if (!uid) {
            return null;
        }
        return this.sessionState.inventory.getItemsByCategory(category)
            .find(candidate => candidate.uid === uid)
            ?.items?.at(-1) ?? null;
    }

    #getSector() {
        const sector = this.getCurrentSector();
        if (!sector) {
            throw new Error('[TutorialCanvasTargetResolver] tutorial canvas target requires current sector.');
        }
        return sector;
    }

    #getFirstExit() {
        const exit = this.#getSector().exits?.[0];
        if (!exit) {
            throw new Error('[TutorialCanvasTargetResolver] tutorial target exit-arc requires a sector exit.');
        }
        return exit;
    }

    #getHomeBody() {
        const home = this.#getSector().bodies?.find(body => body.isHome);
        if (!home) {
            throw new Error('[TutorialCanvasTargetResolver] tutorial target home-star requires a home body.');
        }
        return home;
    }

    #getHoverBody() {
        const sector = this.#getSector();
        const body = sector.bodies?.find(candidate => !candidate.isHome) ?? sector.bodies?.[0];
        if (!body) {
            throw new Error('[TutorialCanvasTargetResolver] tutorial target hover-star requires a sector body.');
        }
        return body;
    }

    #getExitPosition(exit) {
        const angle = exit.angle * Math.PI / 180;
        return {
            x: Math.cos(angle) * exit.radius,
            y: Math.sin(angle) * exit.radius
        };
    }

    #createWorldRect(center, worldSize) {
        const half = worldSize / 2;
        const screenCenter = this.#worldToViewport(center);
        const edge = this.#worldToViewport({ x: center.x + half, y: center.y });
        const radius = Math.max(12, Math.hypot(edge.x - screenCenter.x, edge.y - screenCenter.y));
        return {
            left: screenCenter.x - radius,
            top: screenCenter.y - radius,
            width: radius * 2,
            height: radius * 2
        };
    }

    #createWorldFocusRect(center, worldSize) {
        const half = worldSize / 2;
        return {
            left: center.x - half,
            top: center.y - half,
            width: worldSize,
            height: worldSize
        };
    }

    #createWorldFocusBounds(points) {
        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        const right = Math.max(...xs);
        const bottom = Math.max(...ys);
        const minSize = 120;
        return {
            left,
            top,
            width: Math.max(minSize, right - left),
            height: Math.max(minSize, bottom - top)
        };
    }

    #createWorldBoundsRect(points) {
        const screenPoints = points.map(point => this.#worldToViewport(point));
        const xs = screenPoints.map(point => point.x);
        const ys = screenPoints.map(point => point.y);
        const left = Math.min(...xs);
        const top = Math.min(...ys);
        const right = Math.max(...xs);
        const bottom = Math.max(...ys);
        const minSize = 24;

        return {
            left,
            top,
            width: Math.max(minSize, right - left),
            height: Math.max(minSize, bottom - top)
        };
    }

    #worldToViewport(worldPoint) {
        if (typeof this.worldRenderer?.worldToViewport !== 'function') {
            throw new Error('[TutorialCanvasTargetResolver] worldRenderer.worldToViewport is required.');
        }

        return this.worldRenderer.worldToViewport(worldPoint);
    }
}

export default TutorialCanvasTargetResolver;
