# Account resume drafts

Deploy migration `1790726400000-ResumeDrafts` and the API before releasing the
mobile client. Use the normal migration/release pipeline; the client needs
`/resume/drafts` to open its account library. No production migration has been
run as part of this implementation.

All routes require the existing authenticated session. Ownership always comes
from the session, never from the request body. Account deletion cascades to drafts.

| Method | Route | Contract |
| --- | --- | --- |
| GET | `/resume/drafts` | Metadata ordered by most recently updated; excludes content |
| GET | `/resume/drafts/:id` | Full owned draft, including content and revision |
| POST | `/resume/drafts` | `{id: UUID, name, content}`; client-generated ID makes identical retries safe |
| PUT | `/resume/drafts/:id` | `{name, content, revision}`; atomic compare and increment |
| DELETE | `/resume/drafts/:id` | Delete owned draft |

Names are trimmed and limited to 120 characters. Content is bounded to 200 KB
and must contain personalInfo, skills, experience and template. Drafts can be
incomplete; PDF export retains its existing stricter validation. Stale edits
return 409; unknown or foreign IDs return 404. An identical update retry at the
immediately following revision returns the existing result.

Mobile saves a secure local recovery record before sending edits, retaining its
creation ID and revision across restarts. Failed sync exposes Retry save and
Save as new resume. Local recovery is removed only after a successful account
save. Legacy device-only drafts can be saved to the account from the editor.
The My resumes screen supports reopening, renaming, duplicating and confirmed
deletion. Autosave runs after editing a section, changing templates or generating
AI content; unsubmitted text in an open edit dialog is not yet a saved edit.
