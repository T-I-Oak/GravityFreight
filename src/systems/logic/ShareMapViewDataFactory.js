class ShareMapViewDataFactory {
    constructor({ gameDataRepository }) {
        this.gameDataRepository = gameDataRepository;
    }

    create({ sector, rocket }) {
        if (!sector || !rocket) {
            throw new Error('[ShareMapViewDataFactory] rocket and sector are required for share map.');
        }
        this.#requireArray(sector.bodies, 'sector.bodies');
        this.#requireArray(sector.exits, 'sector.exits');
        this.#requireArray(rocket.actualTrail, 'rocket.actualTrail');

        return {
            bodies: sector.bodies.map(body => ({
                position: this.#copyVector(body.position),
                radius: this.#requireFiniteNumber(body.radius, 'shareMap body radius'),
                kind: body.isHome ? 'home' : (body.isRepulsion ? 'repulsion' : 'normal')
            })),
            exits: sector.exits.map(exit => {
                const facilityType = exit.getFacilityType?.() ?? exit.type;
                const facility = this.gameDataRepository.getFacilityDefinition(facilityType);
                return {
                    angle: this.#requireFiniteNumber(exit.angle, 'shareMap exit angle'),
                    width: this.#requireFiniteNumber(exit.width, 'shareMap exit width'),
                    radius: this.#requireFiniteNumber(exit.radius, 'shareMap exit radius'),
                    facilityType,
                    facilityName: facility.name
                };
            }),
            trail: rocket.actualTrail.map(point => this.#copyVector(point)),
            rocket: {
                position: this.#copyVector(rocket.position),
                velocity: this.#copyVector(rocket.velocity)
            }
        };
    }

    #copyVector(vector) {
        return {
            x: this.#requireFiniteNumber(vector?.x, 'shareMap vector x'),
            y: this.#requireFiniteNumber(vector?.y, 'shareMap vector y')
        };
    }

    #requireArray(value, name) {
        if (!Array.isArray(value)) {
            throw new Error(`[ShareMapViewDataFactory] ${name} must be an array.`);
        }
    }

    #requireFiniteNumber(value, name) {
        if (!Number.isFinite(value)) {
            throw new Error(`[ShareMapViewDataFactory] ${name} must be a finite number.`);
        }
        return value;
    }
}

export default ShareMapViewDataFactory;
