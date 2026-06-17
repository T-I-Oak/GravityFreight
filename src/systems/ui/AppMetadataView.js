class AppMetadataView {
    constructor(options = {}) {
        this.document = options.document || document;
        this.versionDisplay = this.document.querySelector('#version');
        this.copyrightDisplay = this.document.querySelector('.copyright');
    }

    setMetadata(metadata) {
        if (this.versionDisplay && metadata?.version) {
            this.versionDisplay.textContent = `Ver ${metadata.version}`;
        }

        const copyright = metadata?.copyright;
        if (!this.copyrightDisplay || !copyright) {
            return;
        }

        this.copyrightDisplay.textContent = '';
        this.copyrightDisplay.append(
            this.#createText(`© ${copyright.holder} ${copyright.year}`),
            this.#createText(' | '),
            this.#createPortalLink(copyright)
        );
    }

    #createText(value) {
        const element = this.document.createElement('span');
        element.textContent = value;
        return element;
    }

    #createPortalLink(copyright) {
        const link = this.document.createElement('a');
        link.href = copyright.portalUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = copyright.portal;
        return link;
    }
}

export default AppMetadataView;
