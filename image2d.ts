
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
};

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
};

type ImageComponentType = ColorSpace | OtherImageData;

export class ImageComponent {
	public type: ImageComponentType;
	public width: number;
	public height: number;
	public data: Float32Array[] = [];
	public modifiedTime: Date;
	public loaded: boolean = false;

	constructor(t: ImageComponentType, w: number, h: number) {
		this.type = t;
		this.width = w;
		this.height = h;
		this.modifiedTime = new Date();
	}
}

export class Image2d {
	public width: number;
	public height: number;
	public hSize = 2000;
	public vSize = 2000;
	public data: Record<string, ImageComponent> = {};

	constructor(w: number, h: number) {
		this.width = w;
		this.height = h;
	}
}


