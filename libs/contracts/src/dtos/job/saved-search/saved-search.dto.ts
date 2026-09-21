import { ESavedSearchFrequency } from '@app/common/database/enums/saved-search-frequency.enum';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { SearchJobDTO } from '../jobs/search-job.dto';

export class CreateSavedSearchDTO {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  /**
   * The search DTO to persist. Validated as SearchJobDTO so a bad filter is
   * rejected at the door rather than at digest time when the user cannot see
   * the failure.
   */
  @ValidateNested()
  @Type(() => SearchJobDTO)
  @IsObject()
  filters: SearchJobDTO;

  @IsOptional()
  @IsEnum(ESavedSearchFrequency)
  frequency?: ESavedSearchFrequency;
}

export class UpdateSavedSearchDTO {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(ESavedSearchFrequency)
  frequency?: ESavedSearchFrequency;

  /**
   * Optional; when present replaces the filters wholesale. A saved search is
   * a snapshot the user can revise — this is how they revise it.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchJobDTO)
  @IsObject()
  filters?: SearchJobDTO;
}

export class SavedSearchResponseDTO {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  frequency: ESavedSearchFrequency;
  lastNotifiedAt: Date | null;
  lastResultJobIds: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<SavedSearchResponseDTO>) {
    Object.assign(this, partial);
  }
}

/**
 * The preview response: how many jobs the saved filters currently match, and
 * how many of those are new since the last digest. Used by the "Save search"
 * dialog so the user sees the shape of what they are subscribing to before
 * committing.
 */
export class SavedSearchPreviewResponseDTO {
  totalMatches: number;
  newMatchCount: number;

  constructor(partial: Partial<SavedSearchPreviewResponseDTO>) {
    Object.assign(this, partial);
  }
}
