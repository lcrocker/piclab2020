import minimist from 'https://deno.land/x/deno_minimist@v1.0.2/mod.ts';
import { BufReader } from 'https://deno.land/std/io/bufio.ts';

import { TypeId, typeName, Chunk, PNGStream } from './png.ts';
import { Image2d, Image2dOrNull } from './image2d.ts';

const SCALE = 1. / 255;
function byteToFloat(b: number): number { return SCALE * b; }

class Converter {
    private infile: string;
    private outfile: string;
    private baseName: string;

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

	let image: Image2dOrNull = await PNGStream.imageFromFile(this.infile);
	console.log(image);
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

