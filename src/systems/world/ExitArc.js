function normalizeDegrees(angle) {
    return ((angle % 360) + 360) % 360;
}

function shortestAngleDistance(a, b) {
    const diff = Math.abs(normalizeDegrees(a) - normalizeDegrees(b));
    return Math.min(diff, 360 - diff);
}

function positionAngleDegrees(position) {
    return normalizeDegrees(Math.atan2(position.y, position.x) * 180 / Math.PI);
}

class ExitArc {
    constructor(params = {}, gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[ExitArc] gameDataRepository is required.');
        }

        const config = gameDataRepository.getMasterConfig();
        const width = config.arcFacilityWidths[params.type];
        if (width === undefined) {
            throw new Error(`[ExitArc] Unknown facility type: ${params.type}`);
        }

        this.angle = normalizeDegrees(params.angle ?? 0);
        this.type = params.type;
        this.width = width;
        this.radius = config.boundaryRadius;
    }

    checkEntrance(targetPos) {
        const distance = Math.hypot(targetPos.x, targetPos.y);
        if (distance < this.radius) {
            return false;
        }

        return shortestAngleDistance(positionAngleDegrees(targetPos), this.angle) <= this.width / 2;
    }

    getFacilityType() {
        return this.type;
    }

    createSnapshot() {
        return {
            angle: this.angle,
            type: this.type
        };
    }

    static fromSnapshot(snapshot, gameDataRepository) {
        if (!snapshot || !gameDataRepository) {
            throw new Error('[ExitArc] snapshot and gameDataRepository are required.');
        }

        return new ExitArc({
            angle: snapshot.angle,
            type: snapshot.type
        }, gameDataRepository);
    }
}

export default ExitArc;
