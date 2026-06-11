import { IAiMatchingService } from '@app/contracts';
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiMatchingService implements IAiMatchingService {
  getMatchExplanationMessages(
    employeeProfile: any,
    companyProfile: any,
    lang?: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const langInstructions =
      lang === 'km'
        ? '\nIMPORTANT: The EXPLANATION, STRENGTH, and GAP fields MUST be written entirely in Khmer language (ភាសាខ្មែរ).'
        : '';
    return [
      {
        role: 'system',
        content: `You are a talent matching expert. Analyze the compatibility between the candidate and company and output EXACTLY in this line-by-line format (no JSON, no markdown):
                  SCORE:<integer 0-100>
                  VERDICT:<exactly one of: Strong Match, Good Match, Partial Match, Weak Match>
                  EXPLANATION:<2-3 sentence explanation on a single line>
                  STRENGTH:<one specific strength>
                  STRENGTH:<one specific strength>
                  STRENGTH:<one specific strength>
                  STRENGTH:<one specific strength>
                  STRENGTH:<one specific strength>
                  GAP:<one area to improve>
                  GAP:<one area to improve>
                  GAP:<one area to improve>
                  Output only these lines. No extra text, no blank lines between them.${langInstructions}`,
      },
      {
        role: 'user',
        content: `Candidate:\n${JSON.stringify(employeeProfile, null, 2)}\n\nCompany:\n${JSON.stringify(companyProfile, null, 2)}`,
      },
    ];
  }

  getInterviewPrepMessages(
    employeeProfile: any,
    companyProfile: any,
    interviewTitle?: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const contextSuffix = interviewTitle
      ? `, and the specific interview round/type: "${interviewTitle}"`
      : '';

    const tailorNote = interviewTitle
      ? `\nIMPORTANT: Tailor question categories specifically for a "${interviewTitle}" interview. Technical Round → heavy Technical focus; Cultural/HR → Behavioral/Culture Fit; General → balanced.`
      : '';

    return [
      {
        role: 'system',
        content: `You are an expert interview coach. Given a candidate CV, a company profile${contextSuffix}, generate 12-15 likely interview questions with Khmer (ភាសាខ្មែរ) translations.${tailorNote}
                  Output ONLY raw NDJSON — one complete JSON object per line, nothing else. No outer array, no markdown fences, no explanations.
                  Each line must be a single JSON object:
                  {"question":"<english question>","questionKm":"<khmer translation>","category":"<Technical|Behavioral|Situational|Culture Fit>","tip":"<1-2 sentence english answer tip>","tipKm":"<khmer translation of tip>"}
                  After each object output a newline. All values on a single line. category must be one of: Technical, Behavioral, Situational, Culture Fit.`,
      },
      {
        role: 'user',
        content: `Candidate CV:\n${JSON.stringify(employeeProfile, null, 2)}\n\nCompany:\n${JSON.stringify(companyProfile, null, 2)}`,
      },
    ];
  }

  getSkillGapMessages(
    employeeProfile: any,
    companyProfile: any,
    lang?: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const langInstructions =
      lang === 'km'
        ? '\nIMPORTANT: All text values (skill, tip, topPriority) MUST be written entirely in Khmer language (ភាសាខ្មែរ) except for exact technical terms like React or Docker. The output structure must remain valid JSON.'
        : '';
    return [
      {
        role: 'system',
        content: `You are a career skills coach. Analyze the skill gap between a candidate's profile and a company's open positions.
                  Output ONLY raw NDJSON — one complete JSON object per line, nothing else. No outer arrays, no markdown, no explanations.
                  Step 1 — Matched skills (skills the candidate already has that appear in any job's requirements):
                  {"t":"matched","skill":"<skill name>"}

                  Step 2 — Missing skills (skills required by open positions that the candidate does NOT have):
                  {"t":"missing","skill":"<skill name>","criticality":"<high|medium|low>","positions":["<job title>"],"tip":"<practical 1-2 sentence learning advice with time estimate>"}

                  Step 3 — Exactly one summary line:
                  {"t":"summary","overallGap":"<none|small|moderate|large>","estimatedWeeks":<integer>,"topPriority":"<one sentence on the single most important skill to learn first>"}

                  Rules:
                  - Only include skills explicitly or implicitly mentioned in the job requirements
                  - criticality: high = required by 2+ positions or primary role; medium = 1 position; low = nice-to-have
                  - tip must be practical and specific with a time estimate like "~2 weeks"
                  - Keep skill names concise (e.g. "Docker", "React", "Project Management")
                  - Output 3-10 missing skills maximum
                  - estimatedWeeks: realistic total time to acquire all missing skills
                  - If no skill gap, output only the summary with overallGap:"none" and estimatedWeeks:0${langInstructions}`,
      },
      {
        role: 'user',
        content: `Candidate:\n${JSON.stringify(employeeProfile, null, 2)}\n\nCompany:\n${JSON.stringify(companyProfile, null, 2)}`,
      },
    ];
  }
}
