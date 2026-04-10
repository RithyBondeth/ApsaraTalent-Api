export const RESUME = {
  /** Profile picture dimensions in pixels (square crop) */
  AVATAR_SIZE: 300,
  /** Puppeteer page-render timeout for PDF generation — 30 seconds */
  GENERATION_TIMEOUT: 30_000,
  /** Gateway-level timeout for the full build-resume RPC — ~3 minutes */
  CONTROLLER_TIMEOUT: 170_000,
} as const;

export const RESUME_BUILDER_SERVICE = {
  NAME: 'RESUME_BUILDER_SERVICE',
  ACTIONS: {
    BUILD_RESUME: { cmd: 'build-resume' },
    FIND_ALL_RESUME_TEMPLATES: { cmd: 'find-all-resume-templates' },
    FIND_ONE_RESUME_TEMPLATE: { cmd: 'find-one-resume-template' },
    CREATE_RESUME_TEMPLATE: { cmd: 'create-resume-template' },
    SEARCH_RESUME_TEMPLATE: { cmd: 'search-resume-template' },
  },
};
