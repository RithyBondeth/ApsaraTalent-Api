import {
  UNKNOWN_RELEASE,
  resolveRelease,
  resolveReleaseLabel,
} from './release.util';

describe('resolveRelease', () => {
  it('prefers the release CI passes explicitly', () => {
    expect(
      resolveRelease({
        SENTRY_RELEASE: 'ci-sha',
        RAILWAY_GIT_COMMIT_SHA: 'railway-sha',
        GITHUB_SHA: 'actions-sha',
      }),
    ).toBe('ci-sha');
  });

  it('falls back to the Railway commit SHA for git-triggered builds', () => {
    expect(
      resolveRelease({
        RAILWAY_GIT_COMMIT_SHA: 'railway-sha',
        GITHUB_SHA: 'actions-sha',
      }),
    ).toBe('railway-sha');
  });

  it('falls back to GITHUB_SHA inside Actions', () => {
    expect(resolveRelease({ GITHUB_SHA: 'actions-sha' })).toBe('actions-sha');
  });

  // `ENV SENTRY_RELEASE=${SENTRY_RELEASE}` with no build arg bakes an empty
  // string into the image. It must not shadow a real value below it.
  it('treats empty and whitespace-only values as unset', () => {
    expect(
      resolveRelease({
        SENTRY_RELEASE: '',
        RAILWAY_GIT_COMMIT_SHA: '   ',
        GITHUB_SHA: 'actions-sha',
      }),
    ).toBe('actions-sha');
  });

  it('trims surrounding whitespace', () => {
    expect(resolveRelease({ SENTRY_RELEASE: '  ci-sha\n' })).toBe('ci-sha');
  });

  it('returns undefined when nothing is set', () => {
    expect(resolveRelease({})).toBeUndefined();
  });
});

describe('resolveReleaseLabel', () => {
  it('renders the resolved release', () => {
    expect(resolveReleaseLabel({ SENTRY_RELEASE: 'ci-sha' })).toBe('ci-sha');
  });

  it('renders "unknown" rather than an empty string', () => {
    expect(resolveReleaseLabel({})).toBe(UNKNOWN_RELEASE);
    expect(resolveReleaseLabel({})).toBe('unknown');
  });
});
