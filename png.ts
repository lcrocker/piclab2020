
export interface Chunk {
	type: string;
	crc: number;
	data: Uint8Array;
}

enum ColorType {
	Gray = 0,
	Color = 2,
	Indexed = 3,
	GrayAlpha = 4,
	ColorAlpha = 6
};

enum CompressionMethod {
	Deflate = 0
}

enum FilterMethod {
	ByLine = 0
}

enum InterlaceMethod {
	None = 0,
	Adam7 = 1
}

export function isChunk(obj: any): obj is Chunk {
    if ('string' !== typeof obj.type) return false;
    if ('number' !== typeof obj.crc) return false;
    if (! obj.data instanceof Uint8Array) return false;
    return true;
}

export interface HeaderChunk extends Chunk {
	width: number;
	height: number;
	bitDepth: number;
	colorType: ColorType;
	compressionMethod: CompressionMethod;
	filterMethod: FilterMethod;
	interlaceMethod: InterlaceMethod;
}

