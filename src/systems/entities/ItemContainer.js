import StackedItem from './StackedItem.js';

class ItemContainer {
    constructor() {
        this.stacks = [];
    }

    addItem(item) {
        const existingStack = this.stacks.find(stack => stack.push(item));
        if (existingStack) {
            return;
        }

        const stack = new StackedItem();
        stack.push(item);
        this.stacks.push(stack);
    }

    getItemsByCategory(category) {
        return this.stacks.filter(stack => stack.representative?.category === category);
    }

    hasItem(item) {
        return this.stacks.some(stack => stack.items.includes(item));
    }

    removeItem(item) {
        const stackIndex = this.stacks.findIndex(stack => stack.items.includes(item));
        if (stackIndex < 0) {
            return null;
        }

        const stack = this.stacks[stackIndex];
        const removed = stack.remove(item);
        if (stack.count === 0) {
            this.stacks.splice(stackIndex, 1);
        }
        return removed;
    }

    popItemByUid(stackUid) {
        const stackIndex = this.stacks.findIndex(stack => stack.uid === stackUid);
        if (stackIndex < 0) {
            return null;
        }

        const stack = this.stacks[stackIndex];
        const item = stack.pop();
        if (stack.count === 0) {
            this.stacks.splice(stackIndex, 1);
        }
        return item;
    }
}

export default ItemContainer;
