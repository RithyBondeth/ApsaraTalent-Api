/**
 * RFC 5545 (`.ics`) generator for interview invites, cancellations, and
 * updates. Deliberately no dependency on a heavyweight library — the shape
 * this codebase needs is small, and one file that a reader can audit for
 * escape/format rules is worth more than a transitive tree from npm.
 *
 * The output is intended to be delivered as an email attachment with
 * `Content-Type: text/calendar; method=REQUEST` (or CANCEL). Every mail
 * client that supports iCal picks up the invitation from there and offers
 * a "Add to calendar" / "Update / Remove" affordance.
 */

/** RFC 5545 §3.7.2 — the METHOD used at the top of the calendar block. */
export type TIcsMethod = 'REQUEST' | 'CANCEL';

/** RFC 5545 §3.8.1.11 — the STATUS on the event itself. */
export type TIcsEventStatus = 'CONFIRMED' | 'CANCELLED' | 'TENTATIVE';

export interface IIcsInterviewInput {
  /** Stable per interview. Used as the ics `UID`. */
  interviewId: string;
  title: string;
  description?: string | null;
  /** Absolute start; the entity's `scheduledAt`. */
  startAt: Date;
  /** Length in minutes; the entity's `durationMinutes`. */
  durationMinutes: number;
  /** Physical location, or a description of one. Distinct from meetingLink. */
  location?: string | null;
  /** Video-call URL to include in the description body. */
  meetingLink?: string | null;
  /** Timezone the schedule was picked in — kept for descriptive purposes.
   *  DTSTART is emitted as UTC (`Z`) so mail clients render it unambiguously
   *  regardless of the reader's own zone. */
  timezone?: string | null;
  /**
   * Monotonic sequence number for this event. Mail clients treat a higher
   * SEQUENCE with the same UID as an update; a lower one is ignored. We
   * derive this from `updatedAt` (seconds since epoch) so any real change
   * bumps it without needing a dedicated column.
   */
  sequence: number;
  /** Explicit STATUS on the event body. */
  status: TIcsEventStatus;
  /** The organizer's email (usually the company account). */
  organizerEmail: string;
  organizerName?: string | null;
  /** The candidate's email — the one on the invitation. */
  attendeeEmail: string;
  attendeeName?: string | null;
  /** Optional deep link back into the platform. Rendered under the fold. */
  appUrl?: string | null;
}

export interface IIcsResult {
  content: string;
  filename: string;
  /** Ready-to-attach content type incl. the method — many clients rely on
   *  the parameter to know whether to prompt add vs. cancel. */
  contentType: string;
}

/**
 * Build a single-event `.ics` file for one interview. The result is a
 * plain string — call sites hand it to nodemailer verbatim.
 */
