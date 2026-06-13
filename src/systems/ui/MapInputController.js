class MapInputController {
    constructor({ document, canvas }) {
        this.document = document;
        this.canvas = canvas;
        this.handler = null;
        this.activePointers = new Map();
        this.lastPinchDistance = 0;
        this.lastPinchCenter = null;
    }

    setHandler(handler) {
        this.handler = handler;
        if (!this.canvas || this.canvas.dataset.inputHandlerReady === 'true') {
            return;
        }

        this.canvas.dataset.inputHandlerReady = 'true';
        this.canvas.addEventListener('pointerdown', event => this.#handlePointerDown(event), { passive: false });
        this.canvas.addEventListener('pointermove', event => this.#handleHover(event), { passive: false });
        this.canvas.addEventListener('pointerleave', () => this.#handleHoverLeave(), { passive: false });
        this.document.defaultView?.addEventListener('pointermove', event => this.#handlePointerMove(event), { passive: false });
        this.document.defaultView?.addEventListener('pointerup', event => this.#handlePointerUp(event), { passive: false });
        this.document.defaultView?.addEventListener('pointercancel', event => this.#handlePointerUp(event), { passive: false });
        this.canvas.addEventListener('wheel', event => this.#handleWheel(event), { passive: false });
    }

    #handlePointerDown(event) {
        if (!this.handler) {
            return;
        }

        event.preventDefault();
        this.canvas.setPointerCapture?.(event.pointerId);
        this.activePointers.set(event.pointerId, this.#createPoint(event));

        if (this.activePointers.size === 1) {
            this.handler({
                type: 'pointerdown',
                point: this.#createPoint(event),
                shiftKey: !!event.shiftKey,
                ctrlKey: !!event.ctrlKey,
                pointerType: event.pointerType
            });
            return;
        }

        if (this.activePointers.size >= 2) {
            const [p1, p2] = [...this.activePointers.values()].slice(0, 2);
            this.lastPinchDistance = this.#distance(p1, p2);
            this.lastPinchCenter = this.#midpoint(p1, p2);
            this.handler({ type: 'gesturestart', point: this.lastPinchCenter });
        }
    }

    #handlePointerMove(event) {
        if (!this.handler || !this.activePointers.has(event.pointerId)) {
            return;
        }

        event.preventDefault();
        this.activePointers.set(event.pointerId, this.#createPoint(event));
        const pointers = [...this.activePointers.values()];

        if (pointers.length >= 2) {
            this.#handlePinchMove(pointers);
            return;
        }

        this.handler({
            type: 'pointermove',
            point: this.#createPoint(event),
            pointerType: event.pointerType
        });
    }

    #handlePinchMove(pointers) {
        const [p1, p2] = pointers.slice(0, 2);
        const center = this.#midpoint(p1, p2);
        const distance = this.#distance(p1, p2);
        const scale = this.lastPinchDistance > 0 ? distance / this.lastPinchDistance : 1;
        const delta = this.lastPinchCenter
            ? { x: center.x - this.lastPinchCenter.x, y: center.y - this.lastPinchCenter.y }
            : { x: 0, y: 0 };

        this.handler({
            type: 'pinch',
            point: center,
            delta,
            scale
        });
        this.lastPinchDistance = distance;
        this.lastPinchCenter = center;
    }

    #handlePointerUp(event) {
        if (!this.handler || !this.activePointers.has(event.pointerId)) {
            return;
        }

        event.preventDefault();
        this.activePointers.delete(event.pointerId);
        this.canvas.releasePointerCapture?.(event.pointerId);

        if (this.activePointers.size === 0) {
            this.lastPinchDistance = 0;
            this.lastPinchCenter = null;
            this.handler({ type: 'pointerup', point: this.#createPoint(event) });
            return;
        }

        if (this.activePointers.size === 1) {
            const [point] = [...this.activePointers.values()];
            this.lastPinchDistance = 0;
            this.lastPinchCenter = null;
            this.handler({
                type: 'pointerdown',
                point,
                shiftKey: false,
                ctrlKey: false,
                pointerType: event.pointerType
            });
        }
    }

    #handleWheel(event) {
        if (!this.handler) {
            return;
        }

        event.preventDefault();
        this.handler({
            type: 'wheel',
            point: this.#createPoint(event),
            deltaY: event.deltaY
        });
    }

    #handleHover(event) {
        if (!this.handler || this.activePointers.size > 0) {
            return;
        }

        this.handler({
            type: 'hover',
            point: this.#createPoint(event),
            displayPoint: this.#createDisplayPoint(event),
            pointerType: event.pointerType
        });
    }

    #handleHoverLeave() {
        this.handler?.({ type: 'hoverleave' });
    }

    #createPoint(event) {
        const rect = this.canvas.getBoundingClientRect?.();
        if (rect?.width && rect?.height) {
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            return {
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY
            };
        }

        return {
            x: event.clientX,
            y: event.clientY
        };
    }

    #createDisplayPoint(event) {
        const rect = this.canvas.getBoundingClientRect?.();
        if (rect) {
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        }

        return {
            x: event.clientX,
            y: event.clientY
        };
    }

    #distance(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    #midpoint(a, b) {
        return {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
        };
    }
}

export default MapInputController;
