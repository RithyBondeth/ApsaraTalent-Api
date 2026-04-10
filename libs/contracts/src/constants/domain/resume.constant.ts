export const RESUME = {
  /** Profile picture dimensions in pixels (square crop) */
  AVATAR_SIZE: 300,
  /** Puppeteer page-render timeout for PDF generation — 30 seconds */
  GENERATION_TIMEOUT: 30_000,
  /** Gateway-level timeout for the full build-resume RPC — ~3 minutes */
  CONTROLLER_TIMEOUT: 170_000,
} as const;
