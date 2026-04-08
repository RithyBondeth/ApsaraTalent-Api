/**
 * =========================================================================
 * REGEX CONSTANTS
 * =========================================================================
 */
// Matches one or more trailing slashes at the end of a string
const TRAILING_SLASHES_REGEX = /\/+$/;

// Matches wildcard subdomains (e.g., https://*.example.com)
// Captures: protocol, domain, and optional port
const WILDCARD_ORIGIN_REGEX = /^(https?):\/\/\*\.(.+?)(?::(\d+))?$/i;

/**
 * =========================================================================
 * STRING NORMALIZATION
 * =========================================================================
 *
 * Cleans an origin string by dropping leading/trailing spaces,
 * removing trailing slashes, and converting to lowercase.
 */
export const normalizeOrigin = (origin: string): string =>
  origin.trim().replace(TRAILING_SLASHES_REGEX, '').toLowerCase();

/**
 * =========================================================================
 * ORIGIN PARSING
 * =========================================================================
 *
 * Takes comma-separated strings (usually from .env files), flattens them,
 * normalizes them, and returns a deduplicated array of allowed origins.
 */
export const parseAllowedOrigins = (
  ...originSources: Array<string | undefined | null>
): string[] => {
  const allOrigins = originSources
    .flatMap((source) => (source || '').split(','))
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);

  return Array.from(new Set(allOrigins)); // Return unique origins
};

/**
 * =========================================================================
 * WILDCARD MATCHING
 * =========================================================================
 *
 * Checks if a requested origin matches a wildcard pattern.
 * E.g., request: "https://app.example.com" matches wildcard: "https://*.example.com"
 */
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

    // Reject if protocols do not match (http vs https)
    if (requestProtocol !== wildcardProtocol.toLowerCase()) return false;

    // Reject if root domains do not match
    if (
      requestHostname !== wildcardDomain.toLowerCase() &&
      !requestHostname.endsWith(`.${wildcardDomain.toLowerCase()}`)
    ) {
      return false;
    }

    // Reject if a port is explicitly defined in wildcard but doesn't match the requester
    if (wildcardPort && requestPort !== wildcardPort) return false;

    return true;
  } catch {
    return false; // Malformed URLs fail closed
  }
};

/**
 * =========================================================================
 * MAIN VALIDATION ROUTINE
 * =========================================================================
 *
 * Checks whether an incoming HTTP request Origin header is allowed.
 * Allows missing origins (CURL/Server requests), absolute matches,
 * explicit '*' placeholders, and RegExp wildcard boundaries.
 */
export const isOriginAllowed = (
  origin: string | undefined,
  allowedOrigins: string[],
): boolean => {
  // Allow requests with no Origin header (e.g. mobile apps, cURL, health checks)
  if (!origin) return true;

  const normalizedRequestOrigin = normalizeOrigin(origin);

  // Safe fallback for development if nothing is configured
  if (allowedOrigins.length === 0) return true;

  return allowedOrigins.some(
    (allowedOrigin) =>
      allowedOrigin === '*' || // Global wildcard match
      allowedOrigin === normalizedRequestOrigin || // Exact string match
      wildcardOriginMatches(allowedOrigin, normalizedRequestOrigin), // Subdomain Regex match
  );
};
