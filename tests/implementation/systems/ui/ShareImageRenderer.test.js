import { describe, expect, it, vi } from 'vitest';
import ShareImageRenderer from '../../../../src/systems/ui/ShareImageRenderer.js';

function createContext() {
    return {
        save: vi.fn(),
        restore: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        drawImage: vi.fn(),
        fillText: vi.fn(),
        measureText: vi.fn(text => ({ width: String(text).length * 12 })),
        beginPath: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        arc: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        set fillStyle(value) {
            this._fillStyle = value;
            this._fillStyles ??= [];
            this._fillStyles.push(value);
        },
        get fillStyle() { return this._fillStyle; },
        set strokeStyle(value) {
            this._strokeStyle = value;
            this._strokeStyles ??= [];
            this._strokeStyles.push(value);
        },
        get strokeStyle() { return this._strokeStyle; },
        set lineWidth(value) {
            this._lineWidth = value;
            this._lineWidths ??= [];
            this._lineWidths.push(value);
        },
        get lineWidth() { return this._lineWidth; },
        set font(value) { this._font = value; },
        get font() { return this._font; },
        set globalAlpha(value) {
            this._globalAlpha = value;
            this._globalAlphas ??= [];
            this._globalAlphas.push(value);
        },
        get globalAlpha() { return this._globalAlpha; }
    };
}

function createDocument(context, blob = new Blob(['png'], { type: 'image/png' })) {
    return {
        createElement: vi.fn(() => {
            const canvas = {
            width: 0,
            height: 0,
            getContext: vi.fn(() => context),
            toBlob: vi.fn(callback => callback(blob))
            };
            context.canvas = canvas;
            return canvas;
        })
    };
}

