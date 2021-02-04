
export enum ImageComponentType {
	DisplayGray = 1,
	Alpha,
	DisplayRed,
	DisplayGreen,
	DisplayBlue,
	InkCyan,
	InkMagenta,
	InkYellow,
	InkBlack,
	Hue,
	Saturation,
	Value,
	Luminance,
	CIEX,
	CIEY,
	CIEZ,
	CIEL,
	CIEa,
	CIEb,
	sRGBRed,
	sRGBGreen,
	sRGBBlue,
	AdobeRed,
	AdobeGreen,
	AdobeBlue,
	KodakRed,
	KodakGreen,
	KodakBlue,
	CIERed,
	CIEGreen,
	CIEBlue,
	NTSCY,
	NTSCI,
	NTSCQ,
	PALY,
	PALU,
	PALV,
	SECAMY,
	SECAMDb,
	SECAMDr,
	AnalogY,
	AnalogPb,
	AnalogPr,
	XvY,
	XvCb,
	XvCr,
	DolbyI,
	DolbyCt,
	DolbyCp
};

export class ImageComponent {
	public type: ImageComponentType;
	public hSamples: number;
	public vSamples: number:
	public data: Float32Array;
	public loadedFromFile: boolean = false;

	constuctor(t: ImageComponentType, w: number, h: number, d?: Float32Array) {
		if (d) {
			this.data = d;	
		} else {
			this.data = new Float32Array(w * h);
		}
		this.hSamples = w;
		this.vSamples = h;
		this.type = t;
	}
}

export class Image2d {
	public width: number;
	public height: number;
	public data: Record<string, ImageComponent> = {};

	constructor(w: number, h: number) {
		this.width = w;
		this.height = h;
	}
}

