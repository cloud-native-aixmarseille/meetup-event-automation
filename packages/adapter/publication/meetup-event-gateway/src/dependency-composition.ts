import { spawn } from "node:child_process";
import { LocalizationComposition } from "@meetup-automation/localization";
import type {
	ContentImageLoader,
	MeetupCoverJournal,
	MeetupTopicSelection,
} from "@meetup-automation/publication";
import { chromium, type Page } from "playwright-core";
import { AttendeeMessages } from "./i18n/attendee-messages.js";
import { MeetupAttendeeMessage } from "./meetup-attendee-message.js";
import { MeetupBrowserRoutes } from "./meetup-browser-routes.js";
import { MeetupBrowserSession } from "./meetup-browser-session.js";
import {
	MeetupCalendar,
	type MeetupCalendarArguments,
} from "./meetup-calendar.js";
import { MeetupChromeProcess } from "./meetup-chrome-process.js";
import { MeetupCover } from "./meetup-cover.js";
import { MeetupCoverImage } from "./meetup-cover-image.js";
import { MeetupCoverPhoto } from "./meetup-cover-photo.js";
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
import { MeetupHosts } from "./meetup-hosts.js";
import { MeetupLeadership } from "./meetup-leadership.js";
import {
	MeetupLoginPage,
	type MeetupLoginPageArguments,
} from "./meetup-login-page.js";
import { MeetupTopics } from "./meetup-topics.js";
import { MeetupVenue, type MeetupVenueArguments } from "./meetup-venue.js";
/** Assembles this package's collaborators; no business decisions or I/O. */
export class MeetupEventGatewayComposition {
	constructor(
		private readonly locale: string,
		private readonly images: ContentImageLoader,
		private readonly covers: MeetupCoverJournal,
		private readonly topics: MeetupTopicSelection,
	) {}
	meetupBrowserSession(): MeetupBrowserSession {
		return new MeetupBrowserSession(
			chromium,
			new MeetupChromeProcess(spawn, "google-chrome"),
		);
	}
	meetupCover(page: Page): MeetupCover {
		return new MeetupCover(
			this.images,
			new MeetupCoverImage(),
			this.covers,
			new MeetupCoverPhoto(page),
		);
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
				createCover: (page) => this.meetupCover(page),
				meetupBrowserRoutes: this.meetupBrowserRoutes(),
				createMeetupEventVerification: (...args) =>
					this.meetupEventVerification(...args),
				createMeetupCalendar: (...args) => this.meetupCalendar(...args),
				createMeetupVenue: (...args) => this.meetupVenue(...args),
				createHosts: (page) => this.meetupHosts(page),
				createTopics: (page) => this.meetupTopics(page),
			},
			...args,
		);
	}
	meetupEventGateway(...args: MeetupEventGatewayArguments): MeetupEventGateway {
		return new MeetupEventGateway(
			{
				createBrowserSession: () => this.meetupBrowserSession(),
				createAttendeeMessage: (page, group) =>
					new MeetupAttendeeMessage(
						new AttendeeMessages(
							{
								localeResolver: new LocalizationComposition().localeResolver(),
							},
							this.locale,
						),
						page,
						group,
					),
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
				createCover: (page) => this.meetupCover(page),
				meetupBrowserRoutes: this.meetupBrowserRoutes(),
				createMeetupVenue: (...args) => this.meetupVenue(...args),
				createMeetupCalendar: (...args) => this.meetupCalendar(...args),
				createHosts: (page) => this.meetupHosts(page),
				createTopics: (page) => this.meetupTopics(page),
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
	meetupHosts(page: Page): MeetupHosts {
		return new MeetupHosts(page, new MeetupLeadership(page));
	}
	meetupTopics(page: Page): MeetupTopics {
		return new MeetupTopics(page, this.topics);
	}
}
