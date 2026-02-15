export interface Feature {
	title: string;
	items: string[];
}

export interface Patch {
	version: string;
	date: string;
	title: string;
	description: string;
	features: Feature[];
}

export interface Version {
	version: string;
	date: string;
	title: string;
	description: string;
	features: Feature[];
	status: 'current' | 'released';
	patches?: Patch[];
}
