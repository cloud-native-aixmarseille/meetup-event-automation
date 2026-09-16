export interface RepositoryDispatchClient {
	createDispatchEvent(input: {
		owner: string;
		repo: string;
		event_type: string;
		client_payload: Record<string, unknown>;
	}): Promise<unknown>;
}
