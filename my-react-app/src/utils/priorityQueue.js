export class PriorityQueue {
    constructor() {
        this.queue = []
        this.order = 0;
    }

    enqueue(item, priority) {
        this.queue.push({
            item,
            priority,
            insertionOrder: this.order++
        })
    }

    getIndex() {
        if (this.queue.length === 0) return -1

        return this.queue.reduce(function (maxIdx, el, idx, arr) {
            const current = arr[maxIdx];
            if (el.priority > current.priority) return idx
            if (el.priority < current.priority) return maxIdx
            if (el.insertionOrder < current.insertionOrder) return idx
            return maxIdx
        }, 0)
    }

    dequeue() {
        const idx = this.getIndex()
        if (idx === -1) return null
        const [removed] = this.queue.splice(idx, 1)
        return removed.item
    }
}

