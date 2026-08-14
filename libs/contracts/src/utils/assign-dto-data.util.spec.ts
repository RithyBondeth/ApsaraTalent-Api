import { assignDtoData } from './assign-dto-data.util';
import {
  CompanyResponseDTO,
  JobPositionResponseDTO,
  UserResponseDTO,
} from '../dtos/shared/user.dto';
import { EUserRole } from '@app/common/database/enums/user-role.enum';

/** A payload that has been through JSON, as every TCP reply and cache read has. */
const overTheWire = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('assignDtoData', () => {
  it('copies plain data unchanged', () => {
    class Plain {
      id!: string;
      name!: string;
    }
    const target = new Plain();
    assignDtoData(target, { id: 'a', name: 'b' });
    expect(target).toEqual({ id: 'a', name: 'b' });
  });

  it('skips a key the class exposes as a getter with no setter', () => {
    class WithGetter {
      items: string[] = [];
      get derived(): number {
        return this.items.length;
      }
    }
    const target = new WithGetter();

    expect(() =>
      assignDtoData(target, { items: ['x', 'y'], derived: 99 }),
    ).not.toThrow();
    // The getter recomputes from the data that was copied, so the stale
    // serialized value is correctly ignored rather than preserved.
    expect(target.derived).toBe(2);
  });

  it('still assigns through an accessor that has a setter', () => {
    class WithSetter {
      private internal = '';
      get value(): string {
        return this.internal;
      }
      set value(next: string) {
        this.internal = next;
      }
    }
    const target = new WithSetter();
    assignDtoData(target, { value: 'assigned' });
    expect(target.value).toBe('assigned');
  });

  it('ignores null and non-object payloads', () => {
    const target = { untouched: true };
    expect(() => assignDtoData(target, null)).not.toThrow();
    expect(() => assignDtoData(target, 'nope')).not.toThrow();
    expect(target).toEqual({ untouched: true });
  });
});

describe('response DTOs rebuilt from a serialized payload', () => {
  // chat-service reconstructs the counterpart from a TCP reply, where
  // class-transformer has already materialised the @Expose() getters into
  // ordinary keys. A bare Object.assign threw on those, so every chat with a
  // company failed before the message could be persisted.
  it('rebuilds a company whose computed keys survived serialization', () => {
    const payload = overTheWire({
      id: 'company-1',
      name: 'ACLEDA Bank',
      openPositions: [],
      availableTimes: ['full-time', 'part-time'],
    });

    expect(() => new CompanyResponseDTO(payload)).not.toThrow();
    const company = new CompanyResponseDTO(payload);
    expect(company.name).toBe('ACLEDA Bank');
    expect(company.availableTimes).toEqual([]);
  });

  it('rebuilds a job position carrying all five computed keys', () => {
    const payload = overTheWire({
      id: 'job-1',
      title: 'Engineer',
      skillsRequired: 'TypeScript, NestJS',
      experience: 'stale',
      education: 'stale',
      skills: ['stale'],
      deadlineDate: 'stale',
      postedDate: 'stale',
    });

    expect(() => new JobPositionResponseDTO(payload)).not.toThrow();
    expect(new JobPositionResponseDTO(payload).skills).toEqual([
      'TypeScript',
      'NestJS',
    ]);
  });

  it('rebuilds a user whose nested company came off the wire', () => {
    // Cast deliberately: the declared type says `company: CompanyResponseDTO`,
    // but what actually arrives over TCP is a partial plain object. That gap is
    // the whole reason this bug reached runtime without the compiler noticing.
    const payload = overTheWire({
      id: 'user-1',
      role: EUserRole.COMPANY,
      company: {
        id: 'company-1',
        name: 'ACLEDA Bank',
        availableTimes: ['full-time'],
      },
    }) as unknown as Partial<UserResponseDTO>;

    expect(() => new UserResponseDTO(payload)).not.toThrow();
    expect(new UserResponseDTO(payload).company?.name).toBe('ACLEDA Bank');
  });
});