describe('ShareImageRenderer', () => {
    it('requires share map data for a flight result image', async () => {
        const renderer = new ShareImageRenderer({
            documentRef: createDocument(createContext()),
            width: 640,
            height: 360
        });

        await expect(renderer.createFlightResultImage({
            viewData: {
                title: 'SECTOR 1 COMPLETED',
                totalScore: 1234,
                totalCoins: 56,
                entries: []
            }
        })).rejects.toThrow('[ShareImageRenderer] flight result shareMap is required.');
    });

    it('generates a flight result image from share map data and result metrics', async () => {
        const context = createContext();
        const documentRef = createDocument(context);
        const renderer = new ShareImageRenderer({ documentRef, width: 640, height: 360 });
        const repository = {
            getUiText: vi.fn(key => ({
                'flightResult.stats.score': 'SCORE',
                'flightResult.stats.credits': 'CREDITS',
                'flightResult.sections.performance': 'PERFORMANCE'
            })[key])
        };

        const blob = await renderer.createFlightResultImage({
            viewData: {
                title: 'SECTOR 1 COMPLETED',
                totalScore: 1234,
                totalCoins: 56,
                entries: [{ label: 'Goal Bonus', score: 1000, coin: 50 }],
                shareMap: {
                    bodies: [{ position: { x: 0, y: 0 }, radius: 40, kind: 'home' }],
                    exits: [{ angle: 30, width: 26, radius: 450, facilityType: 'TRADING_POST', facilityName: 'TRADING POST' }],
                    trail: [{ x: 0, y: 0 }, { x: 120, y: 50 }],
                    rocket: {
                        position: { x: 120, y: 50 },
                        velocity: { x: 4, y: 1 }
                    }
                }
            },
            gameDataRepository: repository
        });

        expect(blob.type).toBe('image/png');
        expect(context.drawImage).not.toHaveBeenCalled();
        expect(context.fillText).toHaveBeenCalledWith('SECTOR 1 COMPLETED', expect.any(Number), expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('Goal Bonus', expect.any(Number), expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('T', 0, 0);
        expect(context.measureText).toHaveBeenCalledWith('T');
    });

    it('requires facility names for share map exit labels', async () => {
        const renderer = new ShareImageRenderer({
            documentRef: createDocument(createContext()),
            width: 640,
            height: 360
        });

        await expect(renderer.createFlightResultImage({
            viewData: {
                title: 'SECTOR 1 COMPLETED',
                totalScore: 1234,
                totalCoins: 56,
                entries: [],
                shareMap: {
                    bodies: [{ position: { x: 0, y: 0 }, radius: 40, kind: 'home' }],
                    exits: [{ angle: 30, width: 26, radius: 450, facilityType: 'TRADING_POST' }],
                    trail: [{ x: 0, y: 0 }, { x: 120, y: 50 }],
                    rocket: {
                        position: { x: 120, y: 50 },
                        velocity: { x: 4, y: 1 }
                    }
                }
            }
        })).rejects.toThrow('[ShareImageRenderer] shareMap.exits[0].facilityName is required.');
    });

    it('rejects incomplete share map data instead of drawing a fallback map', async () => {
        const renderer = new ShareImageRenderer({
            documentRef: createDocument(createContext()),
            width: 640,
            height: 360
        });

        await expect(renderer.createFlightResultImage({
            viewData: {
                title: 'SECTOR 1 COMPLETED',
                totalScore: 1234,
                totalCoins: 56,
                entries: [],
                shareMap: {
                    bodies: [{ position: { x: 0, y: 0 }, radius: 40, kind: 'home' }],
                    trail: [{ x: 0, y: 0 }, { x: 120, y: 50 }],
                    rocket: {
                        position: { x: 120, y: 50 },
                        velocity: { x: 4, y: 1 }
                    }
                }
            }
        })).rejects.toThrow('[ShareImageRenderer] shareMap.exits must be an array.');
    });

    it('generates a flight result image with a faint full trail and a stronger arrival tail', async () => {
        const context = createContext();
        const renderer = new ShareImageRenderer({
            documentRef: createDocument(context),
            width: 640,
            height: 360
        });
        const mapCanvas = { width: 320, height: 180 };

        await renderer.createFlightResultImage({
            viewData: {
                title: 'SECTOR 1 COMPLETED',
                totalScore: 1234,
                totalCoins: 56,
                entries: [],
                shareMap: {
                    bodies: [
                        { position: { x: 0, y: 0 }, radius: 40, kind: 'home' },
                        { position: { x: 160, y: 80 }, radius: 24, kind: 'normal' }
                    ],
                    exits: [
                        { angle: 30, width: 26, radius: 450, facilityType: 'TRADING_POST', facilityName: 'TRADING POST' }
                    ],
                    trail: Array.from({ length: 130 }, (_, index) => ({
                        x: index * 3,
                        y: index * 2
                    })),
                    rocket: {
                        position: { x: 387, y: 258 },
                        velocity: { x: 4, y: 1 }
                    }
                }
            },
            mapCanvas
        });

        expect(context.drawImage).not.toHaveBeenCalled();
        expect(context.arc).toHaveBeenCalled();
        expect(context.moveTo).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
        expect(context.lineTo).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('T', 0, 0);
        expect(context._lineWidths).toEqual(expect.arrayContaining([expect.any(Number)]));
        expect(Math.max(...context._lineWidths)).toBeLessThan(7);
        expect(Math.min(...context._globalAlphas)).toBeLessThan(0.2);
        expect(Math.max(...context._globalAlphas)).toBeGreaterThan(0.5);
        expect(context._strokeStyles).toContain('#00ffd6');
        expect(context.fill).toHaveBeenCalled();
    });

    it('generates a game end receipt image from the receipt element text', async () => {
        const context = createContext();
        const documentRef = createDocument(context);
        const renderer = new ShareImageRenderer({
            documentRef,
            width: 640,
            height: 360
        });

        const receiptElement = document.createElement('section');
        receiptElement.innerHTML = `
            <h1 class="text-display">TERMINAL REPORT</h1>
            <p class="text-sub-display">GRAVITY FREIGHT CO. - FINAL EVALUATION</p>
            <div class="panel-body">
                <section class="section">
                    <div class="SplitRow data-row"><span class="stat-label">SECTORS COMPLETED</span><span class="stat-value">1 SCS</span></div>
                    <p class="section-subtitle">SECTOR RANKING <span class="state-top-rank"><span class="rank-value">1st</span></span> / GRADE B</p>
                </section>
                <section class="section">
                    <div class="SplitRow data-row"><span class="stat-label">TOTAL COLLECTED</span><span class="stat-value">1 PCS</span></div>
                    <p class="section-subtitle">COLLECTION RANKING 45th / GRADE D</p>
                </section>
                <section class="section hero">
                    <div class="SplitRow data-row"><span class="stat-label">FINAL SCORE</span><span class="stat-value">4,780 PTS</span></div>
                    <p class="section-subtitle">SCORE RANKING <span class="state-top-rank"><span class="rank-value">1st</span></span> / GRADE B</p>
                </section>
            </div>
            <div class="receipt-stamp-right-half">B</div>
            <p class="auth-status">OFFICIAL PERFORMANCE LOG GRANTED</p>
            <p class="timestamp">2026/6/18 16:28:29</p>
        `;

        await renderer.createGameEndImage({ receiptElement });

        const canvas = documentRef.createElement.mock.results[0].value;
        expect(canvas.width).toBe(900);
        expect(canvas.height).toBeLessThan(1200);
        expect(context.fillText).toHaveBeenCalledWith('TERMINAL REPORT', expect.any(Number), expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('FINAL SCORE', expect.any(Number), expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('4,780 PTS', expect.any(Number), expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('1st', expect.any(Number), expect.any(Number), expect.any(Number));
        expect(context.fillText).toHaveBeenCalledWith('B', expect.any(Number), expect.any(Number), expect.any(Number));
        expect(context._fillStyles).toContain('#b22d2d');
        expect(context._strokeStyles).toContain('#556b2f');
        expect(context.fillRect).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 1, 62);
    });

    it('requires a game end receipt element for game end share images', async () => {
        const renderer = new ShareImageRenderer({
            documentRef: createDocument(createContext())
        });

        await expect(renderer.createGameEndImage({ receiptElement: null }))
            .rejects.toThrow('[ShareImageRenderer] game end receiptElement is required.');
    });

    it('requires the game end receipt DOM contract instead of falling back to plain text parsing', async () => {
        const renderer = new ShareImageRenderer({
            documentRef: createDocument(createContext())
        });
        const receiptElement = document.createElement('section');
        receiptElement.textContent = 'TERMINAL REPORT FINAL SCORE 4,780 GRADE D';

        await expect(renderer.createGameEndImage({ receiptElement }))
            .rejects.toThrow('[ShareImageRenderer] receipt must contain at least two summary sections.');
    });
});
