import Item from '../systems/entities/Item.js';
import Rocket from '../systems/entities/Rocket.js';
import RocketItem from '../systems/entities/RocketItem.js';
import PhysicsEngine from '../systems/logic/PhysicsEngine.js';
import TrajectoryPredictor from '../systems/logic/TrajectoryPredictor.js';
import Sector from '../systems/world/Sector.js';

const WORLD_VIEW_SCALE = 0.5;
const DEMO_CANVAS_WIDTH = 960;
const DEMO_CANVAS_HEIGHT = 720;
const DEFAULT_LAUNCH_ANGLE = 0.22;
const MAX_STEPS_PER_FRAME = 10;

function createItemSnapshot(id, repository) {
    return new Item(id, repository).createSnapshot();
}

function createDemoSector(repository) {
    return Sector.fromSnapshot({
        sectorNumber: 1,
        isAnomaly: false,
        luckyDiscountRate: 0,
        bodies: [
            {
                position: { x: 0, y: 0 },
                isRepulsion: false,
                isHome: true,
                items: []
            },
            {
                position: { x: 330, y: 95 },
                radius: 24,
                isRepulsion: false,
                isHome: false,
                items: [createItemSnapshot('coin_100', repository)]
            },
            {
                position: { x: 145, y: -285 },
                radius: 20,
                isRepulsion: true,
                isHome: false,
                items: [createItemSnapshot('cargo_safe', repository)]
            },
            {
                position: { x: -280, y: 210 },
                radius: 28,
                isRepulsion: false,
                isHome: false,
                items: [createItemSnapshot('mod_capacity', repository)]
            }
        ],
        exits: [
            { angle: 20, type: 'TRADING_POST' },
            { angle: 150, type: 'REPAIR_DOCK' },
            { angle: 285, type: 'BLACK_MARKET' }
        ]
    }, repository);
}

function createDemoRocket(repository, launchAngle = DEFAULT_LAUNCH_ANGLE) {
    const rocketItem = new RocketItem(
        new Item('hull_medium', repository),
        new Item('sensor_normal', repository),
        [
            new Item('mod_gst_emergency', repository),
            new Item('mod_gst_cushion', repository)
        ]
    );
    const launcher = new Item('pad_standard_d2', repository);
    const booster = new Item('boost_expander', repository);
    const rocket = new Rocket(rocketItem, launcher, booster, launchAngle, createLaunchPosition(repository, launchAngle));

    rocket.velocity = rocket.getInitialVelocity(0);
    return rocket;
}

function createLaunchPosition(repository, launchAngle) {
    const config = repository.getMasterConfig();
    const balance = repository.getGameBalance();
    const launchRadius = config.homeStarRadius + (balance.SHIP_START_OFFSET ?? 0);

    return {
        x: Math.cos(launchAngle) * launchRadius,
        y: Math.sin(launchAngle) * launchRadius
    };
}

export function createDevNavigationDemo(repository, options = {}) {
    if (!repository) {
        throw new Error('[navigation_demo] repository is required.');
    }

    const launchAngle = options.launchAngle ?? DEFAULT_LAUNCH_ANGLE;
    const sector = createDemoSector(repository);
    const rocket = createDemoRocket(repository, launchAngle);
    const physicsEngine = new PhysicsEngine(repository);
    const trajectoryPredictor = new TrajectoryPredictor(physicsEngine);
    const prediction = trajectoryPredictor.predictPath(rocket, sector);

    return {
        repository,
        sector,
        rocket,
        physicsEngine,
        trajectoryPredictor,
        prediction,
        launchAngle,
        accumulator: 0,
        isRunning: false,
        lastResult: null
    };
}

export function advanceDevNavigationDemo(demo, elapsedSeconds, maxSteps = MAX_STEPS_PER_FRAME) {
    const tickSeconds = demo.repository.getMasterConfig().simulationTickSeconds;
    let steps = 0;

    demo.accumulator += elapsedSeconds;
    while (demo.accumulator >= tickSeconds && steps < maxSteps && !demo.lastResult?.collision) {
        tickDevNavigationDemo(demo);
        demo.accumulator -= tickSeconds;
        steps += 1;
    }

    return steps;
}

export function tickDevNavigationDemo(demo) {
    if (demo.lastResult?.collision) {
        return demo.lastResult;
    }

    demo.lastResult = demo.physicsEngine.step(demo.rocket, demo.sector);
    return demo.lastResult;
}

