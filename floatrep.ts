
const b64codes = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/';

class App {
    constructor() {
    }

    static ftob64(f: number): string {
	if (f >= 1) return '#';
	const b = Math.floor(8388608 * f);

	let r = b64codes.charAt(0x3F & (b >> 18)) +
		b64codes.charAt(0x3F & (b >> 12)) +
		b64codes.charAt(0x3F & (b >> 6)) +
		b64codes.charAt(0x3F & b);

	for (let i = 0; i < 3; i += 1) {
		if ('0' !== r.charAt(i)) return r.substr(i);
	}
	return r.charAt(3);
    }

    static b64tof(s: string): number {
	function ctov(c: number): number {
		if (47 === c) return 63;	// "/"
		if (43 === c) return 62;	// "+"
		if (c >= 97) return c - 61;	// "a".."z"
		if (c >= 65) return c - 55;	// "A".."Z"
		return c - 48;			// "0".."9"
	}
	if ('#' === s) return 1.0;

	let r = 0;
	for (let i = 0; i < s.length; i += 1) {
		r *= 64;
		r += ctov(s.charCodeAt(i));
	}
	return r / 8388608;
    }

    async run(): Promise<void> {
	let start, end, seconds;

	let fa = Float32Array.from([ 0, 0.0000001, 0.0000002, 0.0000003, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.999999, 1 ]);
	for (let i = 0; i < fa.length; i += 1) { fa[i] += 1.0; }
	let wa = new Uint32Array(fa.buffer);
/*
	for (let i = 0; i < fa.length; i += 1) {

		let exp = 0xFF & (wa[i] >> 23);
		let man = 0x7FFFFF & wa[i];
		let es = exp.toString(16).padStart(2, '0');
		let ms = man.toString(16).padStart(6, '0');
		console.log(`${es} ${ms}`);
	}

	let current = 0, previous = 0;
	for (let i = 1; i < 8388608; i += 1) {
		current += 1 / 8388608;
		if (current === previous) {
			console.log(`error: ${current} ${previous}`);
		}
		previous = current;
	}

	start = (new Date()).valueOf();
	for (let j = 0; j < 1000; j += 1) {
		for (let i = 1; i < 8388608; i += 1) {
			// wa[0] = 0x3F800000 | i;
			// let v = fa[0] - 1.0;

			let v = i / 8388608;
		}
	}
	end = (new Date()).valueOf();
	seconds = (end - start) / 1000;
	console.log(`${seconds} seconds`);
*/
	start = (new Date()).valueOf();
	for (let j = 0; j < 10; j += 1) {
		for (let i = 0; i <= 8388608; i += 1) {
			let v = i / 8388608;
			let r = ftob64(v);
			let v2 = b64tof(r);

			if (v !== v2) {
				throw new Error('conversion failure');
			}
		}
	}
	end = (new Date()).valueOf();
	seconds = (end - start) / 1000;
	console.log(`${seconds} seconds`);
    }

    ftob64(f: number): string {
	if (f >= 1) return '#';
	const b = Math.floor(8388608 * f);

	let r = b64codes.charAt(0x3F & (b >> 18)) +
		b64codes.charAt(0x3F & (b >> 12)) +
		b64codes.charAt(0x3F & (b >> 6)) +
		b64codes.charAt(0x3F & b);

	for (let i = 0; i < 3; i += 1) {
		if ('0' !== r.charAt(i)) return r.substr(i);
	}
	return r.charAt(3);
    }

    b64tof(s: string): number {
	function ctov(c: number): number {
		if (47 === c) return 63;	// "/"
		if (43 === c) return 62;	// "+"
		if (c >= 97) return c - 61;	// "a".."z"
		if (c >= 65) return c - 55;	// "A".."Z"
		return c - 48;			// "0".."9"
	}
	if ('#' === s) return 1.0;

	let r = 0;
	for (let i = 0; i < s.length; i += 1) {
		r *= 64;
		r += ctov(s.charCodeAt(i));
	}
	return r / 8388608;
    }
}

(new App()).run();

