
import { zlib, unzlib } from 'https://deno.land/x/denoflate/mod.ts';
import { BufReader } from 'https://deno.land/std/io/bufio.ts';

import { Image2d, ColorSpace, OtherImageData, ImageComponent, ImageComponentType } from './image2d.ts';

const signatureWord1 = 0x89504E47,
    signatureWord2 = 0x0D0A1A0A;

export const TypeId: Record<string, number> = {
    IHDR:   0x49484452,
    PLTE:   0x504C5445,
    IDAT:   0x49444154,
    IEND:   0x49454E44,
    tRNS:   0x74524E53,
    cHRM:   0x6348524D,
    gAMA:   0x67414D41,
    iCCP:   0x69434350,
    sBIT:   0x73424954,
    sRGB:   0x73524742,
    tEXt:   0x74455874,
    zTXt:   0x7a545874,
    iTXt:   0x69545874,
    bKGD:   0x624B4744,
    hIST:   0x68495354,
    pHYs:   0x70485973,
    sPLT:   0x73504C54,
    tIME:   0x74494D45,
    dSIG:   0x64534947,
    eXIf:   0x65584966,
    sTER:   0x73544552
}

export function isCritical(id: number) { return (0 === (id & 0x20000000)); }
export function isAncillary(id: number) { return (0 !== (id & 0x20000000)); }
export function isPublic(id: number) { return (0 === (id & 0x00200000)); }
export function isCopySafe(id: number) { return (0 !== (id & 0x00000020)); }

export function typeName(id: number) {
    return String.fromCharCode(0xFF & (id >> 24)) +
        String.fromCharCode(0xFF & (id >> 16)) +
        String.fromCharCode(0xFF & (id >> 8)) +
        String.fromCharCode(0xFF & id);
}

export const enum ColorType {
    Gray = 0,
    Color = 2,
    Indexed = 3,
    GrayAlpha = 4,
    ColorAlpha = 6
}
function isColorType(n: number): n is ColorType {
    return (0 === n || 2 === n || 3 === n || 4 === n || 6 === n);
}
const colorTypeIndicators = [ 'GS', '??', 'TC', 'IN', 'GA', '??', 'CA' ];

export function samplesPerPixel(c: ColorType): number {
    if (ColorType.Gray === c || ColorType.Indexed === c) return 1;
    if (ColorType.GrayAlpha === c) return 2;
    if (ColorType.Color === c) return 3;
    if (ColorType.ColorAlpha === c) return 4;
    throw new Error('unknown color type');
}

export const enum CompressionMethod {
    Deflate = 0
}
function isCompressionMethod(n: number): n is CompressionMethod { return 0 === n; }
const compressionMethodIndicators = [ 'Z' ];

export const enum FilterMethod {
    ByLine = 0
}
function isFilterMethod(n: number): n is FilterMethod { return 0 === n; }
const filterMethodIndicators = [ 'L' ];

export const enum InterlaceMethod {
    None = 0,
    Adam7 = 1
}
function isInterlaceMethod(n: number): n is InterlaceMethod { return (0 === n || 1 === n); }
const interlaceMethodIndicators = [ 'N', '7' ];

type EightOrSixteen = 8 | 16;
function isEightOrSixteen(n: number): n is EightOrSixteen { return (8 === n || 16 === n); }

export type ImageBitDepth = 1 | 2 | 4 | 8 | 16;
function isImageBitDepth(n: number): n is ImageBitDepth {
    return (1 === n || 2 === n || 4 === n || 8 === n || 16 === n);
}

export const enum DistanceUnit {
    Unknown = 0,
    Meter = 1
}
function isDistanceUnit(n: number): n is DistanceUnit { return (0 === n || 1 === n); }
const distanceUnitIndicators = [ '?', 'm' ];

export interface Chunk {
    type: number;
    data?: Uint8Array;
}
export interface ChunkWithData extends Chunk {
    data: Uint8Array;
}

export function isChunkWithData(obj: Chunk): obj is ChunkWithData {
    const wobj = obj as Partial<ChunkWithData>;
    if ('object' !== typeof wobj.data) return false;
    if (! (wobj.data instanceof Uint8Array)) return false;
    return true;
}

export class BaseChunk implements Chunk {
    public type: number;
    public data?: Uint8Array;

    constructor(t: number, d?: Uint8Array) {
        this.type = t;
        this.data = d;
    }