export function resetDevNavigationDemo(demo, options = {}) {
    const next = createDevNavigationDemo(demo.repository, {
        launchAngle: options.launchAngle ?? demo.launchAngle
    });
    Object.assign(demo, next);
    return demo;
}

export function renderDevNavigationFrame(ctx, demo) {
    const canvas = ctx.canvas || {
        width: DEMO_CANVAS_WIDTH,
        height: DEMO_CANVAS_HEIGHT
    };
    const transform = createWorldTransform(canvas.width, canvas.height);

    drawBackground(ctx, canvas);
    drawBoundary(ctx, demo.sector, transform);
    drawPrediction(ctx, demo.prediction.actualTrail, transform);
    drawTrail(ctx, demo.rocket.actualTrail, transform);
    drawExits(ctx, demo.sector.exits, transform);
    drawBodies(ctx, demo.sector.bodies, transform);
    drawRocket(ctx, demo.rocket, transform);
    drawStatus(ctx, demo);
}

function createWorldTransform(width, height) {
    return {
        scale: WORLD_VIEW_SCALE,
        centerX: width / 2,
        centerY: height / 2,
        toScreen(point) {
            return {
                x: this.centerX + point.x * this.scale,
                y: this.centerY + point.y * this.scale
            };
        },
        radius(value) {
            return value * this.scale;
        }
    };
}

function drawBackground(ctx, canvas) {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 44; i += 1) {
        const x = (i * 97) % canvas.width;
        const y = (i * 173) % canvas.height;
        ctx.fillRect(x, y, 1 + (i % 2), 1 + (i % 2));
    }
}

function drawBoundary(ctx, sector, transform) {
    const center = transform.toScreen({ x: 0, y: 0 });
    const radius = transform.radius(sector.exits[0]?.radius ?? 900);

    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(99, 241, 255, 0.32)';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawExits(ctx, exits, transform) {
    const center = transform.toScreen({ x: 0, y: 0 });

    exits.forEach(exit => {
        const start = (exit.angle - exit.width / 2) * Math.PI / 180;
        const end = (exit.angle + exit.width / 2) * Math.PI / 180;

        ctx.beginPath();
        ctx.arc(center.x, center.y, transform.radius(exit.radius), start, end);
        ctx.strokeStyle = facilityColor(exit.getFacilityType());
        ctx.lineWidth = 8;
        ctx.stroke();
    });
}

function drawBodies(ctx, bodies, transform) {
    bodies.forEach(body => {
        const pos = transform.toScreen(body.position);
        const radius = transform.radius(body.radius);

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, Math.max(4, radius), 0, Math.PI * 2);
        ctx.fillStyle = body.isHome ? '#f6d36b' : (body.isRepulsion ? '#ff5c93' : '#63f1ff');
        ctx.fill();

        if (body.items.length > 0) {
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, Math.max(8, radius + 5), 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    });
}

function drawPrediction(ctx, points, transform) {
    drawPolyline(ctx, points, transform, 'rgba(255, 255, 255, 0.32)', 2);
}

function drawTrail(ctx, points, transform) {
    drawPolyline(ctx, points, transform, 'rgba(83, 255, 196, 0.95)', 3);
}

function drawPolyline(ctx, points, transform, color, width) {
    if (!points || points.length < 2) {
        return;
    }

    const first = transform.toScreen(points[0]);
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    points.slice(1).forEach(point => {
        const pos = transform.toScreen(point);
        ctx.lineTo(pos.x, pos.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

function drawRocket(ctx, rocket, transform) {
    const pos = transform.toScreen(rocket.position);
    const angle = Math.atan2(rocket.velocity.y, rocket.velocity.x);

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
}

function drawStatus(ctx, demo) {
    const collision = demo.lastResult?.collision;
    const status = collision ? `STOPPED: ${collision.type.toUpperCase()}` : (demo.isRunning ? 'RUNNING' : 'READY');

    ctx.fillStyle = 'rgba(5, 5, 16, 0.72)';
    ctx.fillRect(16, 16, 260, 76);
    ctx.fillStyle = '#63f1ff';
    ctx.font = '700 16px sans-serif';
    ctx.fillText('DEV NAVIGATION DEMO', 28, 42);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`ticks ${demo.rocket.ticks} / ${status}`, 28, 66);
}

function facilityColor(type) {
    if (type === 'TRADING_POST') return '#4bd483';
    if (type === 'REPAIR_DOCK') return '#4cb8ff';
    if (type === 'BLACK_MARKET') return '#ff4d8d';
    return '#ffffff';
}
