import {
	GithubRepositoryDispatchMailGateway,
	type GithubRepositoryDispatchMailGatewayArguments,
} from "./github-repository-dispatch-mail-gateway.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class GithubRepositoryDispatchMailGatewayComposition {
	githubRepositoryDispatchMailGateway(
		...args: GithubRepositoryDispatchMailGatewayArguments
	): GithubRepositoryDispatchMailGateway {
		return new GithubRepositoryDispatchMailGateway(...args);
	}
}
