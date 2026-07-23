import { PAYMENT_SERVICE } from '@app/contracts/constants/service-actions/payment-service.constant';
import { rpcCall } from '../../utils/rpc-call';
import { PaymentController } from './payment.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('PaymentController', () => {
  const client = {};
  const controller = new PaymentController(client as any);

  beforeEach(() => {
    jest.clearAllMocks();
    (rpcCall as jest.Mock).mockResolvedValue({ success: true });
  });

  it('forwards every payment command with its expected payload', async () => {
    const dto = { value: 'payload' } as any;
    const calls: Array<[() => Promise<any>, any, any]> = [
      [
        () => controller.generateIndividualQr(dto),
        PAYMENT_SERVICE.ACTIONS.GENERATE_INDIVIDUAL_KHQR,
        dto,
      ],
      [
        () => controller.generateMerchantQr(dto),
        PAYMENT_SERVICE.ACTIONS.GENERATE_MERCHANT_KHQR,
        dto,
      ],
      [
        () => controller.verifyKhqr(dto),
        PAYMENT_SERVICE.ACTIONS.VERIFY_KHQR,
        dto,
      ],
      [
        () => controller.decodeKhqr(dto),
        PAYMENT_SERVICE.ACTIONS.DECODE_KHQR,
        dto,
      ],
      [
        () => controller.generateDeepLink(dto),
        PAYMENT_SERVICE.ACTIONS.GENERATE_DEEP_LINK,
        dto,
      ],
      [
        () => controller.checkPaymentStatus(dto),
        PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_STATUS,
        dto,
      ],
      [
        () => controller.checkPaymentBulkStatus(dto),
        PAYMENT_SERVICE.ACTIONS.CHECK_PAYMENT_BULK_STATUS,
        dto,
      ],
      [
        () => controller.generateMd5Hash(dto),
        PAYMENT_SERVICE.ACTIONS.GENERATE_MD5_HASH,
        dto,
      ],
    ];
    for (const [invoke, action, payload] of calls) {
      await invoke();
      expect(rpcCall).toHaveBeenLastCalledWith(client, action, payload);
    }
  });

  it('wraps QR image format and decodes route parameters', async () => {
    const dto = { qrString: 'qr' } as any;
    await controller.generateQRImage(dto, 'png' as any);
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      PAYMENT_SERVICE.ACTIONS.KHQR_GENERATE,
      {
        body: dto,
        format: 'png',
      },
    );
    await controller.getPaymentInfo('hash');
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      PAYMENT_SERVICE.ACTIONS.GET_PAYMENT_INFO,
      'hash',
    );
    await controller.getKHQRInfo('merchant%20qr');
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      PAYMENT_SERVICE.ACTIONS.GET_KHQR_INFO,
      'merchant qr',
    );
  });
});
