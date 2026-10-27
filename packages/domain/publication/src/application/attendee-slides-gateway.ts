/** Send through the event's Contact attendees form to members marked as attended. */
export interface AttendeeSlidesGateway {
	sendSlides(
		eventUrl: string,
		pdfUrl: string,
		beforeSend: () => Promise<void>,
	): Promise<void>;
}
