import { IsArray, IsString } from 'class-validator';
import { BuildResumeDTO } from './build-resume.dto';

export class OptimizeResumeDTO extends BuildResumeDTO {}

export class ExperienceSuggestionDTO {
  index: number;
  improvedDescription: string;
  improvedAchievements: string[];
}

export class OptimizeResumeResponseDTO {
  @IsString()
  overallFeedback: string;

  @IsString()
  suggestedSummary: string;

  @IsArray()
  experienceSuggestions: ExperienceSuggestionDTO[];

  @IsArray()
  @IsString({ each: true })
  suggestedSkills: string[];

  constructor(partial: Partial<OptimizeResumeResponseDTO>) {
    Object.assign(this, partial);
  }
}
