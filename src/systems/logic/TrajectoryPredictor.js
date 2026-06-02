class TrajectoryPredictor {
    constructor(physicsEngine) {
        if (!physicsEngine) {
            throw new Error('[TrajectoryPredictor] physicsEngine is required.');
        }

        this.physicsEngine = physicsEngine;
    }

    predictPath(rocket, sector) {
        const cloneSector = sector.clone();
        const cloneRocket = rocket.clone();
        cloneRocket.setGhost();

        const maxSteps = Math.max(0, Math.floor(cloneRocket.getPrecision()));
        for (let i = 0; i < maxSteps; i += 1) {
            const result = this.physicsEngine.step(cloneRocket, cloneSector);
            if (result.collision) {
                break;
            }
        }

        return cloneRocket;
    }
}

export default TrajectoryPredictor;
