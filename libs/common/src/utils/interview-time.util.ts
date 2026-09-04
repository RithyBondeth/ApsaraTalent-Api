/**
 * Renders an interview's scheduled time as an unambiguous string for a surface
 * that has no browser to convert timezones — email, ICS, PDF.
 *
 * The result always names the timezone explicitly ("2:00 PM Asia/Phnom_Penh"),
 * so no reader ever has to guess whether "2 PM" means their morning or their
 * night. Falls back to UTC when the interview has no stored timezone (older
 * rows written before the column existed); the fallback is a deliberate
 * degradation — legible, never wrong, just less friendly than the scheduler's
 * local time.
 *
 * `Intl.DateTimeFormat` handles the conversion. It is in the Node standard
 * library on every supported version, has no dependency, and knows every IANA
 * name; a hand-rolled offset table would grow stale the next time a country
 * changed its DST rules.
 */
export function formatInterviewTime(
  scheduledAt: Date,
  timezone: string | null | undefined,
): string {
  const zone = normalizeTimezone(timezone);

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: zone,
    });
    return `${formatter.format(scheduledAt)} (${zone})`;
  } catch {
    // An unknown IANA name — most likely a client that sent junk — must not
    // hide the interview time entirely. Fall back to UTC and label it so.
    const formatter = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'UTC',
    });
    return `${formatter.format(scheduledAt)} (UTC)`;
  }
}

const normalizeTimezone = (zone: string | null | undefined): string =>
  zone && zone.trim().length > 0 ? zone.trim() : 'UTC';
