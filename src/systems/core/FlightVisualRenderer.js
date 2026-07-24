class FlightVisualRenderer {
    static VISIBLE_TRAIL_LENGTH = 80;

    render(context, transform, view, state, colors) {
        this.#drawPredictionPath(context, transform, state.predictionPath, colors);
        this.#drawRocketTrail(context, transform, state.navigationRocket, colors);
        this.#drawHeldCargo(context, transform, state.navigationRocket, colors);
        if (!state.hideRocketBody) {
            this.#drawRocket(context, transform, state.navigationRocket, colors);
        }
        this.#drawSonar(context, transform, view, state.navigationRocket, state, colors);
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
        const trail = this.#visibleTrail(rocket);
        if (trail.length < 2) {
            return;
        }

        context.save();
        context.lineWidth = Math.max(1, 2 * transform.scale);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.shadowBlur = 6 * transform.scale;
        context.shadowColor = colors.trail;

        for (let index = 1; index < trail.length; index += 1) {
            const from = transform.toScreen(trail[index - 1]);
            const to = transform.toScreen(trail[index]);

            context.save();
            const pointAlpha = Number.isFinite(trail[index]?.alpha) ? trail[index].alpha : 1;
            context.globalAlpha = context.globalAlpha * (index / trail.length) * pointAlpha;
            context.beginPath();
            context.moveTo(from.x, from.y);
            context.lineTo(to.x, to.y);
            context.strokeStyle = colors.trail;
            context.stroke();
            context.restore();
        }

        context.restore();
    }

    #drawHeldCargo(context, transform, rocket, colors) {
        const cargo = rocket?.heldCargo || [];
        if (cargo.length === 0) {
            return;
        }

        const trail = this.#visibleTrail(rocket);
        if (trail.length < 5) {
            return;
        }

        cargo.forEach((item, index) => {
            const gap = 8;
            const trailIndex = Math.max(0, trail.length - 1 - (index + 1) * gap);
            const position = transform.toScreen(trail[trailIndex]);
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

    #drawSonar(context, transform, view, rocket, state, colors) {
        if (!rocket?.position) {
            return;
        }

        const range = rocket.getCollectionRange?.() ?? 0;
        if (range <= 0) {
            return;
        }

        const position = transform.toScreen(rocket.position);
        const duration = 2000;
        const timestamp = view.timestamp;
        const isStopping = !state.sonarEnabled && Number.isFinite(state.sonarStopTimestamp);
        if (!state.sonarEnabled && !isStopping) {
            return;
        }

        [0, 0.5].forEach(offset => {
            const progress = ((timestamp + offset * duration) % duration) / duration;
            if (isStopping) {
                const stopProgress = ((state.sonarStopTimestamp + offset * duration) % duration) / duration;
                if (progress < stopProgress) {
                    return;
                }
            }

            const radius = transform.radius(range * progress);
            const alpha = (1 - progress) * 0.9;
            if (radius <= 0 || alpha <= 0) {
                return;
            }

            context.save();
            context.globalAlpha = context.globalAlpha * alpha;
            context.beginPath();
            context.arc(position.x, position.y, radius, 0, Math.PI * 2);
            context.strokeStyle = colors.sonar;
            context.fillStyle = colors.sonar;
            context.lineWidth = Math.max(1, 2.5 * transform.scale);
            context.shadowBlur = 10 * transform.scale;
            context.shadowColor = colors.sonar;
            context.stroke();
            context.globalAlpha = context.globalAlpha * 0.15;
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

    #visibleTrail(rocket) {
        const trail = rocket?.actualTrail || [];
        return trail.slice(-FlightVisualRenderer.VISIBLE_TRAIL_LENGTH);
    }
}

export default FlightVisualRenderer;
