
import { zlib, unzlib } from 'https://deno.land/x/denoflate/mod.ts';
import { BufReader } from 'https://deno.land/std/io/bufio.ts';

import { Image2d, Image2dOrNull } from './image2d.ts';

export const TypeId: Record<string, number> = {
	IHDR:	0x49484452,
	PLTE:	0x504C5445,
	IDAT:	0x49444154,
	IEND:	0x49454E44,
	tRNS:	0x74524E53,
	cHRM:	0x6348524D,
	gAMA:	0x67414D41,
	iCCP:	0x69434350,
	sBIT:	0x73424954,
	sRGB:	0x73524742,
	tEXt:	0x74455874,
	zTXt:	0x7a545874,
	iTXt:	0x69545874,
	bKGD:	0x624B4744,
	hIST:	0x68495354,
	pHYs:	0x70485973,
	sPLT:	0x73504C54,
	tIME:	0x74494D45,
	dSIG:	0x64534947,
	eXIf:	0x65584966,
	sTER:	0x73544552
}

export function isCritical(id: number) { return (0 === (id & 0x20000000)); }
export function isAncillary(id: number) { return (0 !== (id & 0x20000000)); }
export function isPublic(id: number) { return (0 === (id & 0x00200000)); }
export function isCopySafe(id: number) { return (0 !== (id & 0x00000020)); }

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

	toBytes(): Uint8Array {
		throw new Error('toBytes() must be implemented in subclass');
	}

	static fromBytes(d: Uint8Array): BaseChunk {
		throw new Error('fromBytes() must be implemented in subclass');
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

	toBytes(): Uint8Array {
		const result = new Uint8Array(12);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): HeaderChunk {
		const width = (d[0] << 24) + (d[1] << 16) + (d[2] << 8) + d[3];
		const height = (d[4] << 24) + (d[4] << 16) + (d[6] << 8) + d[7];
		return new HeaderChunk(TypeId.IHDR, d, width, height, d[8], d[9], d[10], d[11], d[12]);
	}
}

export class PaletteChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): PaletteChunk {
		return new PaletteChunk(TypeId.PLTE, d);
	}
}

export class ImageDataChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): ImageDataChunk {
		return new ImageDataChunk(TypeId.IDAT, d);
	}
}

export class EndChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): EndChunk {
		return new EndChunk(TypeId.IEND, d);
	}
}

export class TransparencyChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): TransparencyChunk {
		return new TransparencyChunk(TypeId.tRNS, d);
	}
}

export class ChromaticityChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): ChromaticityChunk {
		return new ChromaticityChunk(TypeId.cHRM, d);
	}
}

export class GammaChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): GammaChunk {
		return new GammaChunk(TypeId.gAMA, d);
	}
}

export class ICCPChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): ICCPChunk {
		return new ICCPChunk(TypeId.iCCP, d);
	}
}

export class BitDepthChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): BitDepthChunk {
		return new BitDepthChunk(TypeId.sBIT, d);
	}
}

export class SRGBChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): SRGBChunk {
		return new SRGBChunk(TypeId.sRGB, d);
	}
}

export class TextChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): TextChunk {
		return new TextChunk(TypeId.tEXt, d);
	}
}

export class ZTextChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): ZTextChunk {
		return new ZTextChunk(TypeId.zTXt, d);
	}
}

export class ITextChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): ITextChunk {
		return new ITextChunk(TypeId.iTXt, d);
	}
}

export class BackgroundChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): BackgroundChunk {
		return new BackgroundChunk(TypeId.bKGD, d);
	}
}

export class HistogramChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): HistogramChunk {
		return new HistogramChunk(TypeId.hIST, d);
	}
}

export class PhysicalSizeChunk extends BaseChunk {
	constructor(t: number,
			d: Uint8Array) {
		super(t, d);
	}

	toBytes(): Uint8Array {
		const result = new Uint8Array(4);
		// TODO
		return result;
	}

	static fromBytes(d: Uint8Array): PhysicalSizeChunk {
		return new PhysicalSizeChunk(TypeId.pHYs, d);
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

export class PNGStream {
	private reader: BufReader;
	private partial: any = null;

	constructor(r: BufReader) {
		this.reader = r;
	}

	async open(): Promise<void> {
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

	decode(cin: Chunk): BaseChunk {
		switch (cin.type) {
		case TypeId.IHDR:
			return HeaderChunk.fromBytes(cin.data);
		case TypeId.PLTE:
			return PaletteChunk.fromBytes(cin.data);
		case TypeId.IDAT:
			return ImageDataChunk.fromBytes(cin.data);
		case TypeId.IEND:
			return EndChunk.fromBytes(cin.data);
		case TypeId.tRNS:
			return TransparencyChunk.fromBytes(cin.data);
		case TypeId.cHRM:
			return ChromaticityChunk.fromBytes(cin.data);
		case TypeId.gAMA:
			return GammaChunk.fromBytes(cin.data);
		case TypeId.iCCP:
			return ICCPChunk.fromBytes(cin.data);
		case TypeId.sBIT:
			return BitDepthChunk.fromBytes(cin.data);
		case TypeId.sRGB:
			return SRGBChunk.fromBytes(cin.data);
		case TypeId.tEXt:
			return TextChunk.fromBytes(cin.data);
		case TypeId.zTXt:
			return ZTextChunk.fromBytes(cin.data);
		case TypeId.iTXt:
			return ITextChunk.fromBytes(cin.data);
		case TypeId.bKGD:
			return BackgroundChunk.fromBytes(cin.data);
		case TypeId.hIST:
			return HistogramChunk.fromBytes(cin.data);
		case TypeId.pHYs:
			return PhysicalSizeChunk.fromBytes(cin.data);
		case TypeId.sPLT:
			return ExtendedPalletteChunk.fromBytes(cin.data);
		case TypeId.tIME:
			return TimeChunk.fromBytes(cin.data);
		case TypeId.dSIG:
			return SignatureChunk.fromBytes(cin.data);
		case TypeId.eXIf:
			return ExifChunk.fromBytes(cin.data);
		case TypeId.sTER:
			return StereoChunk.fromBytes(cin.data);
		}
		throw new Error(`unknown chunk type ${cin.type.toString(16)}`);
	}

	async *chunks(): AsyncGenerator<BaseChunk> {
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

	static async imageFromFile(name: string): Promise<Image2dOrNull> {
		let ins = new BufReader(await Deno.open(name));
		let png = new PNGStream(ins);
		await png.open();

		let result: Image2dOrNull = null;
		for await (const chunk of png.chunks()) {
			console.log(chunk.toString());

			if (TypeId.IHDR === chunk.type) {
				const h = chunk as HeaderChunk;
				result = new Image2d(h.width, h.height);
			}
		}
		return result;
	}
}

/*

function fail(location: number): Error {
	return new Error(`Test failure ${location}`);
}

class Tester {
	constructor() {
	}

	async test1(): Promise<boolean> {
		let fail = false;

		Object.keys(TypeId).forEach((name) => {
			let val = TypeId[name];
			let str = typeName(val);

			if (name !== str) fail = true;
			console.log(`${name} ${str}`);
		});
		return !fail;
	}

	async run(): Promise<void> {
		if (! await this.test1()) throw fail(1);
	}
}

(new Tester()).run().then(() => {
	console.log('Tests passed.');
}).catch((e) => { console.error(e); });

/**/

