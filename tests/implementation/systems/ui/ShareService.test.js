import { describe, expect, it, vi } from 'vitest';
import ShareService from '../../../../src/systems/ui/ShareService.js';

describe('ShareService', () => {
    it('shares an image file through the native share API when available', async () => {
        const share = vi.fn(() => Promise.resolve());
        const fileInstances = [];
        class TestFile {
            constructor(parts, name, options) {
                this.parts = parts;
                this.name = name;
                this.type = options.type;
                fileInstances.push(this);
            }
        }
        const service = new ShareService({
            navigatorRef: {
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
                share,
                canShare: vi.fn(() => true)
            },
            FileCtor: TestFile
        });
        const blob = new Blob(['image'], { type: 'image/png' });

        await expect(service.shareImage({
            blob,
            fileName: 'result.png',
            title: 'Title',
            text: 'Text'
        })).resolves.toEqual({ mode: 'file-share' });

        expect(fileInstances[0].name).toBe('result.png');
        expect(share).toHaveBeenCalledWith({
            files: fileInstances,
            title: 'Title',
            text: 'Text'
        });
    });

    it('copies the image and opens the X intent when file share is unavailable without a confirm overlay', async () => {
        const write = vi.fn(() => Promise.resolve());
        const open = vi.fn();
        class TestClipboardItem {
            constructor(items) {
                this.items = items;
            }
        }
        const service = new ShareService({
            navigatorRef: {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                clipboard: { write }
            },
            ClipboardItemCtor: TestClipboardItem,
            windowRef: { open }
        });
        const blob = new Blob(['image'], { type: 'image/png' });

        await expect(service.shareImage({ blob, text: 'Share Text' })).resolves.toEqual({ mode: 'clipboard-intent' });

        expect(write).toHaveBeenCalledTimes(1);
        expect(write.mock.calls[0][0][0].items['image/png']).toBe(blob);
        expect(open).toHaveBeenCalledWith(
            'https://twitter.com/intent/tweet?text=Share%20Text',
            '_blank'
        );
    });

    it('shows the desktop clipboard confirmation overlay before opening X', async () => {
        const write = vi.fn(() => Promise.resolve());
        const open = vi.fn();
        const documentRef = document.implementation.createHTMLDocument();
        documentRef.body.innerHTML = `
            <div id="share-confirm-overlay" class="state-hidden" hidden>
                <button id="share-confirm-x-btn"></button>
                <button id="share-confirm-close-btn"></button>
            </div>
        `;
        class TestClipboardItem {
            constructor(items) {
                this.items = items;
            }
        }
        const service = new ShareService({
            navigatorRef: {
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                clipboard: { write }
            },
            windowRef: { open },
            ClipboardItemCtor: TestClipboardItem,
            documentRef
        });

        await expect(service.shareImage({
            blob: new Blob(['image'], { type: 'image/png' }),
            text: 'Share Text'
        })).resolves.toEqual({ mode: 'clipboard-confirm' });

        const overlay = documentRef.querySelector('#share-confirm-overlay');
        expect(overlay.hidden).toBe(false);
        expect(overlay.classList.contains('state-hidden')).toBe(false);

        documentRef.querySelector('#share-confirm-x-btn').click();

        expect(open).toHaveBeenCalledWith(
            'https://twitter.com/intent/tweet?text=Share%20Text',
            '_blank'
        );
        expect(overlay.hidden).toBe(true);
    });

    it('opens the X intent when native share and clipboard are unavailable', async () => {
        const open = vi.fn();
        const service = new ShareService({
            navigatorRef: {},
            windowRef: { open }
        });

        await expect(service.shareImage({
            blob: new Blob(['image'], { type: 'image/png' }),
            text: 'Share Text'
        })).resolves.toEqual({ mode: 'intent' });

        expect(open).toHaveBeenCalledWith(
            'https://twitter.com/intent/tweet?text=Share%20Text',
            '_blank'
        );
    });
});
