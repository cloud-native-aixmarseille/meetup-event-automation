export const DIAGNOSTICS_REFERENTIAL_EN = {
	"diagnostic.referential.contact.id.duplicate":
		"Contact stable identifiers must be unique.",
	"diagnostic.referential.host.id.conflict":
		"A host stable identifier cannot describe different host names.",
	"diagnostic.referential.host.display-name.invalid":
		"Host display name must be a non-empty string.",
	"diagnostic.referential.contact.name.invalid":
		"Contact name must be a non-empty string.",
	"diagnostic.referential.contact.email.invalid":
		"Host contact email address is invalid.",
	"diagnostic.referential.contact.phone.invalid":
		"Host contact phone must be a string when provided.",
	"diagnostic.referential.contact.address.invalid":
		"Host contact address must be a non-empty string.",
	"diagnostic.referential.host.id.invalid":
		"Host stable identifier must use the opaque host-0001 format.",
	"diagnostic.referential.contact.id.invalid":
		"Contact stable identifier must use the opaque contact-0001 format.",
	"diagnostic.referential.reference.host.invalid":
		"Explicit host reference contains an invalid stable identifier.",
	"diagnostic.referential.reference.host.unknown":
		"Explicit host stable identifier is not present in the catalog.",
	"diagnostic.referential.reference.host.display-name-mismatch":
		"Host display name is stale; the stable identifier remains authoritative.",
	"diagnostic.referential.reference.speaker.invalid":
		"Explicit speaker reference contains an invalid stable identifier.",
	"diagnostic.referential.reference.speaker.unknown":
		"Explicit speaker stable identifier is not present in the catalog.",
	"diagnostic.referential.reference.speaker.display-name-mismatch":
		"Speaker display name is stale; the stable identifier remains authoritative.",
	"diagnostic.referential.speaker.id.duplicate":
		"Speaker stable identifiers must be unique.",
	"diagnostic.referential.speaker.id.invalid":
		"Speaker stable identifier must use the speaker-* slug format.",
	"diagnostic.referential.speaker.first-name.invalid":
		"Speaker first name must be a non-empty string.",
	"diagnostic.referential.speaker.last-name.invalid":
		"Speaker last name must be a non-empty string.",
	"diagnostic.referential.speaker.company.invalid":
		"Speaker company must be a non-empty string.",
	"diagnostic.referential.speaker.email.invalid":
		"Speaker email address is invalid.",
	"diagnostic.referential.speaker.phone.invalid":
		"Speaker phone must be a string when provided.",
	"diagnostic.referential.host.display-name.duplicate":
		"Duplicate normalized host display names are not allowed; keep one stable host per public name.",
	"diagnostic.referential.speaker.display-name.duplicate":
		"Duplicate normalized speaker display names are not allowed; keep one stable speaker per public name.",
	"diagnostic.referential.reference.host.ambiguous":
		"Several hosts share this name; include the correct stable host ID.",
	"diagnostic.referential.reference.speaker.ambiguous":
		"Several speakers share this name; include the correct stable speaker ID.",
} as const;
