import StackedItem from '../entities/StackedItem.js';
import { UIComponents } from './UIComponents.js';

class StarInfoPanel {
    constructor({ document }) {
        this.document = document;
        this.panel = this.document.querySelector('#star-info-panel');
        this.title = this.document.querySelector('#star-info-title');
        this.list = this.document.querySelector('#star-info-list');
        this.currentBody = null;
        this.currentItemCount = 0;
        this.currentMessageKey = null;
        this.currentMessageTitle = null;
        this.currentMessageBody = null;
        this.currentPoint = null;
        this.currentCanvas = null;
    }

    show(body, point, canvas) {
        if (!this.panel || !this.list || !body?.items?.length) {
            this.hide();
            return;
        }

        if (this.currentBody !== body || this.currentItemCount !== body.items.length) {
            this.currentBody = body;
            this.currentItemCount = body.items.length;
            this.#renderBody(body);
        }

        this.#updatePosition(point, canvas);
        this.currentPoint = point;
        this.currentCanvas = canvas;
        this.panel.hidden = false;
        this.panel.classList.remove('state-hidden');
    }

    showMessage({ title, body, key }, point, canvas) {
        if (!this.panel || !this.list) {
            return;
        }

        if (
            this.currentMessageKey !== key
            || this.currentMessageTitle !== title
            || this.currentMessageBody !== body
        ) {
            this.currentBody = null;
            this.currentItemCount = 0;
            this.currentMessageKey = key;
            this.currentMessageTitle = title;
            this.currentMessageBody = body;
            if (this.title) {
                this.title.textContent = title;
            }
            this.list.innerHTML = `<p class="star-info-message">${body}</p>`;
        }

        this.#updatePosition(point, canvas);
        this.currentPoint = point;
        this.currentCanvas = canvas;
        this.panel.hidden = false;
        this.panel.classList.remove('state-hidden');
    }

    refreshCurrent() {
        if (this.currentBody) {
            this.#renderBody(this.currentBody);
        }
        if (this.currentPoint) {
            this.#updatePosition(this.currentPoint, this.currentCanvas);
        }
    }

    hide() {
        this.currentBody = null;
        this.currentItemCount = 0;
        this.currentMessageKey = null;
        this.currentMessageTitle = null;
        this.currentMessageBody = null;
        this.currentPoint = null;
        this.currentCanvas = null;
        if (this.panel) {
            this.panel.hidden = true;
            this.panel.classList.add('state-hidden');
        }
    }

    #renderBody(body) {
        if (this.title) {
            this.title.textContent = body.isHome ? 'STAR CORE STORAGE' : 'STAR ITEMS';
        }

        const stacks = this.#groupItems(body.items);
        const isCompact = stacks.length > 3;

        this.list.innerHTML = stacks
            .map(stack => UIComponents.generateCardHTML(stack.getViewData(), {
                isCompact
            }))
            .join('');
    }

    #groupItems(items) {
        return items.reduce((stacks, item) => {
            for (const stack of stacks) {
                if (stack.push(item)) {
                    return stacks;
                }
            }

            const stack = new StackedItem();
            stack.push(item);
            stacks.push(stack);
            return stacks;
        }, []);
    }

    #updatePosition(point, canvas) {
        const offset = 20;
        const panelWidth = this.panel.offsetWidth || 280;
        const panelHeight = this.panel.offsetHeight || 160;
        const viewWidth = canvas?.width || this.document.documentElement.clientWidth;
        const viewHeight = canvas?.height || this.document.documentElement.clientHeight;

        let left = point.x + offset;
        let top = point.y + offset;

        if (left + panelWidth > viewWidth - offset) {
            left = point.x - panelWidth - offset;
        }
        if (top + panelHeight > viewHeight - offset) {
            top = point.y - panelHeight - offset;
        }

        this.panel.style.left = `${Math.max(offset / 2, left)}px`;
        this.panel.style.top = `${Math.max(offset / 2, top)}px`;
    }
}

export default StarInfoPanel;
