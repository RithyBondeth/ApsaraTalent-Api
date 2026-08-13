/**
 * Cache key builders.
 *
 * Pure string construction, kept out of RedisService so callers that only need
 * a key do not have to inject the cache client, and so every key shape for the
 * platform is readable in one place.
 */

/** Cache namespaces, one per owning service. */
export const CACHE_PREFIX = 'apsaratalent:user-service';
export const AUTH_CACHE_PREFIX = 'apsaratalent:auth';
export const JOB_CACHE_PREFIX = 'apsaratalent:job-service';
export const CHAT_CACHE_PREFIX = 'apsaratalent:chat-service';
export const RESUME_CACHE_PREFIX = 'apsaratalent:resume-service';
export const NOTIFICATION_CACHE_PREFIX = 'apsaratalent:notification-service';

export function generateUserKey(type: string, id: string): string {
  return `${CACHE_PREFIX}:user:${type}:${id}`;
}

export function generateEmployeeKey(type: string, id: string): string {
  return `${CACHE_PREFIX}:employee:${type}:${id}`;
}

export function generateCompanyKey(type: string, id: string): string {
  return `${CACHE_PREFIX}:company:${type}:${id}`;
}

export function generateListKey(entity: string, filters: any): string {
  const filterString = JSON.stringify(filters);
  return `${CACHE_PREFIX}:${entity}:list:${filterString}`;
}

export function generateSearchKey(entity: string, query: any): string {
  const sorted = Object.fromEntries(
    Object.entries(query).sort(([a], [b]) => a.localeCompare(b)),
  );
  return `${CACHE_PREFIX}:${entity}:search:${JSON.stringify(sorted)}`;
}

export function generateEmployeeFavoriteCountKey(employeeId: string): string {
  return generateEmployeeKey('favorite-count', employeeId);
}

export function generateCompanyFavoriteCountKey(companyId: string): string {
  return generateCompanyKey('favorite-count', companyId);
}

export function generateEmployeeFavoritesKey(employeeId: string): string {
  return generateEmployeeKey('favorites', employeeId);
}

export function generateCompanyFavoritesKey(companyId: string): string {
  return generateCompanyKey('favorites', companyId);
}

export function generateAuthSessionKey(userId: string): string {
  return `${AUTH_CACHE_PREFIX}:session:${userId}`;
}

export function generateJobListKey(): string {
  return `${JOB_CACHE_PREFIX}:job:list:all`;
}

export function generateJobSearchKey(query: any): string {
  const sorted = Object.fromEntries(
    Object.entries(query).sort(([a], [b]) => a.localeCompare(b)),
  );
  return `${JOB_CACHE_PREFIX}:job:search:${JSON.stringify(sorted)}`;
}

export function generateMatchingKey(type: string, id: string): string {
  return `${JOB_CACHE_PREFIX}:matching:${type}:${id}`;
}

export function generateRecentChatsKey(userId: string): string {
  return `${CHAT_CACHE_PREFIX}:chat:recent:${userId}`;
}

export function generateUnreadCountKey(userId: string): string {
  return `${CHAT_CACHE_PREFIX}:chat:unread-count:${userId}`;
}

export function generateTemplateListKey(): string {
  return `${RESUME_CACHE_PREFIX}:templates:all`;
}

export function generateTemplateDetailKey(templateId: string): string {
  return `${RESUME_CACHE_PREFIX}:templates:detail:${templateId}`;
}

export function generateTemplateSearchKey(query: any): string {
  return `${RESUME_CACHE_PREFIX}:templates:search:${JSON.stringify(query)}`;
}

export function generateNotificationUnreadCountKey(userId: string): string {
  return `${NOTIFICATION_CACHE_PREFIX}:unread-count:${userId}`;
}

export function generateNotificationListKey(
  userId: string,
  page: number,
  limit: number,
  unreadOnly: boolean,
): string {
  return `${NOTIFICATION_CACHE_PREFIX}:list:${userId}:page:${page}:limit:${limit}:unread:${unreadOnly}`;
}
