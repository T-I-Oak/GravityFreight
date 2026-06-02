import CelestialBody from './CelestialBody.js';
import ExitArc from './ExitArc.js';

const FULL_CIRCLE_DEGREES = 360;

function normalizeDegrees(angle) {
    return ((angle % FULL_CIRCLE_DEGREES) + FULL_CIRCLE_DEGREES) % FULL_CIRCLE_DEGREES;
}

function copyVector(vector) {
    return {
        x: vector.x,
        y: vector.y
    };
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function hasAnomalyItem(items) {
    return items.some(item => item.rarity === 'anomaly');
}

function shuffle(values) {
    const shuffled = [...values];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

class Sector {
    constructor(session, isAnomaly, gameDataRepository, economySystem) {
        if (!session || !gameDataRepository || !economySystem) {
            throw new Error('[Sector] session, gameDataRepository, and economySystem are required.');
        }

        this.gameDataRepository = gameDataRepository;
        this.sectorNumber = session.sectorNumber;
        this.isAnomaly = !!isAnomaly;
        this.luckyDiscountRate = 0;
        this.bodies = [];
        this.exits = [];

        this.#generateBodies(session, economySystem);
        this.#generateExits();
    }

    clone() {
        return Sector.fromSnapshot(this.createSnapshot(), this.gameDataRepository);
    }

    createSnapshot() {
        return {
            sectorNumber: this.sectorNumber,
            isAnomaly: this.isAnomaly,
            luckyDiscountRate: this.luckyDiscountRate,
            bodies: this.bodies.map(body => body.createSnapshot()),
            exits: this.exits.map(exit => exit.createSnapshot())
        };
    }

    static fromSnapshot(snapshot, gameDataRepository) {
        if (!snapshot || !gameDataRepository) {
            throw new Error('[Sector] snapshot and gameDataRepository are required.');
        }

        if (!Number.isInteger(snapshot.sectorNumber)
            || typeof snapshot.isAnomaly !== 'boolean'
            || typeof snapshot.luckyDiscountRate !== 'number'
            || !Array.isArray(snapshot.bodies)
            || !Array.isArray(snapshot.exits)
        ) {
            throw new Error('[Sector] Invalid snapshot.');
        }

        const sector = Object.create(Sector.prototype);
        sector.gameDataRepository = gameDataRepository;
        sector.sectorNumber = snapshot.sectorNumber;
        sector.isAnomaly = snapshot.isAnomaly;
        sector.luckyDiscountRate = snapshot.luckyDiscountRate;
        sector.bodies = snapshot.bodies.map(bodySnapshot => (
            CelestialBody.fromSnapshot(bodySnapshot, gameDataRepository)
        ));
        sector.exits = snapshot.exits.map(exitSnapshot => (
            ExitArc.fromSnapshot(exitSnapshot, gameDataRepository)
        ));

        return sector;
    }

    #generateBodies(session, economySystem) {
        const config = this.gameDataRepository.getMasterConfig();
        const homePosition = copyVector(config.homeStarPosition);

        this.bodies.push(new CelestialBody({
            position: homePosition,
            isHome: true
        }, this.gameDataRepository));

        const starCount = config.baseCelestialCount + session.blackMarketVisits;
        for (let i = 0; i < starCount; i += 1) {
            const position = this.#findBodyPosition();
            if (!position) {
                continue;
            }

            const itemCount = 1 + Math.floor(Math.random() * 2);
            const items = economySystem.drawLottery(session, itemCount);
            const isRepulsion = this.isAnomaly !== hasAnomalyItem(items);

            this.bodies.push(new CelestialBody({
                position,
                isRepulsion,
                isHome: false,
                items
            }, this.gameDataRepository));
        }
    }

    #findBodyPosition() {
        const config = this.gameDataRepository.getMasterConfig();

        for (let attempt = 0; attempt < config.placementAttemptLimit; attempt += 1) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.sqrt(Math.random()) * config.placementLimitRadius;
            const position = {
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            };

            if (this.#canPlaceBody(position)) {
                return position;
            }
        }

        return null;
    }

    #canPlaceBody(position) {
        const config = this.gameDataRepository.getMasterConfig();
        return this.bodies.every(body => distance(body.position, position) >= config.minBodyDistance);
    }

    #generateExits() {
        const config = this.gameDataRepository.getMasterConfig();
        const facilityTypes = shuffle(Object.keys(config.arcFacilityWidths));
        const maxWidths = facilityTypes.map(type => config.arcFacilityWidths[type] * config.arcMaxExpansion);
        const occupiedAngle = maxWidths.reduce((total, width) => total + width, 0);
        const minimumMargins = config.arcMinMargin * facilityTypes.length;
        const freeAngle = Math.max(0, FULL_CIRCLE_DEGREES - occupiedAngle - minimumMargins);
        const gaps = this.#splitFreeAngle(freeAngle);
        let currentAngle = Math.random() * FULL_CIRCLE_DEGREES;

        this.exits = facilityTypes.map((type, index) => {
            currentAngle += gaps[index] + config.arcMinMargin + maxWidths[index] / 2;
            const arc = new ExitArc({
                angle: normalizeDegrees(currentAngle),
                type
            }, this.gameDataRepository);
            currentAngle += maxWidths[index] / 2;
            return arc;
        });
    }

    #splitFreeAngle(freeAngle) {
        const cut1 = Math.random() * freeAngle;
        const cut2 = Math.random() * freeAngle;
        const cuts = [0, cut1, cut2, freeAngle].sort((a, b) => a - b);

        return [
            cuts[1] - cuts[0],
            cuts[2] - cuts[1],
            cuts[3] - cuts[2]
        ];
    }
}

export default Sector;
