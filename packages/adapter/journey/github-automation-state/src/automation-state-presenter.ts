import type {
	AutomationStateCodec,
	StoredAutomationState,
} from "./automation-state-codec.js";
import type { StateMessages } from "./i18n/state-messages.js";
export class AutomationStatePresenter {
	constructor(
		private readonly codec: Pick<AutomationStateCodec, "write">,
		private readonly messages: Pick<StateMessages, "t">,
	) {}
	render(state: StoredAutomationState): string {
		return `${this.codec.write(state)}\n\n${this.messages.t("state.description")}`;
	}
}
