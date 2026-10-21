import { ChromiumEndpoint } from "./chromium-endpoint.js";
import {
	HcaptchaChallenge,
	type HcaptchaChallengeArguments,
} from "./hcaptcha-challenge.js";
import { HcaptchaChallengeFactory } from "./hcaptcha-challenge-factory.js";
import {
	HcaptchaProcess,
	type HcaptchaProcessArguments,
} from "./hcaptcha-process.js";
import { HcaptchaProcessFactory } from "./hcaptcha-process-factory.js";
import { MeetupBrowserRoutes } from "./meetup-browser-routes.js";
import {
	MeetupCalendar,
	type MeetupCalendarArguments,
} from "./meetup-calendar.js";
import {
	MeetupEventEditor,
	type MeetupEventEditorArguments,
} from "./meetup-event-editor.js";
import {
	MeetupEventGateway,
	type MeetupEventGatewayArguments,
} from "./meetup-event-gateway.js";
import { MeetupEventGatewayFactory } from "./meetup-event-gateway-factory.js";
import {
	MeetupEventPublisher,
	type MeetupEventPublisherArguments,
} from "./meetup-event-publisher.js";
import {
	MeetupEventVerification,
	type MeetupEventVerificationArguments,
} from "./meetup-event-verification.js";
import {
	MeetupLoginPage,
	type MeetupLoginPageArguments,
} from "./meetup-login-page.js";
import { MeetupVenue, type MeetupVenueArguments } from "./meetup-venue.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class MeetupEventGatewayComposition {
	chromiumEndpoint(): ChromiumEndpoint {
		return new ChromiumEndpoint();
	}
	hcaptchaChallenge(...args: HcaptchaChallengeArguments): HcaptchaChallenge {
		return new HcaptchaChallenge(
			{ chromiumEndpoint: this.chromiumEndpoint() },
			...args,
		);
	}
	hcaptchaChallengeFactory(): HcaptchaChallengeFactory {
		return new HcaptchaChallengeFactory({
			hcaptchaProcessFactory: this.hcaptchaProcessFactory(),
			createHcaptchaChallenge: (...args) => this.hcaptchaChallenge(...args),
		});
	}
	hcaptchaProcess(...args: HcaptchaProcessArguments): HcaptchaProcess {
		return new HcaptchaProcess(...args);
	}
	hcaptchaProcessFactory(): HcaptchaProcessFactory {
		return new HcaptchaProcessFactory({
			createHcaptchaProcess: (...args) => this.hcaptchaProcess(...args),
		});
	}
	meetupBrowserRoutes(): MeetupBrowserRoutes {
		return new MeetupBrowserRoutes();
	}
	meetupCalendar(...args: MeetupCalendarArguments): MeetupCalendar {
		return new MeetupCalendar(...args);
	}
	meetupEventEditor(...args: MeetupEventEditorArguments): MeetupEventEditor {
		return new MeetupEventEditor(
			{
				meetupBrowserRoutes: this.meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					this.meetupEventVerification(...args),
				createMeetupCalendar: (...args) => this.meetupCalendar(...args),
				createMeetupVenue: (...args) => this.meetupVenue(...args),
			},
			...args,
		);
	}
	meetupEventGateway(...args: MeetupEventGatewayArguments): MeetupEventGateway {
		return new MeetupEventGateway(
			{
				createMeetupEventEditor: (...args) => this.meetupEventEditor(...args),
				createMeetupEventPublisher: (...args) =>
					this.meetupEventPublisher(...args),
				createMeetupLoginPage: (...args) => this.meetupLoginPage(...args),
			},
			...args,
		);
	}
	meetupEventGatewayFactory(): MeetupEventGatewayFactory {
		return new MeetupEventGatewayFactory({
			hcaptchaChallengeFactory: this.hcaptchaChallengeFactory(),
			createMeetupEventGateway: (...args) => this.meetupEventGateway(...args),
		});
	}
	meetupEventPublisher(
		...args: MeetupEventPublisherArguments
	): MeetupEventPublisher {
		return new MeetupEventPublisher(
			{
				meetupBrowserRoutes: this.meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					this.meetupEventVerification(...args),
			},
			...args,
		);
	}
	meetupEventVerification(
		...args: MeetupEventVerificationArguments
	): MeetupEventVerification {
		return new MeetupEventVerification(
			{
				meetupBrowserRoutes: this.meetupBrowserRoutes(),
				createMeetupVenue: (...args) => this.meetupVenue(...args),
				createMeetupCalendar: (...args) => this.meetupCalendar(...args),
			},
			...args,
		);
	}
	meetupLoginPage(...args: MeetupLoginPageArguments): MeetupLoginPage {
		return new MeetupLoginPage(
			{ meetupBrowserRoutes: this.meetupBrowserRoutes() },
			...args,
		);
	}
	meetupVenue(...args: MeetupVenueArguments): MeetupVenue {
		return new MeetupVenue(...args);
	}
}
