import { HttpException, HttpStatus } from '@nestjs/common';
import {
  normalizeAuthServiceError,
  rethrowAuthServiceError,
  sendAuthServiceRequest,
} from './auth-rpc.util';

// Mock rpcCall so we don't need a real ClientProxy
jest.mock('../../utils/rpc-call', () => ({
  rpcCall: jest.fn(),
}));
import { rpcCall } from '../../utils/rpc-call';
const mockRpcCall = rpcCall as jest.Mock;

describe('auth-rpc.util', () => {
  afterEach(() => jest.clearAllMocks());

  // ─── normalizeAuthServiceError ────────────────────────────────────────────

  describe('normalizeAuthServiceError', () => {
    it('returns 500 fallback for null', () => {
      expect(normalizeAuthServiceError(null)).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });

    it('returns 500 fallback for a plain string', () => {
      expect(normalizeAuthServiceError('some string')).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });

    it('returns 500 fallback for a number', () => {
      expect(normalizeAuthServiceError(42)).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });

    it('extracts statusCode and message directly from error object', () => {
      const error = { statusCode: 401, message: 'Unauthorized' };
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('extracts from error.response nested object', () => {
      const error = { response: { statusCode: 403, message: 'Forbidden' } };
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: 403,
        message: 'Forbidden',
      });
    });

    it('extracts from error.error nested object', () => {
      const error = { error: { statusCode: 404, message: 'Not found' } };
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: 404,
        message: 'Not found',
      });
    });

    it('extracts from error.cause nested object', () => {
      const error = { cause: { statusCode: 422, message: 'Unprocessable' } };
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: 422,
        message: 'Unprocessable',
      });
    });

    it('uses fallback statusCode when only message is found', () => {
      const error = { message: 'Something went wrong' };
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Something went wrong',
      });
    });

    it('uses fallback message when only a valid statusCode is found', () => {
      const error = { statusCode: 400 };
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: 400,
        message: 'Internal server error',
      });
    });

    it('ignores invalid statusCode values (out of range)', () => {
      // statusCode 9999 should be ignored, fall through to JSON parse check
      const error = { statusCode: 9999 };
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });

    it('handles message as an array, picks the first string', () => {
      const error = {
        statusCode: 400,
        message: ['Field is required', 'Another error'],
      };
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: 400,
        message: 'Field is required',
      });
    });

    it('parses statusCode and message from JSON-stringified error.message', () => {
      // Wrap in an Error so none of the direct candidates have statusCode/message
      // as plain object properties — only error.message (a string) triggers JSON parse
      const error = new Error(
        JSON.stringify({ statusCode: 409, message: 'Conflict' }),
      );
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: 409,
        message: 'Conflict',
      });
    });

    it('falls back on invalid JSON in error.message', () => {
      const error = { message: 'not-valid-json' };
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'not-valid-json',
      });
    });

    it('falls back if JSON-parsed message is not a string', () => {
      // Use an Error object — direct candidate scan picks up `message` as string
      // and tries JSON.parse; parsedMessage is 123 (not string) → fallback
      const error = new Error(
        JSON.stringify({ statusCode: 200, message: 123 }),
      );
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
    });

    it('skips null candidates gracefully', () => {
      const error = {
        response: null,
        error: null,
        cause: null,
        statusCode: 200,
      };
      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: 200,
        message: 'Internal server error',
      });
    });

    it('ignores arrays without a string message and preserves a valid status', () => {
      expect(
        normalizeAuthServiceError({
          statusCode: 422,
          message: [null, 12, false],
        }),
      ).toEqual({
        statusCode: 422,
        message: 'Internal server error',
      });
    });

    it('parses a JSON message exposed only after candidate scanning', () => {
      let reads = 0;
      const error = {
        get message() {
          reads += 1;
          return reads < 3
            ? 123
            : JSON.stringify({ statusCode: 429, message: 'Try later' });
        },
      };

      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: 429,
        message: 'Try later',
      });
    });

    it('falls back when a late message is malformed JSON', () => {
      let reads = 0;
      const error = {
        get message() {
          reads += 1;
          return reads < 3 ? 123 : '{invalid';
        },
      };

      expect(normalizeAuthServiceError(error)).toEqual({
        statusCode: 500,
        message: 'Internal server error',
      });
    });
  });

  // ─── rethrowAuthServiceError ──────────────────────────────────────────────

  describe('rethrowAuthServiceError', () => {
    it('throws an HttpException with the normalized statusCode and message', () => {
      const error = { statusCode: 401, message: 'Not authenticated' };
      expect(() => rethrowAuthServiceError(error)).toThrow(HttpException);

      try {
        rethrowAuthServiceError(error);
      } catch (e) {
        const ex = e as HttpException;
        expect(ex.getStatus()).toBe(401);
        expect(ex.getResponse()).toBe('Not authenticated');
      }
    });

    it('throws 500 for unrecognised errors', () => {
      expect(() => rethrowAuthServiceError(null)).toThrow(HttpException);
      try {
        rethrowAuthServiceError(null);
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(500);
      }
    });
  });

  // ─── sendAuthServiceRequest ───────────────────────────────────────────────

  describe('sendAuthServiceRequest', () => {
    const mockClient: any = {}; // ClientProxy — not needed since rpcCall is mocked

    it('returns the RPC result on success', async () => {
      mockRpcCall.mockResolvedValue({ id: 'u1' });
      const result = await sendAuthServiceRequest(mockClient, 'AUTH_LOGIN', {
        email: 'a@b.com',
      });
      expect(result).toEqual({ id: 'u1' });
      expect(mockRpcCall).toHaveBeenCalledWith(mockClient, 'AUTH_LOGIN', {
        email: 'a@b.com',
      });
    });

    it('re-throws HttpException directly without wrapping', async () => {
      const httpEx = new HttpException('Already exists', 409);
      mockRpcCall.mockRejectedValue(httpEx);
      await expect(
        sendAuthServiceRequest(mockClient, 'AUTH_REGISTER', {}),
      ).rejects.toThrow(httpEx);
    });

    it('normalizes and rethrows non-HttpException errors as HttpException', async () => {
      mockRpcCall.mockRejectedValue({
        statusCode: 422,
        message: 'Invalid data',
      });
      await expect(
        sendAuthServiceRequest(mockClient, 'AUTH_REGISTER', {}),
      ).rejects.toThrow(HttpException);

      try {
        await sendAuthServiceRequest(mockClient, 'AUTH_REGISTER', {});
      } catch (e) {
        expect((e as HttpException).getStatus()).toBe(422);
      }
    });
  });
});
