export const PAYMENT_SERVICE = {
    NAME: 'PAYMENT_SERVICE',
    ACTIONS: {
        INDIVIDUAL_GENERATE: { cmd: 'individual-generate' },
        MERCHANT_GENERATE: { cmd: 'merchant-generate' },
        VERIFY_KHQR: { cmd: 'verify-khqr' },
        DECODE_KHQR: { cmd: 'decode-khqr' },
        GET_QR_IMAGE: { cmd: 'qr-image' },
    }
}