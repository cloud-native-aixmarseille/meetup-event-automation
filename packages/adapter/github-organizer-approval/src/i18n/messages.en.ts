export const EN_MESSAGES = {
	"approval.request":
		"### Organizer confirmation: {kind, select, introduction {introduction emails} thanks {thank-you emails} other {action}}\n\nEvent date: {date}. This batch covers up to {count, number} recipients; completed deliveries are skipped.\n\nOrganizers with repository write access: check one choice below. Leave both unchecked to wait.\n\n- [{approveMark}] Approve sending this batch\n- [{rejectMark}] Reject sending this batch\n\nApproval applies to this batch revision. Changed event details or recipients require a new confirmation. The email checkboxes in the issue are checked after accepted dispatch.",
	"approval.slack":
		"Organizer confirmation needed: {kind, select, introduction {introduction emails} thanks {thank-you emails} other {action}} for {date}, up to {count, number} recipients. Open the request and check Approve or Reject: {url}",
} as const;
