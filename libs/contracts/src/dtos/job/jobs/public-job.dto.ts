import { EWorkMode } from '@app/common/database/enums/work-mode.enum';
import { IsUUID } from 'class-validator';

/**
 * The company as an anonymous visitor sees it on a job page.
 *
 * Built field-by-field rather than by excluding things from
 * `CompanyInJobResponseDTO`, and that is the point: this object is served
 * without a session and is indexed by search engines, so what it contains has
 * to be a decision someone made rather than a leftover from a shape designed
 * for signed-in users. In particular there is no `user` relation here at all —
 * the authenticated DTO carries one with twenty-odd `@Exclude()` fields, and a
 * single missed decorator there would publish an email address.
 */
export class PublicCompanyInJobDTO {
  id: string;
  name: string;
  avatar: string | null;
  industry: string | null;
  location: string | null;
  companySize: number | null;

  constructor(partial: Partial<PublicCompanyInJobDTO>) {
    Object.assign(this, partial);
  }
}

/**
 * One job posting, for the public job page.
 *
 * Plain properties, no `@Expose()` getters. `JobResponseDTO` derives `skills`,
 * `experience`, `postedDate` and `deadlineDate` from getters, which do not
 * survive `JSON.stringify` — so every Redis hit has to rebuild the DTO to get
 * them back, and every site that forgets returns a different shape than a miss.
 * This one is computed once in the service and is the same object either way.
 *
 * Dates are ISO strings rather than the DD/MM/YYYY the app uses elsewhere: the
 * page renders them in the reader's locale and puts them in JSON-LD, and
 * Google's `JobPosting` schema requires ISO 8601.
 */
export class PublicJobDetailDTO {
  id: string;
  title: string;
  description: string;
  type: string;
  experienceRequired: string;
  educationRequired: string;
  skills: string[];
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  workMode: EWorkMode | null;
  location: string | null;
  languagesRequired: string[];
  openingsCount: number | null;
  /** ISO 8601, or null when the posting does not expire. */
  expireDate: string | null;
  /** ISO 8601. */
  createdAt: string;
  company: PublicCompanyInJobDTO;

  constructor(partial: Partial<PublicJobDetailDTO>) {
    Object.assign(this, partial);
  }
}

export class FindOneJobDTO {
  @IsUUID()
  jobId: string;

  constructor(partial: Partial<FindOneJobDTO>) {
    Object.assign(this, partial);
  }
}

/** One entry in the sitemap: enough to write a `<url>`, and nothing else. */
export class PublicJobSitemapEntryDTO {
  id: string;
  /** ISO 8601 — becomes `<lastmod>`. */
  updatedAt: string;

  constructor(partial: Partial<PublicJobSitemapEntryDTO>) {
    Object.assign(this, partial);
  }
}
