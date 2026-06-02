import IDGenerator from '../../core/utils/IDGenerator.js';
import Item from './Item.js';
import RocketItem from './RocketItem.js';

const ZERO_VECTOR = { x: 0, y: 0 };

function copyVector(vector = ZERO_VECTOR) {
    return {
        x: vector.x ?? 0,
        y: vector.y ?? 0
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
            isGhost: this.isGhost
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

        return rocket;
    }

    updateState(pos, vel) {
        this.position = copyVector(pos);
        this.velocity = copyVector(vel);
        this.actualTrail.push(copyVector(this.position));
        this.ticks += 1;
        return this.ticks;
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
        const speed = this.#additive('power')
            * this.#multiplier('powerMultiplier')
            * (1.0 + powerBonus);

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

    addHeldItem(item) {
        this.heldCargo.push(item);
    }

    useAvoidanceModule() {
        return null;
    }

    getFlightResult() {
        return {
            ticks: this.ticks,
            heldCargo: this.heldCargo
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

    #getGameDataRepository() {
        return this.rocketItem?.chassis?.gameDataRepository
            || this.launcher?.gameDataRepository
            || this.booster?.gameDataRepository;
    }
}

export default Rocket;
