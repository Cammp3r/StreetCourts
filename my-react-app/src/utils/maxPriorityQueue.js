export class MaxPriorityQueue {
  constructor() {
    this.heap = [];
    this.sequence = 0;
  }

  size() {
    return this.heap.length;
  }

  enqueue(item, priority) {
    const node = {
      item,
      priority: Number(priority) || 0,
      sequence: this.sequence,
    };

    this.sequence += 1;
    this.heap.push(node);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop().item;

    const top = this.heap[0];
    this.heap[0] = this.heap.pop();
    this.bubbleDown(0);
    return top.item;
  }

  isHigherPriority(a, b) {
    if (a.priority !== b.priority) return a.priority > b.priority;
    return a.sequence < b.sequence;
  }

  bubbleUp(index) {
    let currentIndex = index;

    while (currentIndex > 0) {
      const parentIndex = Math.floor((currentIndex - 1) / 2);
      const currentNode = this.heap[currentIndex];
      const parentNode = this.heap[parentIndex];

      if (!this.isHigherPriority(currentNode, parentNode)) break;

      this.heap[currentIndex] = parentNode;
      this.heap[parentIndex] = currentNode;
      currentIndex = parentIndex;
    }
  }

  bubbleDown(index) {
    let currentIndex = index;
    const length = this.heap.length;

    while (true) {
      const leftIndex = currentIndex * 2 + 1;
      const rightIndex = currentIndex * 2 + 2;
      let highestIndex = currentIndex;

      if (
        leftIndex < length &&
        this.isHigherPriority(this.heap[leftIndex], this.heap[highestIndex])
      ) {
        highestIndex = leftIndex;
      }

      if (
        rightIndex < length &&
        this.isHigherPriority(this.heap[rightIndex], this.heap[highestIndex])
      ) {
        highestIndex = rightIndex;
      }

      if (highestIndex === currentIndex) break;

      const temp = this.heap[currentIndex];
      this.heap[currentIndex] = this.heap[highestIndex];
      this.heap[highestIndex] = temp;
      currentIndex = highestIndex;
    }
  }
}
