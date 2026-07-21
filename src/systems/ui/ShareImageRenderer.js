import FlightResultShareImagePainter from './FlightResultShareImagePainter.js';
import GameEndReceiptShareImagePainter from './GameEndReceiptShareImagePainter.js';

class ShareImageRenderer {
    constructor({
        documentRef = globalThis.document,
        width = 1280,
        height = 720
    } = {}) {
        this.document = documentRef;
        this.width = width;
        this.height = height;
        this.flightResultPainter = new FlightResultShareImagePainter({ width, height });
        this.gameEndReceiptPainter = new GameEndReceiptShareImagePainter();
    }

    async createFlightResultImage({ viewData = {}, gameDataRepository = null } = {}) {
        const { canvas, context } = this.#createCanvas();
        this.flightResultPainter.paint(context, { viewData, gameDataRepository });
        return this.#toBlob(canvas);
    }

    async createGameEndImage({ receiptElement = null } = {}) {
        const { width, height } = this.gameEndReceiptPainter.measure(receiptElement);
        const { canvas, context } = this.#createCanvas({ width, height });
        this.gameEndReceiptPainter.paint(context, receiptElement);
        return this.#toBlob(canvas);
    }

    #createCanvas({ width = this.width, height = this.height } = {}) {
        if (!this.document?.createElement) {
            throw new Error('[ShareImageRenderer] document is required.');
        }
        const canvas = this.document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('[ShareImageRenderer] 2d canvas context is required.');
        }
        return { canvas, context };
    }

    #toBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('[ShareImageRenderer] failed to create image blob.'));
                }
            }, 'image/png');
        });
    }
}

export default ShareImageRenderer;
