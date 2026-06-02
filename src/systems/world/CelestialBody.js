import Item from '../entities/Item.js';

const ZERO_VECTOR = { x: 0, y: 0 };
const V1_BODY_RADIUS_OFFSET = 2;
const V1_BODY_RADIUS_SCALE = 5;

function copyVector(vector = ZERO_VECTOR) {
    return {
        x: vector.x ?? 0,
        y: vector.y ?? 0
    };
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function distancePointToSegment(point, segmentStart, segmentEnd) {
    const dx = segmentEnd.x - segmentStart.x;
    const dy = segmentEnd.y - segmentStart.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        return distance(point, segmentStart);
    }

    const t = Math.max(0, Math.min(1, (
        (point.x - segmentStart.x) * dx
        + (point.y - segmentStart.y) * dy
    ) / lengthSquared));

    return distance(point, {
        x: segmentStart.x + t * dx,
        y: segmentStart.y + t * dy
    });
}

class CelestialBody {
    constructor(params = {}, gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[CelestialBody] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.position = copyVector(params.position);
        this.isHome = !!params.isHome;
        this.isRepulsion = this.isHome ? false : !!params.isRepulsion;
        this.radius = this.#resolveRadius(params.radius);
        this.mass = this.#resolveMass(params.radius);
        this.items = [...(params.items ?? [])];
    }

    getGravityFieldVector(targetPos) {
        const dx = this.position.x - targetPos.x;
        const dy = this.position.y - targetPos.y;
        const r = Math.hypot(dx, dy);

        if (r === 0) {
            return copyVector();
        }

        const force = this.mass / (r * r);
        const polarity = this.isRepulsion ? -1 : 1;

        return {
            x: (dx / r) * force * polarity,
            y: (dy / r) * force * polarity
        };
    }

    checkCollision(currentPos, prevPos, targetRadius = 0) {
        return distancePointToSegment(this.position, prevPos, currentPos) <= this.radius + targetRadius;
    }

    checkPickup(targetPos, pickupRadius) {
        if (distance(this.position, targetPos) - this.radius > pickupRadius || this.items.length === 0) {
            return [];
        }

        const pickedItems = this.items;
        this.items = [];
        return pickedItems;
    }

    addItems(items) {
        this.items.push(...items);
    }

    createSnapshot() {
        const snapshot = {
            position: copyVector(this.position),
            isRepulsion: this.isRepulsion,
            isHome: this.isHome,
            items: this.items.map(item => item.createSnapshot())
        };

        const config = this.gameDataRepository.getMasterConfig();
        if (!this.isHome || this.radius !== config.homeStarRadius) {
            snapshot.radius = this.radius;
        }

        return snapshot;
    }

    static fromSnapshot(snapshot, gameDataRepository) {
        if (!snapshot || !gameDataRepository) {
            throw new Error('[CelestialBody] snapshot and gameDataRepository are required.');
        }

        return new CelestialBody({
            position: snapshot.position,
            radius: snapshot.radius,
            isRepulsion: snapshot.isRepulsion,
            isHome: snapshot.isHome,
            items: (snapshot.items || []).map(itemSnapshot => Item.fromSnapshot(itemSnapshot, gameDataRepository))
        }, gameDataRepository);
    }

    #resolveRadius(radius) {
        const config = this.gameDataRepository.getMasterConfig();
        if (radius !== undefined) {
            return radius;
        }

        if (this.isHome) {
            return config.homeStarRadius;
        }

        if (config.starRadiusMin !== undefined && config.starRadiusMax !== undefined) {
            return config.starRadiusMin + Math.random() * (config.starRadiusMax - config.starRadiusMin);
        }

        return config.starDefaultRadius;
    }

    #resolveMass(radius) {
        const config = this.gameDataRepository.getMasterConfig();
        if (this.isHome && radius === undefined) {
            return config.homeStarMass;
        }

        return ((this.radius - V1_BODY_RADIUS_OFFSET) * V1_BODY_RADIUS_SCALE) ** 2;
    }
}

export default CelestialBody;
