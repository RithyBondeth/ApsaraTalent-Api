import {
  buildInterviewIcs,
  escapeIcsText,
  icsSequenceFromUpdatedAt,
} from './ics-builder.util';

/**
 * RFC 5545 fold reverser. Every real parser unfolds before doing anything
 * else; the fold is a wire concern, not a semantic one. The assertions in
 * this file check semantic content, so they run against the unfolded form.
 */
function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, '');
}

describe('ics-builder', () => {
  const baseInput = {
    interviewId: '11111111-1111-1111-1111-111111111111',
    title: 'Interview: Senior Go engineer',
    description: 'Coding round',
    startAt: new Date('2026-09-08T02:00:00.000Z'),
    durationMinutes: 45,
    timezone: 'Asia/Phnom_Penh',
    meetingLink: 'https://meet.example.test/xyz',
    sequence: 100,
    status: 'CONFIRMED' as const,
    organizerEmail: 'hiring@company.test',
    organizerName: 'Acme Inc.',
    attendeeEmail: 'rita@candidate.test',
    attendeeName: 'Rita Chen',
    appUrl: 'https://app.apsaratalent.com/interview',
  };

  it('produces a REQUEST calendar block with the interview shape', () => {
    // Every mail client keys off METHOD, UID, DTSTART/DTEND, and STATUS. If any
    // of these drift the invite renders wrong (or not at all), so this test
    // pins the shape.
    const { content, filename, contentType } = buildInterviewIcs(
      baseInput,
      'REQUEST',
    );
    expect(contentType).toBe('text/calendar; charset=utf-8; method=REQUEST');
    expect(filename).toBe('interview.ics');
    expect(content).toContain('BEGIN:VCALENDAR');
    expect(content).toContain('END:VCALENDAR');
    expect(content).toContain('METHOD:REQUEST');
    expect(content).toContain(
      'UID:interview-11111111-1111-1111-1111-111111111111@apsaratalent.com',
    );
    expect(content).toContain('DTSTART:20260908T020000Z');
    // 02:00Z + 45min = 02:45Z
    expect(content).toContain('DTEND:20260908T024500Z');
    expect(content).toContain('STATUS:CONFIRMED');
    expect(content).toContain('TRANSP:OPAQUE');
    expect(content).toContain('SEQUENCE:100');
    expect(content).toContain('SUMMARY:Interview: Senior Go engineer');
  });

  it('switches to CANCEL semantics when method is CANCEL', () => {
    // Cancellations must not sit on the reader's calendar as busy time. Mail
    // clients read METHOD, STATUS, and TRANSP together to decide the row's
    // fate; all three change here.
    const cancelled = buildInterviewIcs(
      { ...baseInput, status: 'CANCELLED' },
      'CANCEL',
    );
    expect(cancelled.filename).toBe('interview-cancelled.ics');
    expect(cancelled.contentType).toBe(
      'text/calendar; charset=utf-8; method=CANCEL',
    );
    expect(cancelled.content).toContain('METHOD:CANCEL');
    expect(cancelled.content).toContain('STATUS:CANCELLED');
    expect(cancelled.content).toContain('TRANSP:TRANSPARENT');
  });

  it('embeds organizer and attendee with names when present', () => {
    const content = unfold(buildInterviewIcs(baseInput, 'REQUEST').content);
    expect(content).toContain(
      'ORGANIZER;CN=Acme Inc.:mailto:hiring@company.test',
    );
    expect(content).toContain(
      'ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=Rita Chen:mailto:rita@candidate.test',
    );
  });

  it('quotes CN values that would otherwise clash with parameter syntax', () => {
    // Without the quoting a name containing a comma would break parsing —
    // "Chen, Rita" would look like two parameters instead of one CN.
    const content = unfold(
      buildInterviewIcs({ ...baseInput, attendeeName: 'Chen, Rita' }, 'REQUEST')
        .content,
    );
    expect(content).toContain('CN="Chen, Rita":mailto:rita@candidate.test');
  });

  it('escapes commas, semicolons and newlines in TEXT fields', () => {
    // RFC 5545 §3.3.11: comma and semicolon are separators, newline is CRLF-
    // encoded as \n. Any of these bleeding into SUMMARY/DESCRIPTION unescaped
    // corrupts the whole block.
    expect(escapeIcsText('a, b; c\nd')).toBe('a\\, b\\; c\\nd');
    const raw = 'Note:\nSee resume; and portfolio, please.';
    const content = unfold(
      buildInterviewIcs({ ...baseInput, description: raw }, 'REQUEST').content,
    );
    // The DESCRIPTION line contains the escaped form. The rest of the .ics
    // never sees an un-escaped separator that would leak parser state.
    expect(content).toContain(
      'DESCRIPTION:Note:\\nSee resume\\; and portfolio\\, please.\\nJoin: https://meet.example.test/xyz',
    );
  });

  it('folds long lines onto continuations for strict mail clients', () => {
    // Apple Mail refuses to attach an event when a content line runs past 75
    // octets. RFC 5545 §3.1 wants a fold + single-space continuation; the
    // builder wraps at 74 to leave room for the CRLF.
    const longTitle = 'X'.repeat(120);
    const { content } = buildInterviewIcs(
      { ...baseInput, title: longTitle },
      'REQUEST',
    );
    // The SUMMARY line does not exceed 74 chars on any single line.
    for (const line of content.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(74);
    }
  });

  it('omits the CN when a name is not provided', () => {
    const content = unfold(
      buildInterviewIcs(
        {
          ...baseInput,
          organizerName: null,
          attendeeName: null,
        },
        'REQUEST',
      ).content,
    );
    expect(content).toContain('ORGANIZER:mailto:hiring@company.test');
    expect(content).toMatch(
      /ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:rita@candidate\.test/,
    );
  });

  it('derives SEQUENCE from updatedAt as seconds-since-epoch', () => {
    // Any real edit to an interview bumps `updatedAt`; the second-precision
    // is enough for mail clients to see a fresh SEQUENCE and treat the
    // invite as amended.
    const t = new Date('2026-09-08T02:00:00.000Z');
    expect(icsSequenceFromUpdatedAt(t)).toBe(Math.floor(t.getTime() / 1000));
    const later = new Date(t.getTime() + 5000);
    expect(icsSequenceFromUpdatedAt(later)).toBeGreaterThan(
      icsSequenceFromUpdatedAt(t),
    );
  });
});
