import IDGenerator from '../../core/utils/IDGenerator.js';
import Item from './Item.js';
import RocketItem from './RocketItem.js';

const ZERO_VECTOR = { x: 0, y: 0 };

const REAL_AVOIDANCE_MODULES = {
    breaker: 'mod_star_breaker',
    cushion: 'mod_cushion',
    emergency: 'mod_emergency'
};

const GHOST_AVOIDANCE_MODULES = {
    breaker: 'mod_gst_breaker',
    cushion: 'mod_gst_cushion',
    emergency: 'mod_gst_emergency'
};

function copyVector(vector = ZERO_VECTOR) {
    return {
        x: vector.x ?? 0,
        y: vector.y ?? 0
    };
}

function vectorLength(vector) {
    return Math.hypot(vector.x, vector.y);
}

function normalizeVector(vector) {
    const length = vectorLength(vector);
    if (length === 0) {
        return copyVector();
    }

    return {
        x: vector.x / length,
        y: vector.y / length
    };
}

function dotVector(a, b) {
    return a.x * b.x + a.y * b.y;
}

function reflectVector(vector, normal) {
    const dot = dotVector(vector, normal);
    return {
        x: vector.x - 2 * dot * normal.x,
        y: vector.y - 2 * dot * normal.y
    };
}

class Rocket {
    constructor(rocketItem, launcher, booster = null, angle = 0, position = ZERO_VECTOR) {
        if (!rocketItem || !launcher) {
            throw new Error('[Rocket] rocketItem and launcher are required.');
        }

        this.uid = IDGenerator.generate('rocket');
        this.rocketItem = rocketItem;
        this.launcher = launcher;
        this.booster = booster;
        this.angle = angle;
        this.position = copyVector(position);
        this.velocity = copyVector();
        this.actualTrail = [];
        this.ticks = 0;
        this.heldCargo = [];
        this.isGhost = false;
        this.isSafeToReturn = false;
        this.gravityEffectTicksRemaining = this.#getInitialGravityEffectTicks();
        this.lastEvasionBody = null;
    }

    setGhost() {
        this.isGhost = true;
    }

