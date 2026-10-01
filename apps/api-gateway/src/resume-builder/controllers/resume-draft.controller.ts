import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
  UseGuards,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IsInt,
  IsObject,
  IsString,
  MaxLength,
  Min,
  MinLength,
  IsUUID,
} from 'class-validator';
import { isDeepStrictEqual } from 'node:util';
import { Transform } from 'class-transformer';
import { AuthGuard, AuthenticatedUser } from '@app/common/guards/auth.guard';
import { ResumeDraft } from '@app/common/database/entities/resume-draft.entity';

// Drafts may be incomplete. BuildResumeDTO validation applies when exporting.
export class SaveResumeDraftDTO {
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsObject()
  content: Record<string, unknown>;
}

export class UpdateResumeDraftDTO extends SaveResumeDraftDTO {
  @IsInt()
  @Min(1)
  revision: number;
}

export class CreateResumeDraftDTO extends SaveResumeDraftDTO {
  @IsUUID()
  id: string;
}

type AuthRequest = { user: AuthenticatedUser };

@Controller('resume/drafts')
@UseGuards(AuthGuard)
export class ResumeDraftController {
  constructor(
    @InjectRepository(ResumeDraft)
    private readonly drafts: Repository<ResumeDraft>,
  ) {}

  private validateContent(content: Record<string, unknown>) {
    if (
      Buffer.byteLength(JSON.stringify(content), 'utf8') > 200_000 ||
      !content.personalInfo ||
      typeof content.personalInfo !== 'object' ||
      Array.isArray(content.personalInfo) ||
      !Array.isArray(content.skills) ||
      !Array.isArray(content.experience) ||
      (Array.isArray(content.skills) &&
        content.skills.some((skill) => typeof skill !== 'string')) ||
      (Array.isArray(content.experience) &&
        content.experience.some(
          (row) =>
            !row ||
            typeof row !== 'object' ||
            Array.isArray(row) ||
            (row.achievements !== undefined &&
              (!Array.isArray(row.achievements) ||
                row.achievements.some(
                  (value: unknown) => typeof value !== 'string',
                ))),
        )) ||
      typeof content.template !== 'string'
    ) {
      throw new BadRequestException(
        'Invalid resume draft or draft exceeds 200 KB.',
      );
    }
  }

  @Get()
  list(@Req() req: AuthRequest) {
    return this.drafts.find({
      where: { userId: req.user.id },
      order: { updatedAt: 'DESC' },
      select: ['id', 'name', 'revision', 'createdAt', 'updatedAt'],
    });
  }

  @Get(':id')
  async read(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    const draft = await this.drafts.findOneBy({ id, userId: req.user.id });
    if (!draft) throw new NotFoundException('Resume not found.');
    return draft;
  }

  @Post()
  async create(@Req() req: AuthRequest, @Body() dto: CreateResumeDraftDTO) {
    this.validateContent(dto.content);
    await this.drafts
      .createQueryBuilder()
      .insert()
      .into(ResumeDraft)
      .values({
        id: dto.id,
        userId: req.user.id,
        name: dto.name,
        content: () => ':content::jsonb',
      })
      .setParameter('content', JSON.stringify(dto.content))
      .orIgnore()
      .execute();
    const record = await this.read(req, dto.id);
    if (
      record.name !== dto.name ||
      !isDeepStrictEqual(record.content, dto.content)
    ) {
      throw new ConflictException(
        'This resume already exists with different edits. Save as a new resume to keep both.',
      );
    }
    return record;
  }

  @Put(':id')
  async update(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResumeDraftDTO,
  ) {
    this.validateContent(dto.content);
    // Compare and increment in one statement: stale devices cannot overwrite edits.
    const result = await this.drafts
      .createQueryBuilder()
      .update(ResumeDraft)
      .set({
        name: dto.name,
        content: () => ':content::jsonb',
        revision: () => '"revision" + 1',
      })
      .setParameter('content', JSON.stringify(dto.content))
      .where('"id" = :id AND "userId" = :userId AND "revision" = :revision', {
        id,
        userId: req.user.id,
        revision: dto.revision,
      })
      .returning('*')
      .execute();
    if (!result.affected) {
      const current = await this.read(req, id);
      if (
        current.revision === dto.revision + 1 &&
        current.name === dto.name &&
        isDeepStrictEqual(current.content, dto.content)
      )
        return current;
      throw new ConflictException(
        'This resume changed on another device. Reopen it or save your edits as a new resume.',
      );
    }
    return result.raw[0];
  }

  @Delete(':id')
  async remove(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.drafts.delete({ id, userId: req.user.id });
    if (!result.affected) throw new NotFoundException('Resume not found.');
    return { deleted: true };
  }
}
