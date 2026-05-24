import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';

/** Maximum characters of resume text to pass to OpenAI. */
const MAX_TEXT_CHARS = 8_000;

/** Fields extracted from a candidate's resume. All fields are optional. */
export interface ParsedResumeData {
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

@Injectable()
export class ResumeParseService {
  private readonly logger = new Logger(ResumeParseService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get<string>('openai.apiKey') });
    this.model = config.get<string>('openai.model') ?? 'gpt-4o-mini';
  }

  /**
   * Parses a PDF resume buffer and returns structured candidate data.
   * Falls back to an empty object on any extraction failure.
   */
  async parseResume(
    fileBuffer: Buffer,
    mimetype: string,
  ): Promise<ParsedResumeData> {
    const text = await this.extractText(fileBuffer, mimetype);
    if (!text.trim()) return {};
    return this.extractStructuredData(text);
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                     */
  /* ------------------------------------------------------------------ */

  private async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    if (!mimetype.includes('pdf')) {
      throw new BadRequestException(
        'Only PDF resumes are supported at this time.',
      );
    }
    try {
      const { text } = await pdfParse(buffer);
      return (text as string).substring(0, MAX_TEXT_CHARS);
    } catch (err) {
      this.logger.warn(`PDF text extraction failed: ${err}`);
      throw new BadRequestException(
        'Could not read this PDF. Please upload a text-based PDF resume.',
      );
    }
  }

  private async extractStructuredData(
    resumeText: string,
  ): Promise<ParsedResumeData> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a resume parser. Extract information from the provided resume text and return a SINGLE valid JSON object.
                      Strictly follow these rules:
                      - firstName: candidate's first name (string)
                      - lastName: candidate's last name (string)
                      - email: candidate's email address (string)
                      - phone: candidate's phone number — digits only, no spaces or separators (e.g. "012345678" or "+85512345678")
                      - location: candidate's city or province in Cambodia — must be EXACTLY one of: "Phnom Penh", "Banteay Meanchey", "Battambang", "Kampong Cham", "Kampong Chhnang", "Kampong Speu", "Kampong Thom", "Kampot", "Kandal", "Kep", "Koh Kong", "Kratie", "Mondulkiri", "Oddar Meanchey", "Pailin", "Preah Sihanouk", "Preah Vihear", "Prey Veng", "Pursat", "Ratanakiri", "Siem Reap", "Stung Treng", "Svay Rieng", "Takeo", "Tbong Khmum" — omit if not found or not in Cambodia
                      - jobTitle: most recent or target job title (string)
                      - yearsOfExperience: must be EXACTLY one of: "No Experience", "Less than 1 year", "1 - 2 years", "3 - 5 years", "6 - 10 years", "10+ years"
                      - availability: must be EXACTLY one of: "full_time", "part_time", "internship", "contract", "freelance", "remote"
                      - description: professional summary, max 300 characters
                      - skills: flat array of skill name strings (e.g. ["React", "Node.js", "PostgreSQL"])
                      - experiences: array of work experience objects — use EXACTLY these keys:
                          [{ "title": "<job title>", "description": "<responsibilities / achievements>", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }, ...]
                          Use today's date (${new Date().toISOString().slice(0, 10)}) as endDate for roles still in progress.
                          Extract ALL positions listed in the resume.
                      - educations: array of education objects — use EXACTLY these keys:
                          [{ "school": "<institution name>", "degree": "<degree or certificate>", "year": <graduation year as integer> }, ...]
                          Extract ALL education entries listed in the resume.
                      - careerScopes: array of relevant career areas from this list only:
                        Software Engineering, Frontend Development, Backend Development, Mobile App Development,
                        Full Stack Development, UI/UX Design, Data Science & Analytics, Machine Learning & AI,
                        Cloud & DevOps, Cybersecurity, Project Management, Business Analysis, Digital Marketing,
                        Graphic Design, Content Writing, Customer Service, Human Resources, Finance & Accounting,
                        Sales, Teaching & Education, Healthcare, Legal, Other
                      - Omit any top-level key entirely if you cannot find its value — do not return null or empty strings
                      - Return ONLY the JSON object, no explanation`,
          },
          {
            role: 'user',
            content: `Parse this resume:\n\n${resumeText}`,
          },
        ],
      });

      const raw = response.choices[0]?.message?.content ?? '{}';
      return JSON.parse(raw) as ParsedResumeData;
    } catch (err) {
      this.logger.warn(`OpenAI resume parse failed: ${err}`);
      return {};
    }
  }
}
