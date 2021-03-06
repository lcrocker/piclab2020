
export enum ColorSpace {
    Grayscale = 1,
    RGB,
    RGBW,
    CMYK,
    HSV,
    HSL,
    CIEXYZ,
    CIELab,
    CIERGB,
    sRGB,
    AdobeRGB,
    KodakRGB,
    NTSCYIQ,
    PALYUV,
    SECAMYDbDr,
    YPbPr,
    XvYCbCr,
    DolbyICtCp
}

export const ColorSpaceComponentCount = new Map<ColorSpace, number>([
    [ ColorSpace.Grayscale, 1 ],
    [ ColorSpace.RGB, 3 ],
    [ ColorSpace.RGBW, 4 ],
    [ ColorSpace.CMYK, 4 ],
    [ ColorSpace.HSV, 3 ],
    [ ColorSpace.HSL, 3 ],
    [ ColorSpace.CIEXYZ, 3 ],
    [ ColorSpace.CIELab, 3 ],
    [ ColorSpace.CIERGB, 3 ],
    [ ColorSpace.sRGB, 3 ],
    [ ColorSpace.AdobeRGB, 3 ],
    [ ColorSpace.KodakRGB, 3 ],
    [ ColorSpace.NTSCYIQ, 3 ],
    [ ColorSpace.PALYUV, 3 ],
    [ ColorSpace.SECAMYDbDr, 3 ],
    [ ColorSpace.YPbPr, 3 ],
    [ ColorSpace.XvYCbCr, 3 ],
    [ ColorSpace.DolbyICtCp, 3 ]
]);

export enum OtherImageData {
    Alpha = 101,
    Index
}

export type ImageComponentType = ColorSpace | OtherImageData;

export class ImageComponent {
    public type: ImageComponentType;
    public width: number;
    public height: number;
    public data: Float32Array[] = [];
    public modifiedTime: Date;
    public loaded = false;

    constructor(t: ImageComponentType, w: number, h: number) {
        this.type = t;
        this.width = w;
        this.height = h;
        this.modifiedTime = new Date();
    }
}

export function isImage2d(obj: unknown) {
	return false;
}

export class Image2d {
    public width: number;
    public height: number;
    public hSize = 2000;
    public vSize = 2000;
    public gamma = 0.45455;
    public whiteX = 0.3127;
    public whiteY = 0.329;
    public redX = 0.64;
    public redY = 0.33;
    public greenX = 0.3;
    public greenY = 0.6;
    public blueX = 0.15;
    public blueY = 0.06;

    private data: Map<ImageComponentType, ImageComponent> = new Map();

    constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
    }

    toString(): string {
        return `Image2d (${this.width} x ${this.height})`;
    }

    toJson(): string {
	return '{}';
    }

    static fromObject(obj: unknown) {
	if (! isImage2d(obj)) throw new Error('not an image object');
	return obj as Image2d;
    }

    static fromJson(j: string) {
	return Image2d.fromObject(JSON.parse(j));
    }
}

export type Image2dOrNull = Image2d | null;