    toString(): string {
        const len = this.data ? this.data.length : 0;
        return `${typeName(this.type)} (${len} bytes)`;
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
    public bitDepth: ImageBitDepth;
    public colorType: ColorType;
    public compressionMethod: CompressionMethod;
    public filterMethod: FilterMethod;
    public interlaceMethod: InterlaceMethod;

    constructor(
        w: number,
        h: number,
        b: ImageBitDepth,
        c: ColorType,
        z: CompressionMethod,
        f: FilterMethod,
        i: InterlaceMethod) {

        super(TypeId.IHDR);

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
        return `IHDR ${this.width} \u00d7 ${this.height} \u00d7 ${this.bitDepth} ${colorTypeIndicators[this.colorType]} ${compressionMethodIndicators[this.compressionMethod]} ${filterMethodIndicators[this.filterMethod]} ${interlaceMethodIndicators[this.interlaceMethod]}`;
    }

    toBytes(): Uint8Array {
        this.data = new Uint8Array(12);
        const dv = new DataView(this.data.buffer);

        dv.setUint32(0, this.width, false);
        dv.setUint32(0, this.height, false);
        this.data[8] = this.bitDepth;
        this.data[9] = this.colorType;
        this.data[10] = this.compressionMethod;
        this.data[11] = this.filterMethod;
        this.data[12] = this.interlaceMethod;

        return this.data;
    }

    static fromBytes(d: Uint8Array): HeaderChunk {
        const dv = new DataView(d.buffer);
        const width = dv.getUint32(0, false);
        const height = dv.getUint32(4, false);

        if (! isImageBitDepth(d[8])) throw new Error(`Bad bit depth ${d[8]} (1, 2, 4, 8, or 16)`);
        if (! isColorType(d[9])) throw new Error(`Bad color type ${d[9]}`);
        if (! isCompressionMethod(d[10])) throw new Error(`Bad compression method ${d[10]}`);
        if (! isFilterMethod(d[11])) throw new Error(`Bad filter method ${d[11]}`);
        if (! isInterlaceMethod(d[12])) throw new Error(`Bad interlace method ${d[12]}`);

        const result = new HeaderChunk(width, height, d[8], d[9], d[10], d[11], d[12]);
        result.data = d;
        return result;
    }

    bytesPerLine(): number {
        let b = this.width;

        if (16 === this.bitDepth) { b *= 2; }
        else if (4 === this.bitDepth) { b = Math.floor((this.width + 1) / 2); }
        else if (2 === this.bitDepth) { b = Math.floor((this.width + 3) / 4); }
        else if (1 === this.bitDepth) { b = Math.floor((this.width + 7) / 8); }

        if (ColorType.GrayAlpha === this.colorType) { b *= 2; }
        if (ColorType.Color === this.colorType) { b *= 3; }
        if (ColorType.ColorAlpha === this.colorType) { b *= 4; }
        return b + 1;
    }
}

export type PaletteEntry = [ number, number, number ];

export class PaletteChunk extends BaseChunk {
    public colors: PaletteEntry[];

    constructor(
        colors: PaletteEntry[]) {

        super(TypeId.PLTE);
        if (colors.length > 256) throw new Error(`Palette contains ${colors.length} entries (max 256)`);
        this.colors = colors;
    }

    toString(): string { return `PLTE (${this.colors.length} entries)`; }

    toBytes(): Uint8Array {
        const count = this.colors.length;
        this.data = new Uint8Array(3 * count);

        for (let i = 0; i < count; i += 1) {
            this.data[3 * i] = 255 * this.colors[i][0];
            this.data[3 * i + 1] = 255 * this.colors[i][1];
            this.data[3 * i + 2] = 255 * this.colors[i][2];
        }
        return this.data;
    }

