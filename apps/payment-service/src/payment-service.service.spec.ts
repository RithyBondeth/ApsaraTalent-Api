import axios from 'axios';
import * as QRCode from 'qrcode';
import { PaymentService } from './payment-service.service';
import {
  BakongApiConnectionException,
  BakongConfigurationException,
  BakongPaymentNotFoundException,
  BakongQRGenerationException,
  BakongQRValidationException,
} from './exceptions/bakong.exceptions';
import {
  PaymentStatus,
  PaymentType,
} from '@app/common/database/entities/payment/payment.entity';

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn() },
}));
jest.mock('qrcode', () => ({ toDataURL: jest.fn() }));

describe('PaymentService Bakong boundary', () => {
  const post = jest.fn();
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };
  const payments = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'payment-1', ...value })),
    findOne: jest.fn(),
  };
  const transactions = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue({ post });
    (QRCode.toDataURL as jest.Mock).mockResolvedValue(
      'data:image/png;base64,qr',
    );
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
      payments as any,
      transactions as any,
    );
  }

  it('refuses to start without a developer token', () => {
    const config = { get: jest.fn().mockReturnValue({}) };
    expect(
      () =>
        new PaymentService(
          config as any,
          logger as any,
          payments as any,
          transactions as any,
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

  it('generates and persists an individual QR payment', async () => {
    const service = createService();
    post.mockResolvedValue({
      data: { response_code: '00', qr_string: 'qr-value' },
    });

    const result = await service.generateIndividualKhqrDTO({
      bakongAccountId: 'person@bank',
      merchantName: 'Sok',
      merchantCity: 'Phnom Penh',
      amount: 1000,
      expirationMinutes: 10,
    } as any);

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        paymentId: 'payment-1',
        qrString: 'qr-value',
      }),
    );
    expect(payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentType: PaymentType.INDIVIDUAL,
        status: PaymentStatus.PENDING,
      }),
    );
    expect(QRCode.toDataURL).toHaveBeenCalledWith(
      'qr-value',
      expect.any(Object),
    );
  });

  it('generates and persists a merchant QR payment', async () => {
    const service = createService();
    post.mockResolvedValue({
      data: { response_code: '00', qr_string: 'merchant-qr' },
    });
    const result = await service.generateMerchantKhqrDTO({
      bakongAccountId: 'shop@bank',
      merchantName: 'Shop',
      merchantCity: 'Siem Reap',
      amount: 5000,
      merchantId: 'merchant-1',
      acquiringBank: 'BANK',
    } as any);
    expect(result.success).toBe(true);
    expect(payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentType: PaymentType.MERCHANT,
        merchantId: 'merchant-1',
      }),
    );
  });

  it('preserves Bakong QR rejection and maps QR-image failure', async () => {
    const service = createService();
    post.mockResolvedValueOnce({
      data: { response_code: '12', error_message: 'rejected' },
    });
    await expect(
      service.generateMerchantKhqrDTO({ merchantName: 'Shop' } as any),
    ).rejects.toBeInstanceOf(BakongQRGenerationException);

    post.mockResolvedValueOnce({
      data: { response_code: '00', qr_string: 'bad-image' },
    });
    (QRCode.toDataURL as jest.Mock).mockRejectedValueOnce(
      new Error('image failed'),
    );
    await expect(
      service.generateIndividualKhqrDTO({ merchantName: 'Sok' } as any),
    ).rejects.toBeInstanceOf(BakongQRGenerationException);
  });

  it('decodes valid QR data and rejects invalid responses', async () => {
    const service = createService();
    post
      .mockResolvedValueOnce({
        data: {
          response_code: '00',
          merchant_name: 'Shop',
          merchant_city: 'Phnom Penh',
          amount: 1200,
          currency: 'KHR',
          bakong_account_id: 'shop@bank',
        },
      })
      .mockResolvedValueOnce({
        data: { response_code: '12', error_message: 'invalid payload' },
      });
    await expect(service.decodeKhqr({ qrString: 'valid' })).resolves.toEqual(
      expect.objectContaining({
        success: true,
        decodedData: expect.objectContaining({ merchantName: 'Shop' }),
      }),
    );
    await expect(
      service.decodeKhqr({ qrString: 'invalid' }),
    ).rejects.toBeInstanceOf(BakongQRValidationException);
  });

  it('generates deep links and maps API failures', async () => {
    const service = createService();
    post.mockResolvedValueOnce({
      data: {
        response_code: '00',
        deep_link: 'bank://pay',
        short_url: 'https://short.invalid/x',
      },
    });
    await expect(
      service.generateDeepLink({
        qrString: 'qr',
        callback: 'https://callback.invalid',
      } as any),
    ).resolves.toEqual(
      expect.objectContaining({ success: true, deepLink: 'bank://pay' }),
    );

    post.mockRejectedValueOnce(new Error('offline'));
    await expect(
      service.generateDeepLink({ qrString: 'qr' } as any),
    ).rejects.toBeInstanceOf(BakongApiConnectionException);
  });

  it('returns an already-paid payment without calling Bakong', async () => {
    const service = createService();
    payments.findOne.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.PAID,
      amount: 1000,
      currency: 'KHR',
      transactions: [
        {
          status: 'success',
          transactionId: 'tx-1',
          createdAt: new Date('2026-01-01'),
          paidAt: new Date('2026-01-01'),
          payerName: 'Sok',
          payerPhone: '012',
        },
      ],
    });
    await expect(
      service.checkPaymentStatus({ md5Hash: '1234567890' }),
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        paymentStatus: PaymentStatus.PAID,
      }),
    );
    expect(post).not.toHaveBeenCalled();
  });

  it('records a successful payment status returned by Bakong', async () => {
    const service = createService();
    const payment = {
      id: 'payment-1',
      status: PaymentStatus.PENDING,
      transactions: [],
    };
    payments.findOne.mockResolvedValue(payment);
    post.mockResolvedValue({
      data: {
        response_code: '00',
        payment_data: {
          status: 'paid',
          transaction_id: 'tx-2',
          amount: 1000,
          currency: 'KHR',
          payer_name: 'Dara',
          paid_at: '2026-01-01T00:00:00Z',
        },
      },
    });
    const result = await service.checkPaymentStatus({ md5Hash: '1234567890' });
    expect(result).toEqual(
      expect.objectContaining({ paymentStatus: 'paid', transactionId: 'tx-2' }),
    );
    expect(payment.status).toBe(PaymentStatus.PAID);
    expect(transactions.save).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentId: 'payment-1',
        transactionId: 'tx-2',
      }),
    );
  });

  it('expires pending payments that Bakong cannot find', async () => {
    const service = createService();
    const payment = {
      id: 'payment-1',
      status: PaymentStatus.PENDING,
      transactions: [],
    };
    payments.findOne.mockResolvedValue(payment);
    post.mockResolvedValue({ data: { response_code: '01' } });
    await expect(
      service.checkPaymentStatus({ md5Hash: '1234567890' }),
    ).resolves.toEqual(
      expect.objectContaining({ success: false, paymentStatus: 'not_found' }),
    );
    expect(payment.status).toBe(PaymentStatus.EXPIRED);
    expect(payments.save).toHaveBeenCalledWith(payment);
  });

  it('rejects unknown local payments before contacting Bakong', async () => {
    const service = createService();
    payments.findOne.mockResolvedValue(null);
    await expect(
      service.checkPaymentStatus({ md5Hash: 'missing123' }),
    ).rejects.toBeInstanceOf(BakongPaymentNotFoundException);
    expect(post).not.toHaveBeenCalled();
  });

  it('summarizes bulk status responses', async () => {
    const service = createService();
    post.mockResolvedValue({
      data: {
        response_code: '00',
        payments: [
          { md5_hash: 'a', status: 'paid', payer_name: 'Sok' },
          { md5_hash: 'b', status: 'pending' },
          { md5_hash: 'c', status: 'expired' },
          { md5_hash: 'd', status: 'failed' },
        ],
      },
    });
    await expect(
      service.checkPaymentBulkStatus({ md5Hashes: ['a', 'b', 'c', 'd'] }),
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        totalChecked: 4,
        summary: { paid: 1, pending: 1, expired: 1, failed: 1 },
      }),
    );
  });

  it('rejects malformed individual and merchant QR responses', async () => {
    const service = createService();
    post.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({});

    await expect(
      service.generateIndividualKhqrDTO({ merchantName: 'Sok' } as any),
    ).rejects.toBeInstanceOf(BakongQRGenerationException);
    await expect(
      service.generateMerchantKhqrDTO({ merchantName: 'Shop' } as any),
    ).rejects.toBeInstanceOf(BakongQRGenerationException);
  });

  it('uses safe defaults for malformed verification and deep-link responses', async () => {
    const service = createService();
    post.mockResolvedValueOnce({}).mockResolvedValueOnce({ data: null });

    await expect(service.verifyKhqr({ qrString: 'qr' })).resolves.toEqual(
      expect.objectContaining({ success: false, isValid: false }),
    );
    await expect(
      service.generateDeepLink({ qrString: 'qr' } as any),
    ).rejects.toBeInstanceOf(BakongQRGenerationException);
  });

  it('rejects malformed decoded and single-status responses', async () => {
    const service = createService();
    post.mockResolvedValueOnce({ data: null });
    await expect(service.decodeKhqr({ qrString: 'qr' })).rejects.toBeInstanceOf(
      BakongQRValidationException,
    );

    payments.findOne.mockResolvedValueOnce({
      id: 'payment-1',
      status: PaymentStatus.PENDING,
      transactions: [],
    });
    post.mockResolvedValueOnce({});
    await expect(
      service.checkPaymentStatus({ md5Hash: '1234567890' }),
    ).rejects.toBeInstanceOf(BakongPaymentNotFoundException);
  });

  it('rejects malformed bulk responses and missing payment arrays', async () => {
    const service = createService();
    post.mockResolvedValueOnce({ data: null });
    await expect(
      service.checkPaymentBulkStatus({ md5Hashes: ['a'] }),
    ).rejects.toBeInstanceOf(BakongApiConnectionException);

    post.mockResolvedValueOnce({ data: { response_code: '00' } });
    await expect(
      service.checkPaymentBulkStatus({ md5Hashes: ['a'] }),
    ).rejects.toBeInstanceOf(BakongApiConnectionException);
  });

  it('maps persistence failures after a paid response to the API exception', async () => {
    const service = createService();
    payments.findOne.mockResolvedValue({
      id: 'payment-1',
      status: PaymentStatus.PENDING,
      transactions: [],
    });
    payments.save.mockRejectedValueOnce(new Error('database unavailable'));
    post.mockResolvedValue({
      data: {
        response_code: '00',
        payment_data: { status: 'paid', transaction_id: 'tx-1' },
      },
    });

    await expect(
      service.checkPaymentStatus({ md5Hash: '1234567890' }),
    ).rejects.toBeInstanceOf(BakongApiConnectionException);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'Failed to update payment status',
    );
  });
});
