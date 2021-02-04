
import { zlib, unzlib } from 'https://deno.land/x/denoflate/mod.ts';
import { BufReader } from 'https://deno.land/std/io/bufio.ts';

export const TypeId = {
	IHDR:	0x49484452,
	IDAT:	0x49444154,
	IEND:	0x49454E44
}

export const enum ColorType {
	Gray = 0,
	Color = 2,
	Indexed = 3,
	GrayAlpha = 4,
	ColorAlpha = 6
};
function isColorType(n: number): boolean {
	return (0 === n || 2 === n || 3 === n || 4 === n || 6 === n);
}
const colorTypeIndicators = [ 'GS', '??', 'TC', 'IN', 'GA', '??', 'CA' ];

export const enum CompressionMethod {
	Deflate = 0
}
function isCompressionMethod(n: number): boolean { return 0 === n; }
const compressionMethodIndicators = [ 'Z' ];

export const enum FilterMethod {
	ByLine = 0
}
function isFilterMethod(n: number): boolean { return 0 === n; }
const filterMethodIndicators = [ 'L' ];

export const enum InterlaceMethod {
	None = 0,
	Adam7 = 1
}
function isInterlaceMethod(n: number): boolean { return (0 === n || 1 === n); }
const interlaceMethodIndicators = [ 'N', '7' ];

export interface Chunk {
	type: number;
	data: Uint8Array;
}

export class BaseChunk implements Chunk {
	public type: number;
	public data: Uint8Array;

	constructor(t: number, d: Uint8Array) {
		this.type = t;
		this.data = d;
	}

	toString(): string {
		return `${typeName(this.type)} (${this.data.length} bytes)`;
	}
}

export class HeaderChunk extends BaseChunk {
	public width: number;
	public height: number;
	public bitDepth: number;
	public colorType: ColorType;
	public compressionMethod: CompressionMethod;
	public filterMethod: FilterMethod;
	public interlaceMethod: InterlaceMethod;

	constructor(	t: number,
			d: Uint8Array,
			w: number,
			h: number,
			b: number,
			c: number,
			z: number,
			f: number,
			i: number) {
		super(t, d);
		this.width = w;
		this.height = h;
		this.bitDepth = b;

		if (! isColorType(c)) throw new TypeError(`${c} is not a known color type`);
		if (! isCompressionMethod(z)) throw new TypeError(`${z} is not a known compression method`);
		if (! isFilterMethod(z)) throw new TypeError(`${f} is not a known filter method`);
		if (! isInterlaceMethod(i)) throw new TypeError(`${i} is not a known interlace method`);

		this.colorType = c as ColorType;
		this.compressionMethod = z as CompressionMethod;
		this.filterMethod = f as FilterMethod;
		this.interlaceMethod = i as InterlaceMethod;
	}

	toString(): string {
		return `IHDR (${this.width} x ${this.height} x ${this.bitDepth} ${colorTypeIndicators[this.colorType]} ${compressionMethodIndicators[this.compressionMethod]} ${filterMethodIndicators[this.filterMethod]} ${interlaceMethodIndicators[this.interlaceMethod]})`;
	}
}

export function isChunk(obj: any): obj is Chunk {
    if ('number' !== typeof obj.type) return false;
    if (! obj.data) return false;
    if (! (obj.data instanceof Uint8Array)) return false;
    return true;
}

export function typeName(id: number) {
	return String.fromCharCode(0xFF & (id >> 24)) +
		String.fromCharCode(0xFF & (id >> 16)) +
		String.fromCharCode(0xFF & (id >> 8)) +
		String.fromCharCode(0xFF & id);
}

export class InputStream {
	private reader: BufReader | null = null;
	private partial: any = null;

	constructor() {
	}

	async open(r: BufReader): Promise<void> {
		this.reader = r;
		const h1 = await this.readUint32();
		const h2 = await this.readUint32();
		if (! (0x89504E47 === h1 && 0x0D0A1A0A === h2))
			throw new Error('not a PNG file');
	}

	async readUint32(): Promise<number> {
		if (null === this.reader)
			throw new Error(`no open reader`);
	    const b3 = await this.reader.readByte();
	    const b2 = await this.reader.readByte();
	    const b1 = await this.reader.readByte();
	    const b0 = await this.reader.readByte();
	    if (null === b3 || null === b2 || null === b1 || null === b0)
		throw new Error(`read error`);

	    let v = (b3 << 24) + (b2 << 16) + (b1 << 8) + b0;
	    if (v < 0) v += 0x100000000;
	    return v;
	}

	async nextChunk(): Promise<Chunk> {
		if (null === this.reader)
			throw new Error(`no open reader`);

	    const size = await this.readUint32();
	    const type = await this.readUint32();
	    const data = new Uint8Array(size);

	    if (0 !== size) { await this.reader.readFull(data); }
	    let crc = await this.readUint32();
	    // TODO: verify crc

	    return new BaseChunk(type, data);
	}

	decode(cin: BaseChunk): Chunk {
		if (TypeId.IHDR === cin.type) {
			const width = (cin.data[0] << 24) + (cin.data[1] << 16) +
				(cin.data[2] << 8) + cin.data[3];
			const height = (cin.data[4] << 24) + (cin.data[4] << 16) +
				(cin.data[6] << 8) + cin.data[7];
			const b = cin.data[8];
			const c = cin.data[9];
			const z = cin.data[10];
			const f = cin.data[11];
			const i = cin.data[12];

			const cout = new HeaderChunk(cin.type, cin.data, width, height, b, c, z, f, i);
			return cout;
		}
		return cin;
	}

	async *chunks(): AsyncGenerator<Chunk> {
	    let type = 0;
	    let partial: Chunk | null = null;

	    do {
		let chunk = await this.nextChunk();
		type = chunk.type;

		if (TypeId.IDAT === chunk.type) {
			if (null === partial) {
				partial = chunk;
			} else {
				let p1 = partial.data;
				partial.data = new Uint8Array(p1.length + chunk.data.length);
				partial.data.set(p1);
				partial.data.set(chunk.data, p1.length);
			}
			continue;
		}
		if (null !== partial && TypeId.IDAT !== chunk.type) {
			partial.data = unzlib(partial.data);
			yield this.decode(partial);
			partial = null;
		}
		yield this.decode(chunk);
	    } while (TypeId.IEND !== type);
	}
}
