import { ContentMediaChangedError } from "@meetup-automation/publication";

/** A configured public root must contain one unambiguous folder for each asset kind. */
export class DrivePublicFolderError extends ContentMediaChangedError {}
