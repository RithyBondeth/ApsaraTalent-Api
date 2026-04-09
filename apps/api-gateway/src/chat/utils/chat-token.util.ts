import { Socket } from 'socket.io';

/** Extracts JWT from handshake (auth object → Bearer header → query → cookie) */
export function extractChatToken(client: Socket): string | null {
  const normalizeToken = (value?: string | null): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase().startsWith('bearer ')) {
      const bearerToken = trimmed.slice(7).trim();
      return bearerToken || null;
    }
    return trimmed;
  };

  const auth = client.handshake.auth as Record<string, string> | undefined;
  const authToken = normalizeToken(auth?.token);
  if (authToken) return authToken;

  const authHeader = client.handshake.headers?.authorization;
  const headerToken = normalizeToken(
    Array.isArray(authHeader) ? authHeader[0] : authHeader,
  );
  if (headerToken) return headerToken;

  const queryToken = client.handshake.query?.token;
  const parsedQueryToken = normalizeToken(
    Array.isArray(queryToken) ? queryToken[0] : (queryToken as string),
  );
  if (parsedQueryToken) return parsedQueryToken;

  const cookieHeader = (client.handshake.headers?.cookie as string) || '';
  const cookieToken = cookieHeader.match(/auth-token=([^;]+)/)?.[1];
  return cookieToken ? decodeURIComponent(cookieToken) : null;
}
