import { DELIVERY_CARGO_ICON_PATHS, DELIVERY_CARGO_ICON_VIEWBOX } from '../ui/deliveryCargoIconShape.js';

const FACILITY_LABELS = {
    TRADING_POST: 'TRADING POST',
    REPAIR_DOCK: 'REPAIR DOCK',
    BLACK_MARKET: 'BLACK MARKET'
};

class SectorMapRenderer {
    render(context, sector, transform, colors, options = {}) {
        if (!sector) {
            return;
        }

        const timestamp = options.timestamp ?? 0;
        const activeRocket = options.activeRocket ?? null;
        this.#drawBoundary(context, sector, transform, colors);
        this.#drawExits(context, sector, transform, colors, timestamp, activeRocket);
        this.#drawBodies(context, sector, transform, colors);
    }

    #drawBoundary(context, sector, transform, colors) {
        const exit = sector.exits[0];
        if (!exit) {
            return;
        }

        const center = transform.toScreen({ x: 0, y: 0 });

        context.save();
        context.beginPath();
        context.arc(center.x, center.y, transform.radius(exit.radius), 0, Math.PI * 2);
        context.strokeStyle = colors.boundary;
        context.lineWidth = Math.max(1, transform.scale);
        context.stroke();
        context.restore();
    }

    #drawExits(context, sector, transform, colors, timestamp, activeRocket) {
        if (sector.exits.length === 0) {
            return;
        }

        const center = transform.toScreen({ x: 0, y: 0 });
        const arcMultiplier = this.#getActiveArcMultiplier(activeRocket);

        sector.exits.forEach(exit => {
            const effectiveWidth = exit.width * arcMultiplier;
            const start = (exit.angle - effectiveWidth / 2) * Math.PI / 180 + transform.rotation;
            const end = (exit.angle + effectiveWidth / 2) * Math.PI / 180 + transform.rotation;
            const color = this.#facilityColor(exit.getFacilityType(), colors);

            context.save();
            context.beginPath();
            context.arc(center.x, center.y, transform.radius(exit.radius), start, end);
            context.strokeStyle = color;
            context.lineWidth = Math.max(2, 6 * transform.scale);
            context.shadowBlur = 15 * transform.scale;
            context.shadowColor = color;
            context.stroke();
            context.restore();

            this.#drawFacilityLabel(context, exit, transform, center, colors);
            if (this.#hasDeliveryCargoForExit(sector, exit, activeRocket)) {
                this.#drawDeliveryCargoIcon(context, exit, transform, center, colors, timestamp);
            }
        });
    }

    #getActiveArcMultiplier(activeRocket) {
        if (!activeRocket) {
            return 1;
        }
        if (typeof activeRocket.getArcMultiplier !== 'function') {
            throw new Error('[WorldRenderer] active rocket must provide getArcMultiplier().');
        }

        const multiplier = activeRocket.getArcMultiplier();
        if (!Number.isFinite(multiplier) || multiplier <= 0) {
            throw new Error('[WorldRenderer] active rocket arc multiplier must be a positive finite number.');
        }

        return multiplier;
    }

    #drawDeliveryCargoIcon(context, exit, transform, center, colors, timestamp) {
        const angle = exit.angle * Math.PI / 180 + transform.rotation;
        const iconRadius = transform.radius(exit.radius + 85);
        const x = center.x + Math.cos(angle) * iconRadius;
        const y = center.y + Math.sin(angle) * iconRadius;
        const color = this.#facilityColor(exit.getFacilityType(), colors);
        const alpha = 0.5 + 0.5 * Math.sin(timestamp / 333);
        const normalized = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const isBottom = normalized > 0 && normalized < Math.PI;
        const scale = transform.scale;
        const iconScale = scale;

        context.save();
        context.globalAlpha = context.globalAlpha * alpha;
        context.translate(x, y);
        context.rotate(isBottom ? angle - Math.PI / 2 : angle + Math.PI / 2);
        context.translate(
            -DELIVERY_CARGO_ICON_VIEWBOX.width * iconScale / 2,
            -DELIVERY_CARGO_ICON_VIEWBOX.height * iconScale / 2
        );
        context.scale?.(iconScale, iconScale);
        context.strokeStyle = color;
        context.lineWidth = Math.max(1, 1.8 / iconScale);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.shadowBlur = 10 * scale;
        context.shadowColor = color;

        Object.values(DELIVERY_CARGO_ICON_PATHS).forEach(points => {
            context.beginPath();
            points.forEach(([pointX, pointY], index) => {
                if (index === 0) {
                    context.moveTo(pointX, pointY);
                    return;
                }
                context.lineTo(pointX, pointY);
            });
            context.stroke();
        });
        context.restore();
    }

    #drawFacilityLabel(context, exit, transform, center, colors) {
        const type = exit.getFacilityType();
        const label = FACILITY_LABELS[type] || type;
        const angle = exit.angle * Math.PI / 180 + transform.rotation;
        const color = this.#facilityColor(type, colors);
        const textRadius = transform.radius(exit.radius + 45);
        const fontSize = 30 * transform.scale;

        if (textRadius <= 0 || fontSize <= 0) {
            return;
        }

        context.save();
        context.font = `bold ${fontSize}px Orbitron, sans-serif`;
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
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
                    center.x + Math.cos(charAngle) * textRadius,
                    center.y + Math.sin(charAngle) * textRadius
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
    }

    #drawBodies(context, sector, transform, colors) {
        sector.bodies.forEach(body => {
            const position = transform.toScreen(body.position);
            const radius = Math.max(4, transform.radius(body.radius));
            const color = this.#bodyColor(body, colors);

            context.save();
            context.shadowBlur = 20 * transform.scale;
            context.shadowColor = color;
            context.fillStyle = color;
            context.beginPath();
            context.arc(position.x, position.y, radius, 0, Math.PI * 2);
            context.fill();
            context.restore();

            if (body.items.length > 0) {
                this.#drawItemRings(context, body, position, radius, transform, colors);
            }
        });
    }

    #drawItemRings(context, body, position, radius, transform, colors) {
        const items = body.items || [];
        const angleStep = (Math.PI * 2) / items.length;

        items.forEach((item, index) => {
            const category = this.#resolveItemCategory(item);
            const color = colors.categories[category];
            if (!color) {
                return;
            }

            const startAngle = index * angleStep;
            const gap = items.length > 1 ? 0.1 : 0;
            context.save();
            context.strokeStyle = color;
            context.lineWidth = Math.max(1, 2 * transform.scale);
            context.shadowBlur = 10 * transform.scale;
            context.shadowColor = color;
            context.beginPath();
            context.arc(position.x, position.y, radius + 4 * transform.scale, startAngle, startAngle + angleStep - gap);
            context.stroke();
            context.restore();
        });
    }

    #facilityColor(type, colors) {
        return colors.facilities[type] || colors.rocket;
    }

    #bodyColor(body, colors) {
        if (body.isHome) return colors.homeStar;
        if (body.isRepulsion) return colors.repulsiveStar;
        return colors.normalStar;
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

    #hasDeliveryCargoForExit(sector, exit, activeRocket) {
        const facilityType = exit.getFacilityType();
        const isOnMap = sector.bodies.some(body => (
            (body.items || []).some(item => this.#isDeliveryCargoForFacility(item, facilityType))
        ));
        if (isOnMap) {
            return true;
        }

        return (activeRocket?.heldCargo || [])
            .some(item => this.#isDeliveryCargoForFacility(item, facilityType));
    }

    #isDeliveryCargoForFacility(item, facilityType) {
        const viewData = item?.getViewData?.();
        const category = item?.category ?? viewData?.category;
        const deliveryGoalId = item?.deliveryGoalId ?? viewData?.deliveryGoalId;
        return category === 'cargo' && deliveryGoalId === facilityType;
    }
}

export default SectorMapRenderer;
