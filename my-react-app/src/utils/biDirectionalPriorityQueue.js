export function task4() {class BiDirectionalPriorityQueue {
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
    getIndex(direction) {
        if(this.queue.length === 0) return -1

        if(direction === "highest") {
            return this.queue.reduce(function(maxIdx, el, idx, arr){
                if(el.priority > arr[maxIdx].priority) {
                    return idx
                } else return maxIdx
            }, 0)
            
        } else if(direction === "lowest"){
            return this.queue.reduce(function(minIdx, el, idx, arr){
                if(el.priority < arr[minIdx].priority) {
                    return idx
                } else return minIdx
            }, 0)

        } else if(direction === "oldest") {
            return this.queue.reduce(function(oldIdx, el, idx, arr) {
                if(el.insertionOrder < arr[oldIdx].insertionOrder) {
                    return idx
                } else return oldIdx
            }, 0)

        } else if(direction === "newest") {
            return this.queue.reduce(function(newIdx, el, idx, arr) {
                if(el.insertionOrder > arr[newIdx].insertionOrder) {
                    return idx
                } else return newIdx
            }, 0)

        } else {
            throw new Error(
                `Вибери відомий напрямок черги (highest, lowest, oldest, newest)`
            )
        }
    
}
    peek(direction) {
        const idx = this.getIndex(direction)
        if(idx === -1) return null
        return this.queue[idx].item
    }

    dequeue(direction) {
        const idx = this.getIndex(direction)
        if(idx === -1) return null
        const [removed] = this.queue.splice(idx, 1)
        return removed.item
    }

     toArray() {
    return this.queue.map((el) => ({ item: el.item, priority: el.priority }));
  }


}

const q = new BiDirectionalPriorityQueue()

q.enqueue("Іван", 3);
q.enqueue("Марія", 9);
q.enqueue("Петро", 5);
q.enqueue("Олена", 1);
 
console.log("=== Початкова черга ===");
console.log(q.toArray());
 
console.log("\n=== PEEK ===");
console.log("highest:", q.peek("highest"));
console.log("lowest: ", q.peek("lowest"));
console.log("oldest: ", q.peek("oldest"));
console.log("newest: ", q.peek("newest"));
 
console.log("\n=== DEQUEUE ===");
console.log("highest:", q.dequeue("highest"));
console.log("Черга після:", q.toArray());
 
console.log("lowest: ", q.dequeue("lowest"));
console.log("Черга після:", q.toArray());
 
console.log("oldest: ", q.dequeue("oldest"));
console.log("Черга після:", q.toArray());
 
console.log("newest: ", q.dequeue("newest"));
console.log("Черга після:", q.toArray());

}