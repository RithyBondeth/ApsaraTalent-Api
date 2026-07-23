import 'reflect-metadata';
import { PaymentController } from './payment-service.controller';

describe('Payment-service RPC controller', () => {
  it('delegates every supported payment action', async () => {
    const methods = [
      'generateIndividualKhqrDTO',
      'generateMerchantKhqrDTO',
      'verifyKhqr',
      'decodeKhqr',
      'generateDeepLink',
      'checkPaymentStatus',
      'checkPaymentBulkStatus',
    ];
    const service = Object.fromEntries(
      methods.map((method) => [
        method,
        jest.fn().mockResolvedValue({ success: true }),
      ]),
    ) as Record<string, jest.Mock>;
    const controller = new PaymentController(service as any);
    const controllerMethods = [
      'generateIndividualQr',
      'generateMerchantQr',
      'verifyKhqr',
      'decodeKhqr',
      'generateDeepLink',
      'checkPaymentStatus',
      'checkPaymentBulkStatus',
    ];
    for (let index = 0; index < controllerMethods.length; index++) {
      const dto = { value: index } as any;
      await (controller as any)[controllerMethods[index]](dto);
      expect(service[methods[index]]).toHaveBeenCalledWith(dto);
    }
  });
});
