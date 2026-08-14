/**
 * Presentation helpers for resume HTML: escaping, social-link normalisation and
 * small text/image formatters. Pure functions, safe to unit-test in isolation.
 */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const SOCIAL_PLATFORM_LABELS: Record<string, string> = {
  behance: 'Behance',
  dribbble: 'Dribbble',
  facebook: 'Facebook',
  github: 'GitHub',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  portfolio: 'Portfolio',
  telegram: 'Telegram',
  tiktok: 'TikTok',
  twitter: 'X',
  website: 'Website',
  x: 'X',
  youtube: 'YouTube',
};

export function formatSocialPlatformLabel(platform: string): string {
  const cleanedPlatform = platform
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\s*(?:url|link)\s*$/i, '')
    .trim();
  const normalizedPlatform = cleanedPlatform.replace(/\s+/g, '').toLowerCase();

  if (SOCIAL_PLATFORM_LABELS[normalizedPlatform]) {
    return SOCIAL_PLATFORM_LABELS[normalizedPlatform];
  }

  return (
    cleanedPlatform
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'Website'
  );
}

export function normalizeSocialLinkUrl(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  let candidate = trimmedValue;
  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate)) {
    if (/^[a-z][a-z\d+.-]*:/i.test(candidate)) return null;
    candidate = `https://${candidate}`;
  }

  try {
    const parsedUrl = new URL(candidate);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
      ? candidate
      : null;
  } catch {
    return null;
  }
}

export function formatYearsExperience(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';
  if (/\b(?:experience|exp\.?)\s*$/i.test(trimmedValue)) return trimmedValue;
  if (/\b(?:years?|yrs?\.?)\s*$/i.test(trimmedValue)) {
    return `${trimmedValue} exp.`;
  }
  return `${trimmedValue} yrs exp.`;
}

export function dataImage(value?: string): string | null {
  if (!value) return null;
  return /^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(value)
    ? value
    : null;
}

export function monogram(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return esc(initials || 'CV');
}
