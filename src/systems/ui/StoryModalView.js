import { UIComponents } from './UIComponents.js';

class StoryModalView {
    constructor({ document, gameDataRepository, operationBinder }) {
        this.document = document;
        this.gameDataRepository = gameDataRepository;
        this.operationBinder = operationBinder;
        this.overlay = this.document.querySelector('#story-overlay');
        this.currentStoryId = null;
    }

    show(storyId) {
        this.currentStoryId = storyId;
        const overlay = this.#getOverlay();
        overlay.innerHTML = UIComponents.generateStoryModalHTML(storyId, this.gameDataRepository);
        overlay.hidden = false;
        overlay.classList.remove('state-hidden');
        this.#bindClose();
    }

    refreshLanguage() {
        if (!this.currentStoryId) {
            return;
        }

        const overlay = this.#getOverlay();
        if (overlay.hidden) {
            return;
        }

        overlay.innerHTML = UIComponents.generateStoryModalHTML(this.currentStoryId, this.gameDataRepository);
        this.#bindClose();
    }

    #bindClose() {
        const closeButton = this.#requiredElement('#story-modal-close');
        this.operationBinder(closeButton, () => {
            this.currentStoryId = null;
            const overlay = this.#getOverlay();
            overlay.innerHTML = '';
            overlay.hidden = true;
            overlay.classList.add('state-hidden');
        });
    }

    #requiredElement(selector) {
        const element = this.#getOverlay().querySelector(selector);
        if (!element) {
            throw new Error(`[StoryModalView] Required story element not found: ${selector}`);
        }
        return element;
    }

    #getOverlay() {
        if (!this.overlay) {
            this.overlay = this.document.createElement('div');
            this.overlay.id = 'story-overlay';
            this.overlay.className = 'theme-neon state-hidden FlexCenter';
            this.overlay.hidden = true;
            this.document.body.append(this.overlay);
        }
        return this.overlay;
    }
}

export default StoryModalView;
