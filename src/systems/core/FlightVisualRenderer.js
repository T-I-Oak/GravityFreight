class FlightVisualRenderer {
    render(context, transform, view, state, colors) {
        this.#drawPredictionPath(context, transform, state.predictionPath, colors);
        this.#drawRocketTrail(context, transform, state.navigationRocket, colors);
        this.#drawHeldCargo(context, transform, state.navigationRocket, colors);
        this.#drawRocket(context, transform, state.navigationRocket, colors);
        this.#drawSonar(context, transform, view, state.navigationRocket, state.sonarEnabled, colors);
    }

    #drawPredictionPath(context, transform, predictionPath = [], colors) {
        if (predictionPath.length < 2) {
            return;
        }

        const first = transform.toScreen(predictionPath[0]);

        context.save();
        context.beginPath();
        context.moveTo(first.x, first.y);
        predictionPath.slice(1).forEach(point => {
            const position = transform.toScreen(point);
            context.lineTo(position.x, position.y);
        });
        context.strokeStyle = colors.prediction;
        context.lineWidth = Math.max(1, 2 * transform.scale);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.shadowBlur = 8 * transform.scale;
        context.shadowColor = colors.prediction;
        context.stroke();
        context.restore();
    }

    #drawRocketTrail(context, transform, rocket, colors) {
        const trail = rocket?.actualTrail || [];
        if (trail.length < 2) {
            return;
        }

        const first = transform.toScreen(trail[0]);

        context.save();
        context.beginPath();
        context.moveTo(first.x, first.y);
        trail.slice(1).forEach(point => {
            const position = transform.toScreen(point);
            context.lineTo(position.x, position.y);
        });
        context.strokeStyle = colors.trail;
        context.lineWidth = Math.max(1, 2 * transform.scale);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.shadowBlur = 6 * transform.scale;
        context.shadowColor = colors.trail;
        context.stroke();
        context.restore();
    }

    #drawHeldCargo(context, transform, rocket, colors) {
        const cargo = rocket?.heldCargo || [];
        if (cargo.length === 0) {
            return;
        }

        const trail = rocket?.actualTrail || [];
        const anchorPoints = trail.length > 0 ? trail : [rocket.position];

        cargo.forEach((item, index) => {
            const trailIndex = Math.max(0, anchorPoints.length - 1 - (index + 1));
            const position = transform.toScreen(anchorPoints[trailIndex]);
            const category = this.#resolveItemCategory(item);
            const color = colors.categories[category];
            if (!color) {
                return;
            }

            context.save();
            context.beginPath();
            context.arc(position.x, position.y, Math.max(3, 4 * transform.scale), 0, Math.PI * 2);
            context.fillStyle = color;
            context.shadowBlur = 8 * transform.scale;
            context.shadowColor = color;
            context.fill();
            context.restore();
        });
    }

    #drawRocket(context, transform, rocket, colors) {
        if (!rocket?.position) {
            return;
        }

        const angle = this.#rocketAngle(rocket) + transform.rotation;
        const size = Math.max(8, 12 * transform.scale);
        const position = transform.toScreen(rocket.position);

        context.save();
        context.translate(position.x, position.y);
        context.rotate(angle);
        context.beginPath();
        context.moveTo(size, 0);
        context.lineTo(-size * 0.7, -size * 0.5);
        context.lineTo(-size * 0.45, 0);
        context.lineTo(-size * 0.7, size * 0.5);
        context.closePath();
        context.fillStyle = colors.rocket;
        context.shadowBlur = 14 * transform.scale;
        context.shadowColor = colors.rocket;
        context.fill();
        context.restore();
    }

    #drawSonar(context, transform, view, rocket, sonarEnabled, colors) {
        if (!sonarEnabled || !rocket?.position) {
            return;
        }

        const range = rocket.getCollectionRange?.() ?? 0;
        if (range <= 0) {
            return;
        }

        const position = transform.toScreen(rocket.position);
        const phase = (view.timestamp % 2000) / 2000;

        [phase, (phase + 0.5) % 1].forEach(progress => {
            const radius = transform.radius(range * progress);
            const alpha = (1 - progress) * 0.9;
            if (radius <= 0 || alpha <= 0) {
                return;
            }

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.arc(position.x, position.y, radius, 0, Math.PI * 2);
            context.strokeStyle = colors.sonar;
            context.fillStyle = colors.sonar;
            context.lineWidth = Math.max(1, 2.5 * transform.scale);
            context.shadowBlur = 10 * transform.scale;
            context.shadowColor = colors.sonar;
            context.stroke();
            context.globalAlpha = alpha * 0.15;
            context.fill();
            context.restore();
        });
    }

    #rocketAngle(rocket) {
        const velocity = rocket.velocity || { x: 0, y: 0 };
        if (Math.hypot(velocity.x, velocity.y) > 0.01) {
            return Math.atan2(velocity.y, velocity.x);
        }
        return rocket.angle || 0;
    }

    #resolveItemCategory(item) {
        if (item?.category) {
            return item.category;
        }
        if (item?.getViewData) {
            return item.getViewData().category;
        }
        return null;
    }
}

export default FlightVisualRenderer;