    static fromBytes(d: Uint8Array): PaletteChunk {
        const colors: PaletteEntry[] = [];
        const count = d.length / 3;
        if (count !== Math.floor(count)) throw new Error(`Bad palette size ${d.length} (must = 0 mod 3)`);

        for (let i = 0; i < count; i += 1) {
            colors.push([ d[3 * i] / 255, d[3 * i + 1] / 255, d[3 * i + 2] / 255 ]);
        }
        const result = new PaletteChunk(colors);
        result.data = d;
        return result;
    }
}

export class ImageDataChunk extends BaseChunk {
    constructor(
        t: number,
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
    constructor() {
        super(TypeId.IEND);
    }

    toString(): string { return 'IEND'; }

    toBytes(): Uint8Array {
        this.data = new Uint8Array(0);
        return this.data;
    }

    static fromBytes(d: Uint8Array): EndChunk {
        const result = new EndChunk();
        result.data = d;
        return result;
    }
}

export class TransparencyChunk extends BaseChunk {
    constructor(
        t: number,
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
    public whiteX: number;
    public whiteY: number;
    public redX: number;
    public redY: number;
    public greenX: number;
    public greenY: number;
    public blueX: number;
    public blueY: number;

    constructor(
        wx: number, wy: number,
        rx: number, ry: number,
        gx: number, gy: number,
        bx: number, by: number) {

        super(TypeId.cHRM);

        this.whiteX = wx;   this.whiteY = wy;
        this.redX = rx;     this.redY = ry;
        this.greenX = gx;   this.greenY = gy;
        this.blueX = bx;    this.blueY = by;
    }

    toString(): string {
        return `cHRM ${this.whiteX} ${this.whiteY} ${this.redX} ${this.redY} ${this.greenX} ${this.greenY} ${this.blueX} ${this.blueY}`;
    }

    toBytes(): Uint8Array {
        this.data = new Uint8Array(32);
        const dv = new DataView(this.data.buffer);
        dv.setUint32(0, 100000 * this.whiteX, false);
        dv.setUint32(4, 100000 * this.whiteY, false);
        dv.setUint32(8, 100000 * this.redX, false);
        dv.setUint32(12, 100000 * this.redY, false);
        dv.setUint32(16, 100000 * this.greenX, false);
        dv.setUint32(20, 100000 * this.greenY, false);
        dv.setUint32(24, 100000 * this.blueX, false);
        dv.setUint32(28, 100000 * this.blueY, false);
        return this.data;
    }

    static fromBytes(d: Uint8Array): ChromaticityChunk {
        const dv = new DataView(d.buffer);

        const wx = dv.getUint32(0, false) / 100000;
        const wy = dv.getUint32(0, false) / 100000;
        const rx = dv.getUint32(0, false) / 100000;
        const ry = dv.getUint32(0, false) / 100000;
        const gx = dv.getUint32(0, false) / 100000;
        const gy = dv.getUint32(0, false) / 100000;
        const bx = dv.getUint32(0, false) / 100000;
        const by = dv.getUint32(0, false) / 100000;

        const result = new ChromaticityChunk(wx, wy, rx, ry, gx, gy, bx, by);
        result.data = d;
        return result;
    }
}

export class GammaChunk extends BaseChunk {
    public value: number;

    constructor(
        v: number) {

        super(TypeId.gAMA);
        this.value = v;
    }

    toString(): string { return `gAMA ${this.value}`; }

    toBytes(): Uint8Array {
        this.data = new Uint8Array(4);
        const dv = new DataView(this.data.buffer);
        dv.setUint32(0, 100000 * this.value, false);
        return this.data;
    }

