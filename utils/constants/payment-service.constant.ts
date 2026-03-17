export const PAYMENT_SERVICE = {
  NAME: 'PAYMENT_SERVICE',
  ACTIONS: {
    GENERATE_INDIVIDUAL_KHQR: { cmd: 'generate-individual-khqr' },
    GENERATE_MERCHANT_KHQR: { cmd: 'generate-merchant-khqr' },
    VERIFY_KHQR: { cmd: 'verify-khqr' },
    DECODE_KHQR: { cmd: 'decode-khqr' },
    KHQR_GENERATE: { cmd: 'khqr-generate' },
    GENERATE_DEEP_LINK: { cmd: 'generate-deep-link' },
    CHECK_PAYMENT_STATUS: { cmd: 'check-payment-status' },
    CHECK_PAYMENT_BULK_STATUS: { cmd: 'check-payment-bulk-status' },
    GET_PAYMENT_INFO: { cmd: 'get-payment-information' },
    GET_KHQR_INFO: { cmd: 'get-khqr-information' },
    GENERATE_MD5_HASH: { cmd: 'generate-md5' },
  },
};
