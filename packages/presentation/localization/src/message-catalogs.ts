export type Locale = "en" | "fr";
export type MessageValues = Readonly<Record<string, string | number>>;
export type MessageCatalogs<Id extends string = string> = Readonly<{
	en: Readonly<Record<Id, string>>;
	fr: Readonly<Partial<Record<Id, string>>>;
}>;