    static fromBytes(d: Uint8Array): GammaChunk {
        const dv = new DataView(d.buffer);
        const v = dv.getUint32(0, false);

        const result = new GammaChunk(v / 100000);
        result.data = d;
        return result;
    }
}

export class ICCPChunk extends BaseChunk {
    constructor(
        t: number,
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
    public depths: ImageBitDepth[];

    constructor(
        d: ImageBitDepth[]) {

        super(TypeId.sBIT);
        this.depths = d;
    }

    toString(): string { return `sBIT ${this.depths}`; }

    toBytes(): Uint8Array {
        this.data = new Uint8Array(this.depths.length);
        for (let i = 0; i < this.depths.length; i += 0) {
            this.data[i] = this.depths[i];
        }
        return this.data;
    }

    static fromBytes(d: Uint8Array): BitDepthChunk {
        const depths: ImageBitDepth[] = [];
        for (let i = 0; i < d.length; i += 1) {
            const b = d[i];
            if (! isImageBitDepth(b)) throw new Error(`Invalid bit depth ${b}`);
            depths.push(b);
        }
        const result = new BitDepthChunk(depths);
        result.data = d;
        return result;
    }
}

export class SRGBChunk extends BaseChunk {
    constructor(
        t: number,
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
    constructor(
        t: number,
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
    constructor(
        t: number,
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
    constructor(
        t: number,
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
    constructor(
        t: number,
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
    constructor(
        t: number,
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
    public x: number;
    public y: number;
    public unit: DistanceUnit;

    constructor(
        x: number,
        y: number,
        u: DistanceUnit) {

        super(TypeId.pHYs);
        this.x = x;
        this.y = y;
        this.unit = u;
    }

    toString(): string { return `pHYs (${this.x} \u00d7 ${this.y} pixels/${distanceUnitIndicators[this.unit]})`; }

    toBytes(): Uint8Array {
        this.data = new Uint8Array(9);
        const dv = new DataView(this.data.buffer);
        dv.setUint32(0, this.x, false);
        dv.setUint32(4, this.y, false);
        this.data[8] = this.unit;
        return this.data;
    }

    static fromBytes(d: Uint8Array): PhysicalSizeChunk {
        const dv = new DataView(d.buffer);
        const x = dv.getUint32(0, false);
        const y = dv.getUint32(4, false);

        if (! isDistanceUnit(d[8])) throw new Error(`Invalid distance unit ${d[8]}`);
        const u = d[8] as DistanceUnit;

        const result = new PhysicalSizeChunk(x, y, u);
        result.data = d;
        return result;
    }
}

export type SuggestedPaletteEntry = [ number, number, number, number, number ];

export class SuggestedPaletteChunk extends BaseChunk {
    public name: string;
    public bits: EightOrSixteen;
    public entries: SuggestedPaletteEntry[];

    constructor(
        name: string,
        bits: EightOrSixteen,
        entries: SuggestedPaletteEntry[]) {

        if (name.length > 79) throw new Error(`Suggested palette name ${name.length} bytes (79 max)`);

        super(TypeId.sPLT);
        this.name = name;
        this.bits = bits;
        this.entries = entries;
    }

    toString(): string {
        return  `sPLT "${this.name}" (${this.entries.length} entries)`;
    }

    toBytes(): Uint8Array {
        const count = this.entries.length;
        const esize = (8 === this.bits) ? 6 : 10;
        this.data = new Uint8Array(this.name.length + 2 + esize * this.entries.length);

        let index = 0;
        const dv = new DataView(this.data.buffer);

        for (index = 0; index < this.name.length; index += 1) {
            let c = this.name.charCodeAt(index);
            if (c > 255) c = '?'.charCodeAt(0);       // Not valid ISO-8859-1
            this.data[index] = c;
        }
        this.data[index] = 0;
        this.data[index + 1] = this.bits;
        index += 2;

        for (let i = 0; i < count; i += 1) {
            if (8 === this.bits) {
                this.data[index] = 255 * this.entries[i][0];
                this.data[index + 1] = 255 * this.entries[i][1];
                this.data[index + 2] = 255 * this.entries[i][2];
                this.data[index + 3] = 255 * this.entries[i][3];
                index += 4;
            } else {
                dv.setUint16(index, 65535 * this.entries[i][0], false);
                dv.setUint16(index + 2, 65535 * this.entries[i][1], false);
                dv.setUint16(index + 4, 65535 * this.entries[i][2], false);
                dv.setUint16(index + 6, 65535 * this.entries[i][3], false);
                index += 8;
            }
            dv.setUint16(index, 65535 * this.entries[i][4]);
            index += 2;
        }
        return this.data;
    }

    static fromBytes(d: Uint8Array): SuggestedPaletteChunk {
        const dv = new DataView(d.buffer);
        let index = 0;
        let name = '';

        while (index < 80) {
            if (0 === d[index]) break;
            name += String.fromCharCode(d[index]);
            index += 1;
        }
        const bits = d[index + 1];
        if (! isEightOrSixteen(bits))
            throw Error(`invalid bit depth ${bits} (must be 8 or 16)`);
        index += 2;

        const entries: SuggestedPaletteEntry[] = [];
        const count = (d.length - index) / ((8 === bits) ? 6 : 10);
        if (count !== Math.floor(count))
            throw new Error(`Bad palette size ${d.length} (must = 0 mod ${(8===bits)?6:10})`);

        for (let i = 0; i < count; i += 1) {
            const e: number[] = [];

            if (8 === bits) {
                e.push(d[index] / 255);
                e.push(d[index + 1] / 255);
                e.push(d[index + 2] / 255);
                e.push(d[index + 3] / 255);
                index += 4;
            } else {
                e.push(dv.getUint16(index, false) / 65535);
                e.push(dv.getUint16(index + 2, false) / 65535);
                e.push(dv.getUint16(index + 4, false) / 65535);
                e.push(dv.getUint16(index + 6, false) / 65535);
                index += 8;
            }
            e.push(dv.getUint16(index, false) / 65535);
            index += 2;
            entries.push(e as SuggestedPaletteEntry);
        }
        const result = new SuggestedPaletteChunk(name, bits, entries);
        result.data = d;
        return result;
    }
}

export class TimeChunk extends BaseChunk {
    constructor(
        t: number,
        d: Uint8Array) {

        super(t, d);
    }

    toBytes(): Uint8Array {
        const result = new Uint8Array(4);
        // TODO
        return result;
    }

    static fromBytes(d: Uint8Array): TimeChunk {
        return new TimeChunk(TypeId.tIME, d);
    }
}

export class SignatureChunk extends BaseChunk {
    constructor(
        t: number,
        d: Uint8Array) {

        super(t, d);
    }

    toBytes(): Uint8Array {
        const result = new Uint8Array(4);
        // TODO
        return result;
    }

    static fromBytes(d: Uint8Array): SignatureChunk {
        return new SignatureChunk(TypeId.dSIG, d);
    }
}

export class ExifChunk extends BaseChunk {
    constructor(
        t: number,
        d: Uint8Array) {

        super(t, d);
    }

    toBytes(): Uint8Array {
        const result = new Uint8Array(4);
        // TODO
        return result;
    }

    static fromBytes(d: Uint8Array): ExifChunk {
        return new ExifChunk(TypeId.eXIf, d);
    }
}

export class StereoChunk extends BaseChunk {
    constructor(
        t: number,
        d: Uint8Array) {

        super(t, d);
    }

    toBytes(): Uint8Array {
        const result = new Uint8Array(4);
        // TODO
        return result;
    }

    static fromBytes(d: Uint8Array): StereoChunk {
        return new StereoChunk(TypeId.sTER, d);
    }
}

export type Chromaticities = [ number, number, number, number, number, number, number, number ];

export class PNGStream {
    private reader: BufReader;
    private result: Image2d | null = null;
    private header: HeaderChunk | null = null;
    private palette: PaletteChunk | null = null;
    private gamma = 1.0;
    private chromaticities: Chromaticities | null = null;
    private bitDepths: ImageBitDepth[] = [];
    private suggestedPalettes: Record<string, SuggestedPaletteChunk> = {};
    private size: PhysicalSizeChunk | null = null;

    constructor(r: BufReader) {
        this.reader = r;
    }

    async open(): Promise<void> {
        const h1 = await this.readUint32();
        const h2 = await this.readUint32();

        if (! (signatureWord1 === h1 && signatureWord2 === h2))
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

    async nextChunk(): Promise<ChunkWithData> {
        if (null === this.reader)
            throw new Error(`no open reader`);

        const size = await this.readUint32();
        const type = await this.readUint32();
        const data = new Uint8Array(size);

        if (0 !== size) { await this.reader.readFull(data); }
        const crc = await this.readUint32();
        // TODO: verify crc

        const result = new BaseChunk(type, data);
        if (isChunkWithData(result)) return result;
        throw new Error(`Chunk expected to have data that we can decode`);
    }

    decodeChunk(cin: ChunkWithData): BaseChunk {
        switch (cin.type) {
        case TypeId.IHDR:   return HeaderChunk.fromBytes(cin.data);
        case TypeId.PLTE:   return PaletteChunk.fromBytes(cin.data);
        case TypeId.IDAT:   return ImageDataChunk.fromBytes(cin.data);
        case TypeId.IEND:   return EndChunk.fromBytes(cin.data);
        case TypeId.tRNS:   return TransparencyChunk.fromBytes(cin.data);
        case TypeId.cHRM:   return ChromaticityChunk.fromBytes(cin.data);
        case TypeId.gAMA:   return GammaChunk.fromBytes(cin.data);
        case TypeId.iCCP:   return ICCPChunk.fromBytes(cin.data);
        case TypeId.sBIT:   return BitDepthChunk.fromBytes(cin.data);
        case TypeId.sRGB:   return SRGBChunk.fromBytes(cin.data);
        case TypeId.tEXt:   return TextChunk.fromBytes(cin.data);
        case TypeId.zTXt:   return ZTextChunk.fromBytes(cin.data);
        case TypeId.iTXt:   return ITextChunk.fromBytes(cin.data);
        case TypeId.bKGD:   return BackgroundChunk.fromBytes(cin.data);
        case TypeId.hIST:   return HistogramChunk.fromBytes(cin.data);
        case TypeId.pHYs:   return PhysicalSizeChunk.fromBytes(cin.data);
        case TypeId.sPLT:   return SuggestedPaletteChunk.fromBytes(cin.data);
        case TypeId.tIME:   return TimeChunk.fromBytes(cin.data);
        case TypeId.dSIG:   return SignatureChunk.fromBytes(cin.data);
        case TypeId.eXIf:   return ExifChunk.fromBytes(cin.data);
        case TypeId.sTER:   return StereoChunk.fromBytes(cin.data);
        }
        throw new Error(`unknown chunk type ${cin.type.toString(16)}`);
    }

    async *chunks(): AsyncGenerator<BaseChunk> {
        let type = 0;
        let partial: ChunkWithData | null = null;

        do {
            const chunk = await this.nextChunk();
            type = chunk.type;

            if (TypeId.IDAT === chunk.type) {
                if (null === partial) {
                    partial = chunk;
                } else {
                    const p1 = partial.data;
                    partial.data = new Uint8Array(p1.length + chunk.data.length);
                    partial.data.set(p1);
                    partial.data.set(chunk.data, p1.length);
                }
                continue;
            }
            if (null !== partial && TypeId.IDAT !== chunk.type) {
                // partial.data = unzlib(partial.data);
                yield this.decodeChunk(partial);
                partial = null;
            }
            yield this.decodeChunk(chunk);
        } while (TypeId.IEND !== type);
    }

    async decodeImageData(chunk: ImageDataChunk): Promise<void> {
        const h = this.header;
        if (! h) throw new Error('must have header to decode image data');
/*
        if (ColorType.Gray === h.colorType || ColorType.GrayAlpha === h.colorType) {
            this.result.data.set(ColorSpace.Grayscale, new ImageComponent(
                ColorSpace.Grayscale, h.width, h.height
            ));
        }
        if (ColorType.Color === h.colorType || ColorType.ColorAlpha === h.colorType) {
            this.result.data.set(ColorSpace.RGB, new ImageComponent(
                ColorSpace.RGB, h.width, h.height
            ));
        }
        if (ColorType.GrayAlpha === h.colorType || ColorType.ColorAlpha === h.colorType) {
            this.result.data.set(OtherImageData.Alpha, new ImageComponent(
                OtherImageData.Alpha, h.width, h.height
            ));
        }
        if (ColorType.Indexed === h.colorType) {
            this.result.data.set(OtherImageData.Alpha, new ImageComponent(
                OtherImageData.Alpha, h.width, h.height
            ));
        }
        const dv = new DataView(chunk.data.buffer);
        let index = 0;
        const spp = samplesPerPixel(h.colorType);
        const sampleData: Float32Array[] = [];
*/
    }

    async getImage2d(): Promise<Image2d | null> {
        await this.open();

        for await (const chunk of this.chunks()) {
            console.log(chunk.toString());

            switch (chunk.type) {
            case TypeId.IHDR:
                this.header = chunk as HeaderChunk;
                this.result = new Image2d(this.header.width, this.header.height);
                break;
            case TypeId.PLTE:
                this.palette = chunk as PaletteChunk;
                break;
            case TypeId.sPLT:
                if (! (chunk instanceof SuggestedPaletteChunk))
                    throw new Error('Expected suggested palette chunk here');
                this.suggestedPalettes[chunk.name] = chunk;
                break;
            case TypeId.gAMA:
                this.gamma = (chunk as GammaChunk).value;
                break;
            case TypeId.cHRM: {
                const c = (chunk as ChromaticityChunk);
                this.chromaticities = [
                    c.whiteX, c.whiteY,
                    c.redX, c.redY,
                    c.greenX, c.greenY,
                    c.blueX, c.blueY
                ];
            }
                break;
            case TypeId.sBIT:
                this.bitDepths = (chunk as BitDepthChunk).depths;
                break;
            case TypeId.pHYs:
                this.size = chunk as PhysicalSizeChunk;
                break;
            case TypeId.IDAT:
                this.decodeImageData(chunk as ImageDataChunk).then(() => {
                    if (! this.result) throw new Error('IHDR must appear before IDAT');
                }).catch((err) => {
                    throw new Error(`Failed to decode image data`);
                });
                break;
            case TypeId.IEND:
                // if (0 === components.size) throw new Error(`No image data`);
                break;
            default:
                // throw new Error(`Unknown chunk type: ${chunk.type.toString(16)}`)
            }
        }
        return this.result;
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

