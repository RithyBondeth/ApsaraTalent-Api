import { formatInterviewTime } from './interview-time.util';

describe('formatInterviewTime', () => {
  const at = new Date('2026-08-14T07:00:00.000Z'); // 07:00 UTC

  it('renders in the scheduler timezone and names it', () => {
    // 07:00 UTC is 14:00 in Asia/Phnom_Penh (UTC+7).
    const out = formatInterviewTime(at, 'Asia/Phnom_Penh');
    expect(out).toContain('2:00 PM');
    expect(out).toContain('(Asia/Phnom_Penh)');
    expect(out).toContain('Friday, August 14, 2026');
  });

  it('falls back to UTC and says so when no timezone is stored', () => {
    // Legacy rows have null. The renderer never hides the time entirely.
    const out = formatInterviewTime(at, null);
    expect(out).toContain('7:00 AM');
    expect(out).toContain('(UTC)');
  });

  it('falls back to UTC when the stored timezone is bogus', () => {
    // A client sending junk must not blank the time out.
    const out = formatInterviewTime(at, 'Not/A_Real/Timezone');
    expect(out).toContain('(UTC)');
    expect(out).not.toContain('Not/A_Real/Timezone');
  });

  it('treats empty and whitespace as no timezone', () => {
    expect(formatInterviewTime(at, '')).toContain('(UTC)');
    expect(formatInterviewTime(at, '   ')).toContain('(UTC)');
  });
});
