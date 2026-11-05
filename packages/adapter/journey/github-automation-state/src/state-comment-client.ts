export interface StateComment {
	readonly id: number;
	readonly node_id?: string;
	readonly body?: string | null;
	readonly user?: { readonly login: string; readonly type?: string } | null;
}
export interface StateCommentEdit {
	readonly id: string;
	readonly body: string;
	readonly lastEditedAt: string | null;
	readonly editor: {
		readonly login: string;
		readonly __typename: string;
	} | null;
}
export interface StateCommentClient {
	canApprove(username: string): Promise<boolean>;
	list(): Promise<readonly StateComment[]>;
	create(body: string): Promise<number>;
	replace(id: number, before: string, after: string): Promise<void>;
	edit(comment: StateComment): Promise<StateCommentEdit>;
	history(comment: StateComment): Promise<
		readonly {
			readonly diff: string | null;
			readonly deletedAt: string | null;
			readonly editor: StateCommentEdit["editor"];
		}[]
	>;
}
