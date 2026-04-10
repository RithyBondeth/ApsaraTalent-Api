export const JOB = {
  /** Default interview duration when none is specified (minutes) */
  DEFAULT_INTERVIEW_DURATION: 30,
  /** Sentinel for unbounded company-size filter (max signed int32) */
  MAX_COMPANY_SIZE: 2_147_483_647,
} as const;

export const JOB_SERVICE = {
  NAME: 'JOB_SERVICE',
  ACTIONS: {
    FIND_ALL_JOBS: { cmd: 'findAllJobs' },
    SEARCH_JOBS: { cmd: 'searchJobs' },
    FIND_ONE_JOB: { cmd: 'findOneJob' },
    EMPLOYEE_LIKES: { cmd: 'employeeLikes' },
    COMPANY_LIKES: { cmd: 'companyLikes' },
    FIND_CURRENT_EMPLOYEE_LIKED: { cmd: 'findCurrentEmployeeLiked' },
    FIND_CURRENT_COMPANY_LIKED: { cmd: 'findCurrentCompanyLiked' },
    FIND_CURRENT_EMPLOYEE_MATCHING: { cmd: 'findCurrentEmployeeMatching' },
    FIND_CURRENT_COMPANY_MATCHING: { cmd: 'findCurrentCompanyMatching' },
    FIND_CURRENT_EMPLOYEE_MATCHING_COUNT: {
      cmd: 'findCurrentEmployeeMatchingCount',
    },
    FIND_CURRENT_COMPANY_MATCHING_COUNT: {
      cmd: 'findCurrentCompanyMatchingCount',
    },
    GET_ANALYTICS: { cmd: 'getAnalytics' },
    CREATE_INTERVIEW: { cmd: 'createInterview' },
    GET_INTERVIEWS_BY_EMPLOYEE: { cmd: 'getInterviewsByEmployee' },
    GET_INTERVIEWS_BY_COMPANY: { cmd: 'getInterviewsByCompany' },
    UPDATE_INTERVIEW_STATUS: { cmd: 'updateInterviewStatus' },
  },
};
