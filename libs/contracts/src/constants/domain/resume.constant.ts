export const RESUME = {
  /** Profile picture dimensions in pixels (square crop) */
  AVATAR_SIZE: 300,
  /** Puppeteer page-render timeout for PDF generation — 30 seconds */
  GENERATION_TIMEOUT: 30_000,
  /** Gateway-level timeout for the full build-resume RPC — ~3 minutes */
  CONTROLLER_TIMEOUT: 170_000,
  /** Maximum characters of resume text to pass to OpenAI. */
  MAX_TEXT_CHARS: 8_000,
  /** Cache TTL for resume templates */
  TEMPLATE_TTL: 60 * 60 * 1000, // 1 hour — static data
  /** Cache TTL for resume template search */
  TEMPLATE_SEARCH_TTL: 30 * 60 * 1000, // 30 min
} as const;
