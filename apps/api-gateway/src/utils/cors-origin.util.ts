const TRAILING_SLASHES_REGEX = /\/+$/;
const WILDCARD_ORIGIN_REGEX = /^(https?):\/\/\*\.(.+?)(?::(\d+))?$/i;

export const normalizeOrigin = (origin: string): string =>
  origin.trim().replace(TRAILING_SLASHES_REGEX, '').toLowerCase();

export const parseAllowedOrigins = (
  ...originSources: Array<string | undefined | null>
): string[] => {
  const allOrigins = originSources
    .flatMap((source) => (source || '').split(','))
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

  return Array.from(new Set(allOrigins));
};

const wildcardOriginMatches = (
  wildcardOrigin: string,
  requestOrigin: string,
): boolean => {
  const wildcardMatch = wildcardOrigin.match(WILDCARD_ORIGIN_REGEX);
  if (!wildcardMatch) return false;

  try {
    const [, wildcardProtocol, wildcardDomain, wildcardPort] = wildcardMatch;
    const requestUrl = new URL(requestOrigin);
    const requestProtocol = requestUrl.protocol.replace(':', '').toLowerCase();
    const requestHostname = requestUrl.hostname.toLowerCase();
    const requestPort = requestUrl.port;

    if (requestProtocol !== wildcardProtocol.toLowerCase()) return false;
    if (
      requestHostname !== wildcardDomain.toLowerCase() &&
      !requestHostname.endsWith(`.${wildcardDomain.toLowerCase()}`)
    ) {
      return false;
    }
    if (wildcardPort && requestPort !== wildcardPort) return false;
    return true;
  } catch {
    return false;
  }
};

export const isOriginAllowed = (
  origin: string | undefined,
  allowedOrigins: string[],
): boolean => {
  // Allow requests with no Origin (mobile apps, cURL, health checks)
  if (!origin) return true;

  const normalizedRequestOrigin = normalizeOrigin(origin);

  // Safe fallback for development if nothing is configured
  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.some(
    (allowedOrigin) =>
      allowedOrigin === '*' ||
      allowedOrigin === normalizedRequestOrigin ||
      wildcardOriginMatches(allowedOrigin, normalizedRequestOrigin),
  );
};
