
class App {
    constructor() {
    }

    async run(): Promise<void> {
	let fa = Float32Array.from([ 0, 0.0000001, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.999999, 1 ]);
	console.log(fa);

	let wa = new Uint32Array(fa.buffer);
	for (let i = 0; i <= 12; i += 1) {
		let exp = 0xFF & (wa[i] >> 23);
		let man = 0x7FFFFF & wa[i];

		let es = exp.toString(16).padStart(2, '0');
		let ms = man.toString(16).padStart(6, '0');

		console.log(`${es} ${ms}`);
	}
    }
}

(new App()).run();

