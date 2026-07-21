class FlightResultShareImagePainter {
    constructor({ width, height } = {}) {
        this.width = width;
        this.height = height;
    }

    paint(context, { viewData = {}, gameDataRepository = null } = {}) {
        if (!viewData.shareMap) {
            throw new Error('[ShareImageRenderer] flight result shareMap is required.');
        }
        this.#validateShareMap(viewData.shareMap);

        this.#paintSpaceBackground(context);
        this.#paintMapPreview(context, viewData.shareMap);
        this.#paintResultPanel(context, viewData, gameDataRepository);
    }

    #paintSpaceBackground(context) {
        context.fillStyle = '#03030d';
        context.fillRect(0, 0, this.width, this.height);
        context.fillStyle = 'rgba(120, 220, 255, 0.35)';
        for (let index = 0; index < 90; index += 1) {
            const x = (index * 197) % this.width;
            const y = (index * 89) % this.height;
            context.fillRect(x, y, index % 5 === 0 ? 2 : 1, index % 7 === 0 ? 2 : 1);
        }
    }

    #paintMapPreview(context, shareMap) {
        const x = 520;
        const y = 70;
        const width = 690;
        const height = 560;
        context.save();
        context.strokeStyle = 'rgba(0, 255, 214, 0.35)';
        context.lineWidth = 2;
        context.strokeRect(x, y, width, height);
        this.#paintShareMapStars(context, { x, y, width, height });
        this.#paintShareMapData(context, shareMap, { x, y, width, height });
        context.restore();
    }

    #paintShareMapStars(context, rect) {
        context.save();
        for (let index = 0; index < 130; index += 1) {
            const x = rect.x + ((index * 149) % rect.width);
            const y = rect.y + ((index * 83) % rect.height);
            const alpha = 0.18 + ((index % 7) * 0.06);
            const size = index % 11 === 0 ? 2 : 1;
            context.fillStyle = `rgba(150, 220, 255, ${alpha})`;
            context.fillRect(x, y, size, size);
        }
        context.restore();
    }

    #paintShareMapData(context, shareMap, rect) {
        context.save();
        context.beginPath();
        context.rect(rect.x, rect.y, rect.width, rect.height);
        context.clip();
        context.fillStyle = 'rgba(0, 255, 214, 0.05)';
        context.fillRect(rect.x, rect.y, rect.width, rect.height);

        const transform = this.#createShareMapTransform(shareMap, rect);
        this.#paintShareMapBoundary(context, shareMap, transform);
        this.#paintShareMapExits(context, shareMap, transform);
        this.#paintShareMapFacilityLabels(context, shareMap, transform);
        this.#paintShareMapBodies(context, shareMap, transform);
        this.#paintShareMapTrail(context, shareMap, transform);
        this.#paintShareMapRocket(context, shareMap, transform);
        context.restore();
    }

    #createShareMapTransform(shareMap, rect) {
        const extent = this.#calculateShareMapExtent(shareMap);
        const scale = Math.min(rect.width, rect.height) * 0.44 / Math.max(extent, 1);
        return {
            scale,
            centerX: rect.x + rect.width / 2,
            centerY: rect.y + rect.height / 2,
            toScreen: point => ({
                x: rect.x + rect.width / 2 + point.x * scale,
                y: rect.y + rect.height / 2 + point.y * scale
            }),
            radius: value => Math.max(1, value * scale)
        };
    }

    #calculateShareMapExtent(shareMap) {
        const exitExtent = shareMap.exits.reduce(
            (max, exit) => Math.max(max, Math.abs(exit.radius)),
            0
        );
        const bodyExtent = shareMap.bodies.reduce((max, body) => (
            Math.max(max, Math.hypot(body.position.x, body.position.y) + body.radius)
        ), 0);
        const trailExtent = shareMap.trail.reduce((max, point) => (
            Math.max(max, Math.hypot(point.x, point.y))
        ), 0);

        return Math.max(exitExtent, bodyExtent, trailExtent, 500);
    }

    #paintShareMapBoundary(context, shareMap, transform) {
        const radius = shareMap.exits[0].radius;

        context.save();
        context.beginPath();
        context.arc(transform.centerX, transform.centerY, transform.radius(radius), 0, Math.PI * 2);
        context.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        context.lineWidth = 1;
        context.stroke();
        context.restore();
    }

    #paintShareMapExits(context, shareMap, transform) {
        shareMap.exits.forEach(exit => {
            const radius = transform.radius(exit.radius);
            const width = exit.width * Math.PI / 180;
            const angle = exit.angle * Math.PI / 180;
            const color = this.#facilityColor(exit.facilityType);

            context.save();
            context.beginPath();
            context.arc(transform.centerX, transform.centerY, radius, angle - width / 2, angle + width / 2);
            context.strokeStyle = color;
            context.lineWidth = Math.max(2, 7 * transform.scale);
            context.shadowBlur = 14 * transform.scale;
            context.shadowColor = color;
            context.stroke();
            context.restore();
        });
    }

    #paintShareMapFacilityLabels(context, shareMap, transform) {
        shareMap.exits.forEach(exit => {
            const angle = exit.angle * Math.PI / 180;
            const color = this.#facilityColor(exit.facilityType);
            const textRadius = transform.radius(exit.radius + 45);
            const fontSize = Math.max(15, 30 * transform.scale);
            const label = exit.facilityName;

            context.save();
            context.font = `900 ${fontSize}px Orbitron, Outfit, sans-serif`;
            context.textBaseline = 'middle';
            context.textAlign = 'center';
            context.fillStyle = color;
            context.shadowBlur = 15 * transform.scale;
            context.shadowColor = color;

            const charWidths = [...label].map(char => context.measureText(char).width + 6 * transform.scale);
            const totalTextAngle = charWidths.reduce((total, width) => total + width, 0) / textRadius;
            const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const isBottom = normalized > 0 && normalized < Math.PI;
            let currentAngle = isBottom ? angle + totalTextAngle / 2 : angle - totalTextAngle / 2;

            [...label].forEach((char, index) => {
                const charWidth = charWidths[index];
                const charAngle = isBottom
                    ? currentAngle - (charWidth / 2) / textRadius
                    : currentAngle + (charWidth / 2) / textRadius;

                if (char !== ' ') {
                    context.save();
                    context.translate(
                        transform.centerX + Math.cos(charAngle) * textRadius,
                        transform.centerY + Math.sin(charAngle) * textRadius
                    );
                    context.rotate(isBottom ? charAngle - Math.PI / 2 : charAngle + Math.PI / 2);
                    context.fillText(char, 0, 0);
                    context.restore();
                }

                currentAngle += isBottom
                    ? -charWidth / textRadius
                    : charWidth / textRadius;
            });
            context.restore();
        });
    }

    #paintShareMapBodies(context, shareMap, transform) {
        shareMap.bodies.forEach(body => {
            const position = transform.toScreen(body.position);
            const radius = Math.max(4, transform.radius(body.radius));

            context.save();
            context.beginPath();
            context.arc(position.x, position.y, radius, 0, Math.PI * 2);
            context.fillStyle = this.#bodyColor(body.kind);
            context.shadowBlur = 18 * transform.scale;
            context.shadowColor = context.fillStyle;
            context.fill();
            context.restore();
        });
    }

    #paintShareMapTrail(context, shareMap, transform) {
        const trail = shareMap.trail;
        const visibleTailLength = 110;
        const tailStart = Math.max(1, trail.length - visibleTailLength);

        context.save();
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = Math.max(1, 2 * transform.scale);
        context.shadowBlur = 6 * transform.scale;
        context.shadowColor = '#00ffd6';

        for (let index = 1; index < trail.length; index += 1) {
            const from = transform.toScreen(trail[index - 1]);
            const to = transform.toScreen(trail[index]);
            const tailProgress = Math.max(0, (index - tailStart + 1) / Math.max(1, trail.length - tailStart));
            const alpha = index < tailStart ? 0.12 : 0.12 + tailProgress * 0.6;

            context.save();
            context.globalAlpha = alpha;
            context.beginPath();
            context.moveTo(from.x, from.y);
            context.lineTo(to.x, to.y);
            context.strokeStyle = '#00ffd6';
            context.stroke();
            context.restore();
        }

        context.restore();
    }

    #paintShareMapRocket(context, shareMap, transform) {
        const rocket = shareMap.rocket;
        const position = transform.toScreen(rocket.position);
        const angle = Math.atan2(rocket.velocity.y, rocket.velocity.x);
        const size = Math.max(8, 12 * transform.scale);

        context.save();
        context.translate(position.x, position.y);
        context.rotate(angle);
        context.beginPath();
        context.moveTo(size, 0);
        context.lineTo(-size * 0.7, -size * 0.5);
        context.lineTo(-size * 0.45, 0);
        context.lineTo(-size * 0.7, size * 0.5);
        context.closePath();
        context.fillStyle = '#ffffff';
        context.shadowBlur = 16 * transform.scale;
        context.shadowColor = '#00ffd6';
        context.fill();
        context.restore();
    }

    #paintResultPanel(context, viewData, gameDataRepository) {
        const text = key => gameDataRepository?.getUiText?.(key) || key;
        context.save();
        context.fillStyle = 'rgba(25, 22, 32, 0.92)';
        context.strokeStyle = 'rgba(180, 120, 255, 0.85)';
        context.lineWidth = 3;
        this.#roundedRect(context, 60, 70, 410, 560, 8);
        context.fill();
        context.stroke();
        context.fillStyle = '#ffffff';
        context.font = '900 28px Outfit, sans-serif';
        context.fillText(String(viewData.title || 'FLIGHT RESULT'), 92, 124, 340);
        this.#drawMetric(context, text('flightResult.stats.score'), viewData.totalScore ?? 0, 92, 192, '#00ffd6');
        this.#drawMetric(context, text('flightResult.stats.credits'), viewData.totalCoins ?? 0, 92, 268, '#ffd600');
        context.font = '800 18px Outfit, sans-serif';
        context.fillStyle = 'rgba(255,255,255,0.8)';
        context.fillText(text('flightResult.sections.performance'), 92, 350, 320);
        context.font = '700 17px Outfit, sans-serif';
        (viewData.entries || []).slice(0, 6).forEach((entry, index) => {
            const y = 392 + (index * 32);
            context.fillStyle = 'rgba(255,255,255,0.86)';
            context.fillText(String(entry.label || ''), 92, y, 190);
            context.fillStyle = '#00ffd6';
            context.fillText(this.#formatSigned(entry.score), 298, y, 80);
            context.fillStyle = '#ffd600';
            context.fillText(this.#formatSigned(entry.coin), 382, y, 64);
        });
        context.restore();
    }

    #bodyColor(kind) {
        const color = { home: '#ffcc00', normal: '#ffd600', repulsion: '#ff6b00' }[kind];
        if (!color) {
            throw new Error(`[ShareImageRenderer] unknown shareMap body kind: ${kind}`);
        }
        return color;
    }

    #facilityColor(type) {
        const color = {
            TRADING_POST: '#18e34d',
            REPAIR_DOCK: '#2f86ff',
            BLACK_MARKET: '#ff2b77'
        }[type];
        if (!color) {
            throw new Error(`[ShareImageRenderer] unknown shareMap facility type: ${type}`);
        }
        return color;
    }

    #validateShareMap(shareMap) {
        this.#requireArray(shareMap.bodies, 'shareMap.bodies');
        this.#requireArray(shareMap.exits, 'shareMap.exits');
        this.#requireArray(shareMap.trail, 'shareMap.trail');
        if (shareMap.exits.length === 0) {
            throw new Error('[ShareImageRenderer] shareMap.exits must contain at least one exit.');
        }
        if (shareMap.trail.length < 2) {
            throw new Error('[ShareImageRenderer] shareMap.trail must contain at least two points.');
        }
        shareMap.bodies.forEach((body, index) => {
            this.#requirePoint(body.position, `shareMap.bodies[${index}].position`);
            this.#requireFiniteNumber(body.radius, `shareMap.bodies[${index}].radius`);
            this.#bodyColor(body.kind);
        });
        shareMap.exits.forEach((exit, index) => {
            this.#requireFiniteNumber(exit.angle, `shareMap.exits[${index}].angle`);
            this.#requireFiniteNumber(exit.width, `shareMap.exits[${index}].width`);
            this.#requireFiniteNumber(exit.radius, `shareMap.exits[${index}].radius`);
            this.#facilityColor(exit.facilityType);
            if (typeof exit.facilityName !== 'string' || exit.facilityName.length === 0) {
                throw new Error(`[ShareImageRenderer] shareMap.exits[${index}].facilityName is required.`);
            }
        });
        shareMap.trail.forEach((point, index) => {
            this.#requirePoint(point, `shareMap.trail[${index}]`);
        });
        if (!shareMap.rocket) {
            throw new Error('[ShareImageRenderer] shareMap.rocket is required.');
        }
        this.#requirePoint(shareMap.rocket.position, 'shareMap.rocket.position');
        this.#requirePoint(shareMap.rocket.velocity, 'shareMap.rocket.velocity');
    }

    #requireArray(value, name) {
        if (!Array.isArray(value)) {
            throw new Error(`[ShareImageRenderer] ${name} must be an array.`);
        }
    }

    #requirePoint(value, name) {
        if (!value || typeof value !== 'object') {
            throw new Error(`[ShareImageRenderer] ${name} must be a point.`);
        }
        this.#requireFiniteNumber(value.x, `${name}.x`);
        this.#requireFiniteNumber(value.y, `${name}.y`);
    }

    #requireFiniteNumber(value, name) {
        if (!Number.isFinite(value)) {
            throw new Error(`[ShareImageRenderer] ${name} must be a finite number.`);
        }
    }

    #drawMetric(context, label, value, x, y, color) {
        context.fillStyle = 'rgba(255,255,255,0.72)';
        context.font = '800 16px Outfit, sans-serif';
        context.fillText(String(label), x, y, 260);
        context.fillStyle = color;
        context.font = '900 36px Outfit, sans-serif';
        context.fillText(this.#formatNumber(value), x, y + 42, 260);
    }

    #roundedRect(context, x, y, width, height, radius) {
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
    }

    #formatSigned(value) {
        if (value === undefined || value === null) {
            return '';
        }
        return `+${this.#formatNumber(value)}`;
    }

    #formatNumber(value) {
        return new Intl.NumberFormat('en-US').format(value ?? 0);
    }
}

export default FlightResultShareImagePainter;
