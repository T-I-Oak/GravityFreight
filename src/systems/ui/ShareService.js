class ShareService {
    constructor({
        navigatorRef = globalThis.navigator,
        windowRef = globalThis,
        FileCtor = globalThis.File,
        ClipboardItemCtor = globalThis.ClipboardItem,
        documentRef = globalThis.document,
        xIntentBaseUrl = 'https://twitter.com/intent/tweet'
    } = {}) {
        this.navigator = navigatorRef;
        this.window = windowRef;
        this.FileCtor = FileCtor;
        this.ClipboardItemCtor = ClipboardItemCtor;
        this.document = documentRef;
        this.xIntentBaseUrl = xIntentBaseUrl;
    }

    async shareImage({ blob, fileName = 'gravity-freight.png', title = 'Gravity Freight', text = '' }) {
        if (!blob) {
            throw new Error('[ShareService] blob is required.');
        }

        const file = this.#createFile(blob, fileName);
        if (!this.#isDesktop() && file && this.navigator?.canShare?.({ files: [file] })) {
            await this.navigator.share({ files: [file], title, text });
            return { mode: 'file-share' };
        }

        if (this.#canWriteClipboard()) {
            await this.navigator.clipboard.write([
                new this.ClipboardItemCtor({ [blob.type || 'image/png']: blob })
            ]);
            if (this.#showShareConfirm(text)) {
                return { mode: 'clipboard-confirm' };
            }
            this.#openXIntent(text);
            return { mode: 'clipboard-intent' };
        }

        this.#openXIntent(text);
        return { mode: 'intent' };
    }

    #createFile(blob, fileName) {
        if (!this.FileCtor) {
            return null;
        }
        return new this.FileCtor([blob], fileName, { type: blob.type || 'image/png' });
    }

    #isDesktop() {
        const agent = this.navigator?.userAgent || '';
        return /Windows|Macintosh|Linux/i.test(agent) && !/Android/i.test(agent);
    }

    #canWriteClipboard() {
        return !!(this.navigator?.clipboard?.write && this.ClipboardItemCtor);
    }

    #showShareConfirm(text) {
        const overlay = this.document?.querySelector?.('#share-confirm-overlay');
        const xButton = this.document?.querySelector?.('#share-confirm-x-btn');
        const closeButton = this.document?.querySelector?.('#share-confirm-close-btn');
        if (!overlay || !xButton || !closeButton) {
            return false;
        }

        overlay.hidden = false;
        overlay.classList.remove('state-hidden');
        const nextXButton = xButton.cloneNode(true);
        const nextCloseButton = closeButton.cloneNode(true);
        xButton.replaceWith(nextXButton);
        closeButton.replaceWith(nextCloseButton);
        nextXButton.addEventListener('click', () => {
            this.#openXIntent(text);
            this.#hideShareConfirm(overlay);
        });
        nextCloseButton.addEventListener('click', () => this.#hideShareConfirm(overlay));
        return true;
    }

    #hideShareConfirm(overlay) {
        overlay.hidden = true;
        overlay.classList.add('state-hidden');
    }

    #openXIntent(text) {
        const url = `${this.xIntentBaseUrl}?text=${encodeURIComponent(text)}`;
        this.window?.open?.(url, '_blank');
    }
}

export default ShareService;
