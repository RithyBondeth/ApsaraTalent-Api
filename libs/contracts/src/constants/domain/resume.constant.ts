export const RESUME = {
  /** Profile picture dimensions in pixels (square crop) */
  AVATAR_SIZE: 300,
  /** Puppeteer page-render timeout for PDF generation — 30 seconds */
  GENERATION_TIMEOUT: 30_000,
  /** Max PDF renders running concurrently on the shared browser; excess queues. */
  PDF_MAX_CONCURRENCY: 4,
  /** Max requests waiting for a PDF render slot before the service rejects load. */
  PDF_MAX_QUEUE: 20,
  /** Gateway-level timeout for the full build-resume RPC — ~3 minutes */
  CONTROLLER_TIMEOUT: 170_000,
  /** Maximum characters of resume text to pass to OpenAI. */
  MAX_TEXT_CHARS: 8_000,
  /** Output-token caps for the AI-assisted resume tools. */
  AI_GENERATE_MAX_TOKENS: 1_800,
  AI_IMPORT_MAX_TOKENS: 2_600,
  AI_OPTIMIZE_MAX_TOKENS: 1_200,
  AI_COVER_LETTER_MAX_TOKENS: 600,
  AI_REFINE_MAX_TOKENS: 400,
  /** Cache TTL for resume templates */
  TEMPLATE_TTL: 60 * 60 * 1000, // 1 hour — static data
  /** Cache TTL for resume template search */
  TEMPLATE_SEARCH_TTL: 30 * 60 * 1000, // 30 min
} as const;
