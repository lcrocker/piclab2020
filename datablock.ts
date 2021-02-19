
// import EventEmitter from 'https://deno.land/x/event_emitter/mod.ts';

export type DbProcess = (DataBlock) => boolean;

export class DataBlock extends EventEmitter {
	public data: Uint8Array;

	constructor(a: Uint8Array | number) {
		super();
		if (a instanceof Uint8Array) this.data = a;
		else this.data = new Uint8Array(a as number);
	}

	build(p: DbProcess): Promise<boolean> {
		return new Promise((resolve) => {
			const r = p(this);
			resolve(r);
		});
	}
}

