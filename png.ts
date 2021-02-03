
export interface Chunk {
	type: string;
	size: number;
	crc: number;
	offset: number;
	data: number;
	next: number;
}

function isChunk(obj: any): obj is Chunk {
    if ('string' !== typeof obj.type) return false;
    if ('number' !== typeof obj.size) return false;
    if ('number' !== typeof obj.crc) return false;
    if ('number' !== typeof obj.offset) return false;
    if ('number' !== typeof obj.data) return false;
    if ('number' !== typeof obj.next) return false;
    return true;
}

export interface HeaderChunk extends Chunk {
	width: number;
	height: number;
}

