export class Stack<T> {
    private storage: T[] = [];

    public push(item: T) {
        this.storage.push(item);
    }

    public pop() {
        return this.storage.pop();
    }

    public peek() {
        return this.storage[this.size() - 1];
    }

    public size() {
        return this.storage.length;
    }

    public isEmpty() {
        return this.storage.length === 0;
    }

    public clear() {
        this.storage = [];
    }
}