export function buildInterviewIcs(
  input: IIcsInterviewInput,
  method: TIcsMethod,
): IIcsResult {
  const startUtc = formatIcsUtc(input.startAt);
  const endUtc = formatIcsUtc(
    new Date(input.startAt.getTime() + input.durationMinutes * 60 * 1000),
  );
  const dtstamp = formatIcsUtc(new Date());

  const descriptionLines: string[] = [];
  if (input.description) descriptionLines.push(input.description);
  if (input.meetingLink) descriptionLines.push(`Join: ${input.meetingLink}`);
  if (input.timezone) descriptionLines.push(`Scheduled in ${input.timezone}.`);
  if (input.appUrl)
    descriptionLines.push(`Open in Apsara Talent: ${input.appUrl}`);

  const description = descriptionLines.join('\n');
  const location = input.location || input.meetingLink || '';

  const uid = `interview-${input.interviewId}@apsaratalent.com`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Apsara Talent//Interview//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SEQUENCE:${Math.max(0, Math.floor(input.sequence))}`,
    `STATUS:${input.status}`,
    // Cancellation is where TRANSP matters most: a cancelled event should not
    // block time on the reader's calendar even if their client keeps the row.
    `TRANSP:${input.status === 'CANCELLED' ? 'TRANSPARENT' : 'OPAQUE'}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
  }
  if (location) {
    lines.push(`LOCATION:${escapeIcsText(location)}`);
  }

  lines.push(
    formatOrganizer(input.organizerEmail, input.organizerName),
    formatAttendee(input.attendeeEmail, input.attendeeName),
    'END:VEVENT',
    'END:VCALENDAR',
  );

  // RFC 5545 §3.1 caps a content line at 75 octets; longer lines fold onto a
  // continuation prefixed by a single space. Some clients (looking at you,
  // older Outlook) parse the unfolded form fine, but strict validators and
  // Apple Mail refuse to attach the event when a line runs long. Fold at
  // 74 to leave a byte for the CRLF that terminates each line.
  const folded = lines.map(foldIcsLine).join('\r\n');

  const isCancel = method === 'CANCEL';
  const filename = isCancel ? 'interview-cancelled.ics' : 'interview.ics';
  const contentType = `text/calendar; charset=utf-8; method=${method}`;

  return { content: folded, filename, contentType };
}

/**
 * Compute a per-update SEQUENCE from `updatedAt`. Seconds-since-epoch
 * fits comfortably in an ics-integer, is monotonic per row (unless someone
 * edits a row in the past, which is not a thing this codebase does), and
 * needs no schema change. Rounded down to the second — an update that
 * only touches other fields still bumps the timestamp, so consumers see
 * a fresh SEQUENCE and treat the invite as amended.
 */
export function icsSequenceFromUpdatedAt(updatedAt: Date): number {
  return Math.floor(updatedAt.getTime() / 1000);
}

// ── Internals ────────────────────────────────────────────────────────────

function formatIcsUtc(date: Date): string {
  // RFC 5545 form for UTC timestamps: YYYYMMDDTHHMMSSZ, no punctuation.
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return (
    `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/**
 * RFC 5545 §3.3.11: TEXT values escape backslash, semicolon, comma, and
 * newline. Everything else stays as-is; Unicode is allowed and required
 * for the platform's Khmer content.
 */
export function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

/**
 * Fold a single content line to ≤74 chars. Bytes rather than characters
 * would be more correct for multibyte code points, but every strict client
 * we care about accepts the char-based fold and no ASCII field in the
 * output above is close to the limit anyway; the escape hatch here is the
 * user's own text, which is where the folding actually kicks in.
 */
function foldIcsLine(line: string): string {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let index = 0;
  parts.push(line.slice(0, 74));
  index = 74;
  while (index < line.length) {
    // Continuation lines start with a single space per RFC 5545 §3.1.
    parts.push(' ' + line.slice(index, index + 73));
    index += 73;
  }
  return parts.join('\r\n');
}

function formatOrganizer(email: string, name?: string | null): string {
  return name
    ? `ORGANIZER;CN=${escapeIcsParamValue(name)}:mailto:${email}`
    : `ORGANIZER:mailto:${email}`;
}

function formatAttendee(email: string, name?: string | null): string {
  // ROLE=REQ-PARTICIPANT + RSVP=TRUE so mail clients render the "Yes / No /
  // Maybe" buttons and post the response back to the organizer.
  const base = 'ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE';
  return name
    ? `${base};CN=${escapeIcsParamValue(name)}:mailto:${email}`
    : `${base}:mailto:${email}`;
}

/**
 * Parameter values (`CN=...`) use a stricter escape than TEXT: RFC 5545
 * §3.2 says a value with a colon/semicolon/comma must be double-quoted,
 * and a value with a double-quote inside is not representable. We strip
 * the quote and quote the rest — a name never needs a quote to be readable.
 */
function escapeIcsParamValue(value: string): string {
  const cleaned = value.replace(/"/g, '');
  return /[:;,]/.test(cleaned) ? `"${cleaned}"` : cleaned;
}