    clone(gameDataRepository) {
        return Rocket.fromSnapshot(this.createSnapshot(), gameDataRepository || this.#getGameDataRepository());
    }

    createSnapshot() {
        return {
            uid: this.uid,
            rocketItem: this.rocketItem.createSnapshot(),
            launcher: this.launcher.createSnapshot(),
            booster: this.booster ? this.booster.createSnapshot() : null,
            angle: this.angle,
            position: copyVector(this.position),
            velocity: copyVector(this.velocity),
            actualTrail: this.actualTrail.map(point => copyVector(point)),
            ticks: this.ticks,
            heldCargo: this.heldCargo.map(item => item.createSnapshot()),
            isGhost: this.isGhost,
            isSafeToReturn: this.isSafeToReturn,
            gravityEffectTicksRemaining: this.gravityEffectTicksRemaining
        };
    }

    static fromSnapshot(snapshot, gameDataRepository) {
        if (!snapshot || !gameDataRepository) {
            throw new Error('[Rocket] snapshot and gameDataRepository are required.');
        }

        const rocketItem = RocketItem.fromSnapshot(snapshot.rocketItem, gameDataRepository);
        const launcher = Item.fromSnapshot(snapshot.launcher, gameDataRepository);
        const booster = snapshot.booster ? Item.fromSnapshot(snapshot.booster, gameDataRepository) : null;
        const rocket = new Rocket(rocketItem, launcher, booster, snapshot.angle, snapshot.position);

        rocket.uid = snapshot.uid;
        rocket.velocity = copyVector(snapshot.velocity);
        rocket.actualTrail = (snapshot.actualTrail || []).map(point => copyVector(point));
        rocket.ticks = snapshot.ticks ?? 0;
        rocket.heldCargo = (snapshot.heldCargo || []).map(itemSnapshot => Item.fromSnapshot(itemSnapshot, gameDataRepository));
        rocket.isGhost = !!snapshot.isGhost;
        rocket.isSafeToReturn = !!snapshot.isSafeToReturn;
        rocket.gravityEffectTicksRemaining = snapshot.gravityEffectTicksRemaining ?? rocket.gravityEffectTicksRemaining;

        return rocket;
    }

    updateState(pos, vel) {
        this.position = copyVector(pos);
        this.velocity = copyVector(vel);
        this.recordTrailPoint(this.position);
        this.ticks += 1;
        return this.ticks;
    }

    recordTrailPoint(point = this.position) {
        this.actualTrail.push(copyVector(point));
        this.#trimTrail();
    }

    setRocketItem(item) {
        this.rocketItem = item;
    }

    setLauncher(item) {
        this.launcher = item;
    }

    setBooster(item) {
        this.booster = item;
    }

    setAngle(angle) {
        this.angle = angle;
    }

    getInitialVelocity(powerBonus = 0) {
        const referenceMass = this.#getReferenceMass();
        const rocketMass = Math.max(this.rocketItem?.getMass?.() ?? referenceMass, Number.EPSILON);
        const massFactor = Math.sqrt(referenceMass / rocketMass);
        const speed = this.#additive('power')
            * this.#multiplier('powerMultiplier')
            * (1.0 + powerBonus)
            * massFactor;

        return {
            x: Math.cos(this.angle) * speed,
            y: Math.sin(this.angle) * speed
        };
    }

    getCollectionRange() {
        return this.#additive('pickupRange') * this.#multiplier('pickupMultiplier');
    }

    getArcMultiplier() {
        return this.#multiplier('arcMultiplier');
    }

    getGravityMultiplier() {
        let multiplier = this.rocketItem.getGravityMultiplier()
            * (this.launcher?.gravityMultiplier ?? 1);

        if (this.booster?.gravityMultiplier !== undefined) {
            const hasTimedEffect = Number.isFinite(this.booster.duration);
            if (!hasTimedEffect || this.gravityEffectTicksRemaining > 0) {
                multiplier *= this.booster.gravityMultiplier;
            }
        }

        return multiplier;
    }

    advanceGravityEffectTick() {
        if (this.gravityEffectTicksRemaining > 0) {
            this.gravityEffectTicksRemaining -= 1;
        }
    }

    addHeldItem(item) {
        this.heldCargo.push(item);
    }

    useAvoidanceModule(type, target) {
        if (type === 'body') {
            if (this.#canUseAvoidance('breaker')) {
                this.#consumeAvoidance('breaker');
                this.lastEvasionBody = null;
                return {
                    method: 'star_breaker',
                    destroyedTarget: target
                };
            }

            if (this.#canUseAvoidance('cushion')) {
                this.#consumeAvoidance('cushion');
                this.velocity = reflectVector(this.velocity, this.#getBodyNormal(target));
                this.lastEvasionBody = target;
                return {
                    method: 'cushion',
                    destroyedTarget: null
                };
            }
        }

        if (type === 'boundary' && this.#canUseAvoidance('emergency')) {
            this.#consumeAvoidance('emergency');
            this.velocity = reflectVector(this.velocity, this.#getBoundaryNormal());
            this.lastEvasionBody = null;
            return {
                method: 'emergency',
                destroyedTarget: null
            };
        }

        return null;
    }

    getFlightResult() {
        return {
            ticks: this.ticks,
            heldCargo: this.heldCargo,
            rocketItem: this.rocketItem
        };
    }

    getPrecision() {
        return this.#additive('precision') * this.#multiplier('precisionMultiplier');
    }

    #additive(key) {
        const rocketValue = this.#rocketStat(key);
        return rocketValue + (this.launcher?.[key] ?? 0) + (this.booster?.[key] ?? 0);
    }

    #multiplier(key) {
        const rocketValue = this.#rocketStat(key);
        return rocketValue * (this.launcher?.[key] ?? 1) * (this.booster?.[key] ?? 1);
    }

    #rocketStat(key) {
        const methodName = `get${key[0].toUpperCase()}${key.slice(1)}`;
        if (typeof this.rocketItem?.[methodName] === 'function') {
            return this.rocketItem[methodName]();
        }

        return this.rocketItem?.[key] ?? (key.endsWith('Multiplier') ? 1 : 0);
    }

    #canUseAvoidance(kind) {
        const module = this.#findAvoidanceModule(kind);
        if (!module) {
            return false;
        }

        return this.isGhost || module.charges > 0;
    }

    #consumeAvoidance(kind) {
        if (this.isGhost) {
            return;
        }

        this.#findAvoidanceModule(kind)?.consumeCharge();
    }

    #findAvoidanceModule(kind) {
        const id = this.isGhost ? GHOST_AVOIDANCE_MODULES[kind] : REAL_AVOIDANCE_MODULES[kind];
        return this.rocketItem?.modules?.find(module => module.id === id);
    }

    #getBodyNormal(target) {
        return normalizeVector({
            x: this.position.x - (target?.position?.x ?? 0),
            y: this.position.y - (target?.position?.y ?? 0)
        });
    }

    #getBoundaryNormal() {
        return normalizeVector(this.position);
    }

    #getGameDataRepository() {
        return this.rocketItem?.chassis?.gameDataRepository
            || this.launcher?.gameDataRepository
            || this.booster?.gameDataRepository;
    }

    #getReferenceMass() {
        return this.#getGameDataRepository()?.getGameBalance?.().DEFAULT_SHIP_MASS ?? 10;
    }

    #getInitialGravityEffectTicks() {
        if (!Number.isFinite(this.booster?.duration) || this.booster?.gravityMultiplier === undefined) {
            return 0;
        }

        return Math.max(0, Math.floor(this.booster.duration));
    }

    #trimTrail() {
        if (this.isGhost) {
            return;
        }

        const maxLength = this.#getGameDataRepository()?.getGameBalance?.().TRAIL_MAX_LENGTH ?? 80;
        if (this.actualTrail.length > maxLength) {
            this.actualTrail.splice(0, this.actualTrail.length - maxLength);
        }
    }
}

export default Rocket;
