import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  RefineProfileBioDTO,
  RefineProfileBioType,
} from '@app/contracts/dtos/resume';
import { IAiProfileBioService } from '@app/contracts';

@Injectable()
export class AiProfileBioService implements IAiProfileBioService {
  getMessages(
    refineProfileBioDTO: RefineProfileBioDTO,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    switch (refineProfileBioDTO.type) {
      case RefineProfileBioType.EMPLOYEE_BIO:
        return this.employeeBioMessages(refineProfileBioDTO);
      case RefineProfileBioType.EMPLOYEE_JOB_TITLE:
        return this.jobTitleMessages(refineProfileBioDTO);
      case RefineProfileBioType.COMPANY_BIO:
        return this.companyBioMessages(refineProfileBioDTO);
      case RefineProfileBioType.EXPERIENCE_DESCRIPTION:
        return this.experienceDescriptionMessages(refineProfileBioDTO);
      case RefineProfileBioType.ACHIEVEMENT_BULLET:
        return this.achievementBulletMessages(refineProfileBioDTO);
      case RefineProfileBioType.SKILL_SUGGESTION:
        return this.skillSuggestionMessages(refineProfileBioDTO);
      case RefineProfileBioType.EDUCATION_DESCRIPTION:
        return this.educationDescriptionMessages(refineProfileBioDTO);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Private prompt builders                                           */
  /* ------------------------------------------------------------------ */
  private employeeBioMessages(
    refineProfileBioDTO: RefineProfileBioDTO,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const context = this.buildContext([
      refineProfileBioDTO.jobTitle &&
        `Job title: ${refineProfileBioDTO.jobTitle}`,
      refineProfileBioDTO.experience &&
        `Experience: ${refineProfileBioDTO.experience}`,
      refineProfileBioDTO.availability &&
        `Availability: ${refineProfileBioDTO.availability}`,
      refineProfileBioDTO.skills &&
        refineProfileBioDTO.skills.length > 0 &&
        `Skills: ${refineProfileBioDTO.skills.join(', ')}`,
      refineProfileBioDTO.careerScopes &&
        refineProfileBioDTO.careerScopes.length > 0 &&
        `Career interests: ${refineProfileBioDTO.careerScopes.join(', ')}`,
    ]);

    const system = `You are a professional career coach writing first-person profile bios for a talent platform.
                    Guidelines:
                    - Write 2–4 sentences in first person (starting with "I")
                    - Be specific, professional, and engaging — avoid generic filler phrases
                    - Highlight their role, key skills, and the value they bring to a team
                    - Keep it concise (50–80 words)
                    - Output only the bio text — no headers, no quotes, no extra commentary`;

    const user = refineProfileBioDTO.currentText?.trim()
      ? `Improve this professional bio:\n"${refineProfileBioDTO.currentText}"\n\nCandidate context:\n${context}`
      : `Write a professional bio for this candidate:\n${context}`;

    return this.toMessages(system, user);
  }

  private jobTitleMessages(
    refineProfileBioDTO: RefineProfileBioDTO,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const context = this.buildContext([
      (refineProfileBioDTO.skills?.slice(0, 8).length ?? 0) > 0 &&
        `Skills: ${refineProfileBioDTO.skills!.slice(0, 8).join(', ')}`,
      refineProfileBioDTO.careerScopes &&
        refineProfileBioDTO.careerScopes.length > 0 &&
        `Career interests: ${refineProfileBioDTO.careerScopes.join(', ')}`,
    ]);

    const system = `You are a career coach. Return a clean, professional job title (2–5 words max).
                    Output only the job title — no explanation, no punctuation, no extra text.`;

    const user = refineProfileBioDTO.currentText?.trim()
      ? `Polish this job title: "${refineProfileBioDTO.currentText}"\n\nContext:\n${context}`
      : `Suggest a professional job title based on:\n${context}`;

    return this.toMessages(system, user);
  }

  private companyBioMessages(
    refineProfileBioDTO: RefineProfileBioDTO,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const context = this.buildContext([
      refineProfileBioDTO.companyName &&
        `Company: ${refineProfileBioDTO.companyName}`,
      refineProfileBioDTO.industry &&
        `Industry: ${refineProfileBioDTO.industry}`,
      refineProfileBioDTO.openPositions &&
        refineProfileBioDTO.openPositions.length > 0 &&
        `Open positions: ${refineProfileBioDTO.openPositions.slice(0, 5).join(', ')}`,
      refineProfileBioDTO.benefits &&
        refineProfileBioDTO.benefits.length > 0 &&
        `Benefits: ${refineProfileBioDTO.benefits.slice(0, 5).join(', ')}`,
      refineProfileBioDTO.values &&
        refineProfileBioDTO.values.length > 0 &&
        `Values: ${refineProfileBioDTO.values.slice(0, 5).join(', ')}`,
    ]);

    const system = `You are a professional copywriter specialising in employer branding for talent platforms.
                    Guidelines:
                    - Write 3–4 sentences in third person
                    - Highlight the company's mission, culture, and what makes it an exciting place to work
                    - Make it attractive and genuine to potential candidates
                    - Keep it concise (60–100 words)
                    - Output only the description text — no headers, no quotes, no extra commentary`;

    const user = refineProfileBioDTO.currentText?.trim()
      ? `Improve this company description:\n"${refineProfileBioDTO.currentText}"\n\nContext:\n${context}`
      : `Write a company description based on:\n${context}`;

    return this.toMessages(system, user);
  }

  private experienceDescriptionMessages(
    refineProfileBioDTO: RefineProfileBioDTO,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return this.toMessages(
      `You are a professional resume writer. Improve the provided work experience description to be more impactful and achievement-oriented.
        Guidelines:
        - Use active voice and strong action verbs
        - Quantify impact wherever possible (e.g. "Reduced load time by 30%")
        - Keep it concise: 2–4 sentences
        - Output only the improved description — no headers, no bullet prefixes, no extra commentary`,
      `Improve this experience description:\n"${refineProfileBioDTO.currentText}"`,
    );
  }

  private achievementBulletMessages(
    refineProfileBioDTO: RefineProfileBioDTO,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return this.toMessages(
      `You are a professional resume writer. Transform the provided achievement into a compelling resume bullet point.
        Guidelines:
        - Start with a strong action verb (e.g. "Led", "Reduced", "Implemented")
        - Quantify results where possible
        - Keep it to one concise sentence
        - Output only the improved bullet point — no dash prefix, no extra commentary`,
      `Improve this achievement bullet:\n"${refineProfileBioDTO.currentText}"`,
    );
  }

  private skillSuggestionMessages(
    refineProfileBioDTO: RefineProfileBioDTO,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const titleHint = refineProfileBioDTO.jobTitle
      ? `Job title: ${refineProfileBioDTO.jobTitle}`
      : (refineProfileBioDTO.currentText ?? '');
    return this.toMessages(
      `You are a career advisor. Suggest 8–12 relevant professional skills for the given job title or role.
        Output ONLY a comma-separated list of skill names — no explanations, no numbering, no bullet points.
        Example: React, TypeScript, Node.js, PostgreSQL, Docker`,
      `Suggest skills for: ${titleHint}`,
    );
  }

  private educationDescriptionMessages(
    refineProfileBioDTO: RefineProfileBioDTO,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return this.toMessages(
      `You are a professional resume writer. Reformat and improve the provided education field to be clear and professional.
        - Keep all factual details intact (school, degree, year)
        - Fix formatting inconsistencies and capitalisation
        - Output only the improved education text — no extra commentary`,
      `Improve this education entry:\n"${refineProfileBioDTO.currentText}"`,
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Private Helpers                                                   */
  /* ------------------------------------------------------------------ */

  private buildContext(lines: Array<string | false | undefined>): string {
    return lines.filter(Boolean).join('\n');
  }

  private toMessages(
    system: string,
    user: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    return [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
  }
}
