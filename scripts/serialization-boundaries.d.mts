export class SerializationBoundaries {
	inspect(node: { readonly type: string }): {
		rule: string;
		line: number;
		message: string;
	}[];
}
