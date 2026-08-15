import { Job } from '../database/entities/company/job.entity';
import {
  getJobSkillNames,
  normalizeSkillName,
  parseSkillList,
  skillOverlapRatio,
} from './skill.util';

const job = (partial: Partial<Job>) => partial as Job;

describe('skill utilities', () => {
  describe('normalizeSkillName', () => {
    it('collapses spelling variants of the same skill', () => {
      const forms = ['Node.js', 'node js', 'NodeJS', 'node-js', ' NODE.JS '];
      const normalized = new Set(forms.map(normalizeSkillName));
      expect(normalized.size).toBe(1);
    });

    it('keeps characters that distinguish real skills', () => {
      expect(normalizeSkillName('C++')).toBe('c++');
      expect(normalizeSkillName('C#')).toBe('c#');
      expect(normalizeSkillName('C++')).not.toBe(normalizeSkillName('C#'));
    });
  });

  describe('parseSkillList', () => {
    it('trims and drops empties', () => {
      expect(parseSkillList(' React , , TypeScript ,')).toEqual([
        'React',
        'TypeScript',
      ]);
    });

    it('returns nothing for absent values', () => {
      expect(parseSkillList(null)).toEqual([]);
      expect(parseSkillList('')).toEqual([]);
    });
  });

  describe('getJobSkillNames', () => {
    it('prefers the relation when it is loaded', () => {
      expect(
        getJobSkillNames(
          job({
            skillsRequired: 'Stale, Values',
            requiredSkills: [{ name: 'React' }, { name: 'Go' }] as never,
          }),
        ),
      ).toEqual(['React', 'Go']);
    });

    // Thirteen call sites load `openPositions` and most do not request the
    // join. Falling back keeps them scoring on the legacy column instead of
    // silently reporting a job with no requirements.
    it('falls back to the legacy column when the relation was not loaded', () => {
      expect(
        getJobSkillNames(job({ skillsRequired: 'React, TypeScript' })),
      ).toEqual(['React', 'TypeScript']);
    });

    it('falls back when the relation is loaded but empty', () => {
      expect(
        getJobSkillNames(
          job({ skillsRequired: 'React', requiredSkills: [] as never }),
        ),
      ).toEqual(['React']);
    });

    it('returns nothing when neither storage has anything', () => {
      expect(
        getJobSkillNames(
          job({ skillsRequired: '', requiredSkills: [] as never }),
        ),
      ).toEqual([]);
    });
  });

  describe('skillOverlapRatio', () => {
    it('scores the share of requirements a candidate meets', () => {
      expect(
        skillOverlapRatio(['React', 'Go'], ['React', 'TypeScript']),
      ).toBeCloseTo(0.5);
      expect(skillOverlapRatio(['React', 'TypeScript'], ['React'])).toBe(1);
    });

    // The whole point of normalizing: exact string equality scored this zero.
    it('matches across spelling variants', () => {
      expect(skillOverlapRatio(['NodeJS'], ['Node.js'])).toBe(1);
    });

    it('distinguishes no-data from a genuine zero', () => {
      expect(skillOverlapRatio([], ['React'])).toBeNull();
      expect(skillOverlapRatio(['React'], [])).toBeNull();
      expect(skillOverlapRatio(['Go'], ['React'])).toBe(0);
    });
  });
});
