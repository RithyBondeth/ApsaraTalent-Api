import { Company } from '@app/common/database/entities/company/company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { getJobSkillNames } from '@app/common/utils/skill.util';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Logger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import {
  AiMatchExplanationDTO,
  AiMatchExplanationResponseDTO,
  AiInterviewPrepDTO,
  AiInterviewPrepResponseDTO,
} from '@app/contracts/dtos/job';
import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import { ConfigService } from '@nestjs/config';
import { AiClientService } from '@app/common/ai/ai-client.service';
import {
  AiMatchProfilesDTO,
  AiMatchProfilesResponseDTO,
} from '@app/contracts/dtos/job/matching/ai-match-profiles.dto';
import { IMatchingAiService } from '@app/contracts/interfaces/service/job-service.interface';
import { generateMatchingKey } from '@app/common/redis/redis-keys.util';

/**
 * OpenAI-backed match narration: why two sides fit, profile summaries, and
 * interview preparation. Every call is billed and latency-bound, so results
 * are cached. Split out of MatchingService.
 */
@Injectable()
export class MatchingAiService implements IMatchingAiService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    private readonly logger: Logger,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly aiClient: AiClientService,
  ) {}

  async getAiMatchExplanation(
    aiMatchExplanationDTO: AiMatchExplanationDTO,
  ): Promise<AiMatchExplanationResponseDTO> {
    const cacheKey = generateMatchingKey(
      `ai-explanation:${aiMatchExplanationDTO.eid}`,
      aiMatchExplanationDTO.cid,
    );
    const cached =
      await this.redisService.get<AiMatchExplanationResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const [employee, company] = await Promise.all([
        this.employeeRepo.findOne({
          where: { id: aiMatchExplanationDTO.eid },
          relations: ['skills', 'experiences', 'careerScopes', 'educations'],
        }),
        this.companyRepo.findOne({
          where: { id: aiMatchExplanationDTO.cid },
          relations: ['openPositions', 'benefits', 'values', 'careerScopes'],
        }),
      ]);

      if (!employee || !company) {
        throw new RpcException({
          message: 'Employee or Company not found.',
          statusCode: 404,
        });
      }

      const employeeProfile = {
        job: employee.job,
        yearsOfExperience: employee.yearsOfExperience,
        availability: employee.availability,
        description: employee.description,
        location: employee.location,
        skills: (employee.skills ?? []).map((s) => s.name),
        careerScopes: (employee.careerScopes ?? []).map((c) => c.name),
        education: (employee.educations ?? []).map(
          (e) => `${e.degree} at ${e.school}`,
        ),
        experience: (employee.experiences ?? []).map((e) => e.title),
      };

      const companyProfile = {
        name: company.name,
        industry: company.industry,
        description: company.description,
        companySize: company.companySize,
        location: company.location,
        openPositions: (company.openPositions ?? []).map((j) => ({
          title: j.title,
          skillsRequired: getJobSkillNames(j).join(', '),
          experienceRequired: j.experienceRequired,
          type: j.type,
        })),
        careerScopes: (company.careerScopes ?? []).map((c) => c.name),
      };

      const { client, model } = this.aiClient.forTask('matchExplanation');
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a talent matching expert. Analyze the compatibility between a candidate and a company and return a JSON object with exactly these fields:
                      - "score": (number 0-100) overall compatibility score
                      - "verdict": (string) one-line verdict like "Strong Match", "Good Match", "Partial Match", or "Weak Match"
                      - "explanation": (string) 2-3 sentence explanation of the match
                      - "strengths": (string[]) 3-5 specific reasons why they are a good fit
                      - "gaps": (string[]) 2-3 areas where the candidate falls short or could improve
                      Return valid JSON only.`,
          },
          {
            role: 'user',
            content: `Analyze this match:\n\nCandidate:\n${JSON.stringify(employeeProfile, null, 2)}\n\nCompany:\n${JSON.stringify(companyProfile, null, 2)}`,
          },
        ],
      });

      const raw = completion.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const result = new AiMatchExplanationResponseDTO({
        score: parsed.score ?? 0,
        verdict: parsed.verdict ?? 'Unknown',
        explanation: parsed.explanation ?? '',
        strengths: parsed.strengths ?? [],
        gaps: parsed.gaps ?? [],
      });

      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error({ err: error }, 'AI match explanation failed');
      throw new RpcException(
        error instanceof Error ? error.message : 'AI match explanation failed',
      );
    }
  }

  async getAiMatchProfiles(
    aiMatchProfilesDTO: AiMatchProfilesDTO,
  ): Promise<AiMatchProfilesResponseDTO> {
    const [employee, company] = await Promise.all([
      this.employeeRepo.findOne({
        where: { id: aiMatchProfilesDTO.eid },
        relations: ['skills', 'experiences', 'careerScopes', 'educations'],
      }),
      this.companyRepo.findOne({
        where: { id: aiMatchProfilesDTO.cid },
        relations: ['openPositions', 'benefits', 'values', 'careerScopes'],
      }),
    ]);

    if (!employee || !company) {
      throw new RpcException({
        message: 'Employee or Company not found.',
        statusCode: 404,
      });
    }

    return {
      employeeProfile: {
        job: employee.job,
        yearsOfExperience: employee.yearsOfExperience,
        availability: employee.availability,
        description: employee.description,
        location: employee.location,
        skills: (employee.skills ?? []).map((s) => s.name),
        careerScopes: (employee.careerScopes ?? []).map((c) => c.name),
        education: (employee.educations ?? []).map(
          (e) => `${e.degree} at ${e.school}`,
        ),
        experience: (employee.experiences ?? []).map((e) => e.title),
      },
      companyProfile: {
        name: company.name,
        industry: company.industry,
        description: company.description,
        companySize: company.companySize,
        location: company.location,
        openPositions: (company.openPositions ?? []).map((j) => ({
          title: j.title,
          skillsRequired: getJobSkillNames(j).join(', '),
          experienceRequired: j.experienceRequired,
          type: j.type,
        })),
        careerScopes: (company.careerScopes ?? []).map((c) => c.name),
      },
    };
  }

  async getAiInterviewPrep(
    aiInterviewPrepDTO: AiInterviewPrepDTO,
  ): Promise<AiInterviewPrepResponseDTO> {
    const titleSlug = aiInterviewPrepDTO.interviewTitle
      ? `:${aiInterviewPrepDTO.interviewTitle.toLowerCase().replace(/\s+/g, '-').slice(0, 60)}`
      : '';
    const cacheKey = generateMatchingKey(
      `ai-interview-prep:${aiInterviewPrepDTO.eid}${titleSlug}`,
      aiInterviewPrepDTO.cid,
    );
    const cached =
      await this.redisService.get<AiInterviewPrepResponseDTO>(cacheKey);
    if (cached) return cached;

    try {
      const [employee, company] = await Promise.all([
        this.employeeRepo.findOne({
          where: { id: aiInterviewPrepDTO.eid },
          relations: ['skills', 'experiences', 'careerScopes', 'educations'],
        }),
        this.companyRepo.findOne({
          where: { id: aiInterviewPrepDTO.cid },
          relations: ['openPositions', 'values', 'careerScopes'],
        }),
      ]);

      if (!employee || !company) {
        throw new RpcException({
          message: 'Employee or Company not found.',
          statusCode: 404,
        });
      }

      const employeeProfile = {
        job: employee.job,
        yearsOfExperience: employee.yearsOfExperience,
        description: employee.description,
        skills: (employee.skills ?? []).map((s) => s.name),
        careerScopes: (employee.careerScopes ?? []).map((c) => c.name),
        education: (employee.educations ?? []).map((e) => ({
          degree: e.degree,
          school: e.school,
          year: e.year,
        })),
        experience: (employee.experiences ?? []).map((e) => ({
          title: e.title,
          description: e.description,
          startDate: e.startDate,
          endDate: e.endDate,
        })),
      };

      const companyProfile = {
        name: company.name,
        industry: company.industry,
        description: company.description,
        openPositions: (company.openPositions ?? []).map((j) => ({
          title: j.title,
          skillsRequired: getJobSkillNames(j).join(', '),
          experienceRequired: j.experienceRequired,
          type: j.type,
        })),
        values: (company.values ?? []).map((v) => v.label),
        careerScopes: (company.careerScopes ?? []).map((c) => c.name),
      };

      const { client, model } = this.aiClient.forTask('interviewPrep');
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an expert interview coach. Given a detailed candidate CV, a company profile${aiInterviewPrepDTO.interviewTitle ? `, and the specific interview round/type: "${aiInterviewPrepDTO.interviewTitle}"` : ''}, generate likely interview questions the candidate will face, each with a practical English answer tip AND a Khmer (ភាសាខ្មែរ) translation of both the question and the tip.
                      ${aiInterviewPrepDTO.interviewTitle ? `IMPORTANT: Tailor question categories and depth specifically for a "${aiInterviewPrepDTO.interviewTitle}" interview. For example, a Technical Round should heavily weight Technical questions; a Cultural/HR round should focus on Behavioral and Culture Fit; a General interview should be balanced.` : ''}

                      Return a JSON object with exactly this structure:
                      {
                        "questions": [
                          {
                            "question": "English question here",
                            "questionKm": "សំណួរជាភាសាខ្មែរ",
                            "category": "Technical",
                            "tip": "English answer tip here",
                            "tipKm": "គន្លឹះចម្លើយជាភាសាខ្មែរ"
                          },
                          ...
                        ]
                      }

                      Categories must be one of: "Technical", "Behavioral", "Culture Fit", "Situational".
                      Generate 12 to 15 questions — draw deeply from the candidate's specific work experience, education background, listed skills, and career scope. Make questions highly specific to their CV (reference actual job titles or skills they listed). Tips must be 1-2 sentences of concrete, actionable advice tailored to this candidate. Khmer translations must be natural and accurate. Return valid JSON only.`,
          },
          {
            role: 'user',
            content: `Candidate CV:\n${JSON.stringify(employeeProfile, null, 2)}\n\nCompany:\n${JSON.stringify(companyProfile, null, 2)}`,
          },
        ],
      });

      const raw = completion.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      const questions = (parsed.questions ?? []).map((q: any) => ({
        question: q.question ?? '',
        questionKm: q.questionKm ?? '',
        category: q.category ?? 'General',
        tip: q.tip ?? '',
        tipKm: q.tipKm ?? '',
      }));
      const result = new AiInterviewPrepResponseDTO({ questions });

      await this.redisService.set(cacheKey, result, CACHE_TTL.LONG);
      return result;
    } catch (error) {
      this.logger.error({ err: error }, 'AI interview prep failed');
      throw new RpcException(
        error instanceof Error ? error.message : 'AI interview prep failed',
      );
    }
  }
}
