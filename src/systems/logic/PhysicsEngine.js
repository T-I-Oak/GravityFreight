const GRAVITY_G = 4000;
const SINGULARITY_DISTANCE_SQUARED = 100;

function copyVector(vector = {}) {
    return {
        x: vector.x ?? 0,
        y: vector.y ?? 0
    };
}

function addVectors(a, b) {
    return {
        x: a.x + b.x,
        y: a.y + b.y
    };
}

function scaleVector(vector, scale) {
    return {
        x: vector.x * scale,
        y: vector.y * scale
    };
}

function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

class PhysicsEngine {
    constructor(gameDataRepository) {
        if (!gameDataRepository) {
            throw new Error('[PhysicsEngine] gameDataRepository is required.');
        }

        this.gameDataRepository = gameDataRepository;
    }

    step(rocket, sector) {
        const oldPos = copyVector(rocket.position);
        const oldVel = copyVector(rocket.velocity);
        const acceleration = this.#calculateAcceleration(rocket, sector);
        const dt = this.#getTickSeconds();
        const newVel = addVectors(oldVel, scaleVector(acceleration, dt));
        const newPos = addVectors(oldPos, scaleVector(newVel, dt));
        const detection = this.#detectCollision(rocket, sector, oldPos, newPos);

        if (detection.avoidance?.destroyedTarget) {
            sector.bodies = sector.bodies.filter(body => body !== detection.avoidance.destroyedTarget);
        }

        const ticks = rocket.updateState(newPos, newVel);

        if (!detection.collision) {
            this.#collectItems(rocket, sector);
        }

        return {
            ticks,
            collision: detection.collision,
            avoidance: detection.avoidance
        };
    }

    #calculateAcceleration(rocket, sector) {
        const gravityField = sector.bodies.reduce((total, body) => {
            if (distanceSquared(body.position, rocket.position) < SINGULARITY_DISTANCE_SQUARED) {
                return total;
            }

            return addVectors(total, body.getGravityFieldVector(rocket.position));
        }, { x: 0, y: 0 });

        const config = this.gameDataRepository.getMasterConfig();
        const balance = this.gameDataRepository.getGameBalance();
        const referenceMass = balance.DEFAULT_SHIP_MASS ?? 10;
        const rocketMass = this.#getRocketMass(rocket, referenceMass);
        const sectorScale = 1 + (sector.sectorNumber - 1) * (balance.GRAVITY_SCALING_FACTOR ?? 0.02);
        const accelerationScale = GRAVITY_G * (referenceMass / rocketMass) * sectorScale;

        if (config.simulationTickSeconds === undefined) {
            throw new Error('[PhysicsEngine] simulationTickSeconds is required.');
        }

        return scaleVector(gravityField, accelerationScale);
    }

    #detectCollision(rocket, sector, oldPos, newPos) {
        for (const body of sector.bodies) {
            if (body.checkCollision(newPos, oldPos, rocket.radius ?? 0)) {
                const avoidance = this.#tryAvoidance(rocket, 'body', body);
                if (avoidance) {
                    return {
                        collision: null,
                        avoidance
                    };
                }

                return {
                    collision: {
                        type: 'body',
                        target: body,
                        pos: copyVector(newPos)
                    },
                    avoidance: null
                };
            }
        }

        for (const exit of sector.exits) {
            if (exit.checkEntrance(newPos, this.#getArcMultiplier(rocket))) {
                return {
                    collision: {
                        type: 'arc',
                        target: exit,
                        pos: copyVector(newPos)
                    },
                    avoidance: null
                };
            }
        }

        if (Math.hypot(newPos.x, newPos.y) > this.gameDataRepository.getMasterConfig().boundaryRadius) {
            const avoidance = this.#tryAvoidance(rocket, 'boundary', null);
            if (avoidance) {
                return {
                    collision: null,
                    avoidance
                };
            }

            return {
                collision: {
                    type: 'boundary',
                    target: null,
                    pos: copyVector(newPos)
                },
                avoidance: null
            };
        }

        return {
            collision: null,
            avoidance: null
        };
    }

    #tryAvoidance(rocket, type, target) {
        if (typeof rocket.useAvoidanceModule !== 'function') {
            return null;
        }

        return rocket.useAvoidanceModule(type, target);
    }

    #collectItems(rocket, sector) {
        const collectionRange = rocket.getCollectionRange();
        sector.bodies.forEach(body => {
            body.checkPickup(rocket.position, collectionRange).forEach(item => {
                rocket.addHeldItem(item);
            });
        });
    }

    #getTickSeconds() {
        return this.gameDataRepository.getMasterConfig().simulationTickSeconds;
    }

    #getRocketMass(rocket, fallbackMass) {
        if (typeof rocket.rocketItem?.getMass === 'function') {
            return Math.max(rocket.rocketItem.getMass(), Number.EPSILON);
        }

        return fallbackMass;
    }

    #getArcMultiplier(rocket) {
        if (typeof rocket.getArcMultiplier === 'function') {
            return rocket.getArcMultiplier();
        }

        return 1;
    }
}

export default PhysicsEngine;
