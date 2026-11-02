import type { WebsiteEvent } from "@meetup-automation/publication";
export const websiteEvent: WebsiteEvent = {
	date: "2028-06-15",
	url: "https://www.meetup.com/example/events/123/",
	venue: { name: "Example Host", city: "Example City" },
};
export const plannedRow = "| Juin | 2028-06-08 | A confirmer |";
export const publishedRow =
	"| Juin | [2028-06-15](https://www.meetup.com/example/events/123/) | Example Host (Example City) |";
export const calendar = [
	"---",
	"layout: page",
	"title: Events",
	"---",
	"",
	"## 2028",
	"",
	"| Mois | Date cible | Lieu |",
	"| --- | --- | --- |",
	"| Mai | [2028-05-04](https://www.meetup.com/example/events/99/) | Previous Host |",
	plannedRow,
	"| Juillet | 2028-07-06 | Future Host |",
	"",
	"## 2027",
	"",
	"| Mois | Date |",
	"| --- | --- |",
	"| Juin | [2027-06-01](https://www.meetup.com/example/events/88/) |",
	"",
].join("\n");
