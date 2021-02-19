
export type GenericListener = () => void;
export type WatchableCallback = (w: Watchable) => void;
export type WatchList = Watchable[];

// eslint-disable-next-line @typescript-eslint/ban-types
export class ListenerList<T extends () => void> {
    private listName?: string;
    private nextId = 0;
    private listeners: Record<string, T> = {};

    constructor(name?: string) {
        this.listName = name;
    }

    /* eslint-disable @typescript-eslint/explicit-module-boundary-types */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    add(callback: T, arg?: unknown): number {
        /* eslint-enable @typescript-eslint/explicit-module-boundary-types */
        this.nextId += 1;
        const sid = this.nextId.toString(10);
        // console.log(`    added ${this.listName} listener (${sid})`);

        if (arg) {
            this.listeners[sid] = callback.bind(null, arg);
        } else {
            this.listeners[sid] = callback;
        }
        return this.nextId;
    }

    remove(nid: number): void {
        // console.log(`    removed ${this.listName} listener (${nid})`);
        const sid = nid.toString(10);
        delete this.listeners[sid];
    }

    listenerCount(): number { return Object.keys(this.listeners).length; }

    notifyAll(): void {
        for (const cb of Object.values(this.listeners)) { cb(); }
    }
}

export class Watchable {
    protected name: string;
    protected callbacks: ListenerList<WatchableCallback>;

    constructor(name?: string) {
        this.name = name ?? '';
        this.callbacks = new ListenerList<WatchableCallback>(`${this.name}`);
    }

    addChangeListener(callback: QbCallback): number {
        return this._callbacks.add(callback, this);
    }

    removeChangeListener(index: number): void {
        this._callbacks.remove(index);
    }
}

