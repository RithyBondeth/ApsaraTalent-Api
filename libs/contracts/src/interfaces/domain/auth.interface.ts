import { Response } from 'express';

export type OAuthProvider = 'google' | 'linkedin' | 'github' | 'facebook';

export interface ISocialAuthResult {
  accessToken: string;
  refreshToken?: string | null;
  newUser?: boolean;
  email?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  picture?: string | null;
  role?: string | null;
  provider?: string | null;
  lastLoginMethod?: string | null;
  lastLoginAt?: string | Date | null;
}

export interface ISuccessHtmlOptions {
  targetOrigin: string;
  successType: string;
  remember: boolean;
  result: ISocialAuthResult;
}

export interface IErrorHtmlOptions {
  targetOrigin: string;
  errorType: string;
  errorMessage: string;
}

export interface ISocialAuthCallbackOptions {
  req: any;
  res: Response;
  action: unknown;
  payload: unknown;
  providerLabel: string;
  successType: string;
  errorType: string;
  failureMessage: string;
  timeoutMs?: number;
}

export interface ISetAuthTokenCookiesOptions {
  accessToken: string;
  refreshToken?: string | null;
  accessMaxAge?: number;
  refreshMaxAge?: number;
  isProduction?: boolean;
}

export interface ISetRememberCookieOptions {
  maxAge: number;
  isProduction?: boolean;
}

export interface IParsedResumeData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  /**
   * Candidate's city or province in Cambodia. Must be EXACTLY one of:
   * "Phnom Penh" | "Banteay Meanchey" | "Battambang" | "Kampong Cham" |
   * "Kampong Chhnang" | "Kampong Speu" | "Kampong Thom" | "Kampot" |
   * "Kandal" | "Kep" | "Koh Kong" | "Kratie" | "Mondulkiri" |
   * "Oddar Meanchey" | "Pailin" | "Preah Sihanouk" | "Preah Vihear" |
   * "Prey Veng" | "Pursat" | "Ratanakiri" | "Siem Reap" | "Stung Treng" |
   * "Svay Rieng" | "Takeo" | "Tbong Khmum"
   */
  location?: string;
  jobTitle?: string;
  /**
   * Must be one of the exact values used in the signup form:
   * "No Experience" | "Less than 1 year" | "1 - 2 years" |
   * "3 - 5 years" | "6 - 10 years" | "10+ years"
   */
  yearsOfExperience?: string;
  /**
   * Must be one of: "full_time" | "part_time" | "internship" |
   * "contract" | "freelance" | "remote"
   */
  availability?: string;
  /** Professional summary / bio, max ~300 characters. */
  description?: string;
  skills?: string[];
  experiences?: Array<{
    title: string;
    company?: string;
    description: string;
    /** ISO date string YYYY-MM-DD */
    startDate: string;
    /** ISO date string YYYY-MM-DD  (use today if currently employed) */
    endDate: string;
  }>;
  educations?: Array<{
    school: string;
    degree: string;
    /** Graduation year as an integer, e.g. 2020 */
    year: number;
  }>;
  /**
   * Career interest categories.  Only use values from this list:
   * Software Engineering, Frontend Development, Backend Development,
   * Mobile App Development, Full Stack Development, UI/UX Design,
   * Data Science & Analytics, Machine Learning & AI, Cloud & DevOps,
   * Cybersecurity, Project Management, Business Analysis,
   * Digital Marketing, Graphic Design, Content Writing,
   * Customer Service, Human Resources, Finance & Accounting,
   * Sales, Teaching & Education, Healthcare, Legal, Other.
   */
  careerScopes?: string[];
}
