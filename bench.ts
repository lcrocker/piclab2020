import minimist from 'https://deno.land/x/deno_minimist@v1.0.2/mod.ts';
import { Chunk } from './png.ts';

const SCALE = 1. / 255;
function byteToFloat(b: number): number { return SCALE * b; }

class Converter {
    private infile: string;
    private outfile: string;
    private baseName: string;

    isPNG(bytes: Uint8Array): boolean {
	const header = [ 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A ];

	for (let i = 0; i < header.length; i += 1) {
		if (bytes[i] !== header[i]) return false;
	}
	return true;
    }

    chunk(bytes: Uint8Array, offset: number): Chunk {
	let result: any = { offset: offset };

	result.size = (bytes[offset] << 24) + (bytes[offset + 1] << 16) +
		(bytes[offset + 2] << 8) + bytes[offset + 3];
	result.type = String.fromCharCode(bytes[offset + 4]) + String.fromCharCode(bytes[offset + 5]) +
		String.fromCharCode(bytes[offset + 6]) + String.fromCharCode(bytes[offset + 7]);
	result.data = offset + 8;

	const cp = offset + 8 + result.size;
	result.crc = (bytes[cp] << 24) + (bytes[cp + 1] << 16) + (bytes[cp + 2] << 8) + bytes[cp + 3];
	result.next = cp + 4;

	if (result.next > bytes.length) throw new Error('bad input');
	return result as Chunk;
    }

    constructor(f: string) {
        this.infile = f;
        this.outfile = f.replace(/[^A-Za-z0-9_.]/g, '_');

        const	dot = this.outfile.lastIndexOf('.');
        if (-1 === dot) this.baseName = this.outfile;
        else this.baseName = this.outfile.substr(0, dot);

        this.outfile = this.baseName + '.h';
    }

    async convert(): Promise<void> {
        console.log(`${this.infile} --> ${this.outfile}`);

	const bytes = await Deno.readFile(this.infile);
	console.log(`read ${bytes.length} bytes`);

	if (this.isPNG(bytes)) {
	    console.log(`input is PNG file`);
	    let offset = 8;
	    let type = '';

	    do {
		let chunk = this.chunk(bytes, offset);

		console.log(`found ${chunk.type} (${chunk.size} bytes)`);
		offset = chunk.next;
		type = chunk.type;
	    } while ('IEND' !== type);
	}

	let result = new Float32Array(bytes.length);
	for (let i = 0; i < bytes.length; i += 1) {
		result[i] = byteToFloat(bytes[i]);
	}

	console.log(`${result[0]} ${result[1]} ${result[2]} ${result[42]}`);
    }
}
    
class App {
    public verbose = false;
    public files: string[] = [];
    
    constructor() {
    }

    async run(): Promise<void> {
        const	argv = minimist(Deno.args, {
            boolean: [ 'v' ],
	    string: [ '_' ]
        });
        this.verbose = argv.v as boolean;
        this.files = argv._ as string[];

        if (0 === this.files.length) {
            throw new Error('Must have at least one input file.');
        }
        for (let i = 0; i < this.files.length; i += 1) {
	    const startTime = new Date();
	    console.log(`started ${startTime.toISOString()}`);

            await (new Converter(this.files[i])).convert();

	    const endTime = new Date();
	    console.log(`finished ${endTime.toISOString()}`);
	    const duration = endTime.valueOf() - startTime.valueOf();
	    console.log(`running time ${duration} ms`);
        }
    }
}

await (new App()).run();

