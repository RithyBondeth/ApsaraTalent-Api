import axios from 'axios';
import { PaymentService } from './payment-service.service';
import {
  BakongConfigurationException,
  BakongQRValidationException,
} from './exceptions/bakong.exceptions';

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));

describe('PaymentService Bakong boundary', () => {
  const post = jest.fn();
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };
  const repository = {};

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue({ post });
  });

  function createService(): PaymentService {
    const config = {
      get: jest.fn().mockReturnValue({
        developerToken: 'test-token',
        apiBaseUrl: 'http://bakong.invalid',
        apiTimeout: 100,
      }),
    };
    return new PaymentService(
      config as any,
      logger as any,
      repository as any,
      repository as any,
    );
  }

  it('refuses to start without a developer token', () => {
    const config = { get: jest.fn().mockReturnValue({}) };
    expect(
      () =>
        new PaymentService(
          config as any,
          logger as any,
          repository as any,
          repository as any,
        ),
    ).toThrow(BakongConfigurationException);
  });

  it('maps successful and rejected QR verification responses', async () => {
    const service = createService();
    post
      .mockResolvedValueOnce({
        data: { response_code: '00', qr_data: { amount: 1000 } },
      })
      .mockResolvedValueOnce({
        data: { response_code: '12', error_message: 'Invalid QR' },
      });

    await expect(service.verifyKhqr({ qrString: 'valid' })).resolves.toEqual(
      expect.objectContaining({ success: true, isValid: true }),
    );
    await expect(service.verifyKhqr({ qrString: 'invalid' })).resolves.toEqual(
      expect.objectContaining({ success: false, isValid: false }),
    );
    expect(post).toHaveBeenNthCalledWith(1, '/v1/verify_khqr', {
      qr_string: 'valid',
    });
  });

  it('converts network failures into a stable domain exception', async () => {
    const service = createService();
    post.mockRejectedValue(new Error('connection refused'));

    await expect(service.verifyKhqr({ qrString: 'qr' })).rejects.toBeInstanceOf(
      BakongQRValidationException,
    );
  });
});
