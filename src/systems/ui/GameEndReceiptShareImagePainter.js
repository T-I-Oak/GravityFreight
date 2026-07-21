class GameEndReceiptShareImagePainter {
    measure(receiptElement) {
        if (!receiptElement?.querySelector) {
            throw new Error('[ShareImageRenderer] game end receiptElement is required.');
        }
        const receipt = this.#extractReceiptData(receiptElement);
        const layout = this.#createLayout(receipt);
        return {
            width: 900,
            height: layout.canvasHeight
        };
    }

    paint(context, receiptElement) {
        if (!receiptElement?.querySelector) {
            throw new Error('[ShareImageRenderer] game end receiptElement is required.');
        }

        this.#paintReceiptBackground(context);
        this.#paintReceipt(context, this.#extractReceiptData(receiptElement));
    }

    #paintReceiptBackground(context) {
        context.fillStyle = '#050505';
        context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    }

    #paintReceipt(context, receipt) {
        const layout = this.#createLayout(receipt);
        const {
            paperX,
            paperY,
            paperWidth,
            paperHeight,
            contentX,
            contentWidth,
            rowStartY,
            rowGap,
            rowDetailOffset,
            separatorY,
            finalY,
            finalDetailY,
            stampY,
            barcodeY,
            footerY
        } = layout;
        context.save();
        this.#paintReceiptPaper(context, paperX, paperY, paperWidth, paperHeight);

        context.fillStyle = '#222222';
        context.textAlign = 'center';
        context.font = '900 28px "Courier New", monospace';
        context.fillText(receipt.title, paperX + paperWidth / 2, 150, 360);
        context.font = '700 14px "Courier New", monospace';
        context.fillText(receipt.subtitle, paperX + paperWidth / 2, 184, 360);

        this.#drawDashedLine(context, contentX, 235, paperX + paperWidth - 40);
        receipt.rows.slice(0, 3).forEach((row, index) => {
            const rowY = rowStartY + index * rowGap;
            this.#drawReceiptRow(context, row.label, row.value, contentX, rowY, contentWidth);
            if (row.detail) {
                this.#drawReceiptDetail(context, row.detail, paperX + paperWidth - 55, rowY + rowDetailOffset, paperWidth - 100);
            }
        });

        this.#drawSolidLine(context, contentX, separatorY, paperX + paperWidth - 40);
        this.#drawReceiptRow(context, receipt.finalLabel, `${receipt.finalScore} PTS`, contentX, finalY, contentWidth, {
            labelFont: '900 28px "Courier New", monospace',
            valueFont: '900 28px "Courier New", monospace'
        });
        if (receipt.scoreDetail) {
            this.#drawReceiptDetail(context, receipt.scoreDetail, paperX + paperWidth - 55, finalDetailY, paperWidth - 110, {
                font: '700 15px "Courier New", monospace'
            });
        }

        this.#drawReceiptStamp(context, paperX + 120, stampY, receipt.grade);
        this.#drawBarcode(context, contentX, barcodeY, contentWidth, 62);
        context.font = '700 10px "Courier New", monospace';
        context.textAlign = 'center';
        context.fillText(receipt.authStatus, paperX + paperWidth / 2, footerY, paperWidth - 100);
        context.fillText(receipt.timestamp, paperX + paperWidth / 2, footerY + 25, paperWidth - 100);
        context.restore();
    }

    #createLayout(receipt) {
        const paperX = 225;
        const paperY = 52;
        const paperWidth = 450;
        const contentX = paperX + 40;
        const contentWidth = paperWidth - 80;
        const rowStartY = 288;
        const rowGap = 76;
        const rowDetailOffset = 38;
        const separatorY = rowStartY + receipt.rows.length * rowGap + 16;
        const finalY = separatorY + 58;
        const finalDetailY = finalY + 48;
        const stampY = finalDetailY + 47;
        const barcodeY = stampY + 190;
        const footerY = barcodeY + 90;
        const receiptBottomY = footerY + 68;
        const paperHeight = receiptBottomY - paperY;
        const canvasHeight = receiptBottomY + paperY;

        return {
            paperX,
            paperY,
            paperWidth,
            paperHeight,
            contentX,
            contentWidth,
            rowStartY,
            rowGap,
            rowDetailOffset,
            separatorY,
            finalY,
            finalDetailY,
            stampY,
            barcodeY,
            footerY,
            canvasHeight
        };
    }

    #paintReceiptPaper(context, x, y, width, height) {
        context.fillStyle = '#dddddd';
        context.beginPath();
        context.moveTo(x, y + 18);
        for (let index = 0; index <= 18; index += 1) {
            const px = x + index * (width / 18);
            context.lineTo(px + (width / 36), y);
            context.lineTo(px + (width / 18), y + 18);
        }
        context.lineTo(x + width, y + height);
        context.lineTo(x, y + height);
        context.closePath();
        context.fill();
    }

    #extractReceiptData(receiptElement) {
        const query = selector => {
            const element = receiptElement.querySelector(selector);
            if (!element) {
                throw new Error(`[ShareImageRenderer] required receipt element not found: ${selector}`);
            }
            return element;
        };
        const queryAll = selector => Array.from(receiptElement.querySelectorAll(selector));
        const summarySections = queryAll('.panel-body > .section')
            .filter(section => !section.classList.contains('hero'));
        if (summarySections.length < 2) {
            throw new Error('[ShareImageRenderer] receipt must contain at least two summary sections.');
        }
        const rows = summarySections.map(section => {
            const row = section.querySelector('.SplitRow.data-row');
            if (!row) {
                throw new Error('[ShareImageRenderer] receipt summary section is missing a data row.');
            }
            return {
                label: this.#requiredRowText(row, '.stat-label'),
                value: this.#requiredRowText(row, '.stat-value'),
                detail: this.#extractReceiptDetail(section.querySelector('.section-subtitle'))
            };
        });

        return {
            title: this.#cleanText(query('.text-display').textContent),
            subtitle: this.#cleanText(query('.text-sub-display').textContent),
            rows,
            finalLabel: this.#cleanText(query('.section.hero .stat-label').textContent),
            finalScore: this.#cleanText(query('.section.hero .stat-value').textContent).replace(/\s*PTS$/i, ''),
            scoreDetail: this.#extractReceiptDetail(query('.section.hero .section-subtitle')),
            grade: this.#cleanText(query('.receipt-stamp-right-half').textContent),
            authStatus: this.#cleanText(query('.auth-status').textContent),
            timestamp: this.#cleanText(query('.timestamp').textContent)
        };
    }

    #requiredRowText(row, selector) {
        const element = row.querySelector(selector);
        if (!element) {
            throw new Error(`[ShareImageRenderer] required receipt row element not found: ${selector}`);
        }
        return this.#cleanText(element.textContent);
    }

    #extractReceiptDetail(element) {
        if (!element) {
            return null;
        }
        const text = this.#cleanText(element.textContent);
        const topRank = element.querySelector('.state-top-rank .rank-value, .state-top-rank');
        const topRankText = topRank ? this.#cleanText(topRank.textContent) : '';
        return { text, topRankText };
    }

    #drawReceiptRow(context, label, value, x, y, width, options = {}) {
        context.fillStyle = '#222222';
        context.font = options.labelFont || '700 16px "Courier New", monospace';
        context.textAlign = 'left';
        context.fillText(label, x, y, width * 0.58);
        context.font = options.valueFont || '700 16px "Courier New", monospace';
        context.textAlign = 'right';
        context.fillText(value, x + width, y, width * 0.38);
    }

    #drawReceiptDetail(context, detail, rightX, y, maxWidth, options = {}) {
        const text = typeof detail === 'string' ? detail : detail.text;
        if (!text) {
            return;
        }
        const topRankText = typeof detail === 'string' ? '' : detail.topRankText;
        context.font = options.font || '700 14px "Courier New", monospace';
        context.textAlign = 'left';

        if (!topRankText || !text.includes(topRankText)) {
            context.fillStyle = '#222222';
            context.textAlign = 'right';
            context.fillText(text, rightX, y, maxWidth);
            return;
        }

        const [before, rest] = text.split(topRankText);
        const after = rest ?? '';
        const beforeWidth = context.measureText(before).width;
        const rankWidth = context.measureText(topRankText).width;
        const afterWidth = context.measureText(after).width;
        const startX = rightX - Math.min(maxWidth, beforeWidth + rankWidth + afterWidth);

        context.fillStyle = '#222222';
        context.fillText(before, startX, y, maxWidth);
        context.fillStyle = '#b22d2d';
        context.fillText(topRankText, startX + beforeWidth, y, maxWidth);
        context.fillStyle = '#222222';
        context.fillText(after, startX + beforeWidth + rankWidth, y, maxWidth);
    }

    #drawReceiptStamp(context, x, y, grade) {
        context.save();
        context.translate(x + 105, y + 65);
        context.rotate(-0.11);
        const stampColor = this.#receiptStampColor(grade);
        context.strokeStyle = stampColor;
        context.fillStyle = stampColor;
        context.lineWidth = 6;
        context.strokeRect(-122, -58, 244, 116);
        context.beginPath();
        context.moveTo(58, -56);
        context.lineTo(58, 56);
        context.stroke();
        context.font = '900 10px Inter, sans-serif';
        context.textAlign = 'left';
        context.fillText('OPERATOR AUTH.', -94, -21, 136);
        context.font = '900 13px Inter, sans-serif';
        context.fillText('CONTRACT VERIFIED', -94, 6, 146);
        context.font = '900 28px Inter, sans-serif';
        context.fillText('GRADE', -94, 42, 132);
        context.font = '900 74px Inter, sans-serif';
        context.textAlign = 'center';
        context.fillText(grade, 90, 26, 74);
        context.restore();
    }

    #receiptStampColor(grade) {
        const tier = { SS: 1, S: 2, A: 3, B: 4, C: 5, D: 6, E: 7 }[grade] ?? 7;
        return {
            1: '#b8860b',
            2: '#a52a2a',
            3: '#2f4f4f',
            4: '#556b2f',
            5: '#696969',
            6: '#2c4a6d',
            7: '#1a3b5a'
        }[tier];
    }

    #drawBarcode(context, x, y, width, height) {
        context.fillStyle = '#111111';
        context.globalAlpha = 0.8;
        for (let offset = 0; offset < width; offset += 1) {
            const line = (
                offset % 4 < 1
                || this.#isBarcodeStripe(offset, 7, 12, 2)
                || this.#isBarcodeStripe(offset, 15, 8, 3)
                || this.#isBarcodeStripe(offset, 30, 15, 4)
                || this.#isBarcodeStripe(offset, 42, 10, 2)
            );
            if (line) {
                context.fillRect(x + offset, y, 1, height);
            }
        }
        context.globalAlpha = 1;
    }

    #isBarcodeStripe(offset, start, period, barWidth) {
        if (offset < start) {
            return false;
        }
        return (offset - start) % period < barWidth;
    }

    #drawDashedLine(context, x1, y, x2) {
        context.save();
        context.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        context.lineWidth = 1;
        context.setLineDash?.([4, 3]);
        context.beginPath();
        context.moveTo(x1, y);
        context.lineTo(x2, y);
        context.stroke();
        context.restore();
    }

    #drawSolidLine(context, x1, y, x2) {
        context.save();
        context.strokeStyle = '#111111';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x1, y);
        context.lineTo(x2, y);
        context.stroke();
        context.restore();
    }

    #cleanText(value = '') {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }
}

export default GameEndReceiptShareImagePainter;
