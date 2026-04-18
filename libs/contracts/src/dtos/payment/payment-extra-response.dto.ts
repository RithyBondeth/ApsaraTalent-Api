export class QrImageResponseDTO {
  image: string;
  format: 'base64' | 'url';

    constructor(partial: Partial<QrImageResponseDTO>) {
        Object.assign(this, partial);
    }
}

export class Md5HashResponseDTO {
  md5Hash: string;

    constructor(partial: Partial<Md5HashResponseDTO>) {
        Object.assign(this, partial);
    }
}

/** Raw passthrough response from the Bakong payment-info endpoint. */
export class PaymentInfoResponseDTO {
    constructor(partial: Partial<PaymentInfoResponseDTO>) {
        Object.assign(this, partial);
    }

  [key: string]: any;
}

/** Raw passthrough response from the Bakong KHQR-info endpoint. */
export class KhqrInfoResponseDTO {
    constructor(partial: Partial<KhqrInfoResponseDTO>) {
        Object.assign(this, partial);
    }

  [key: string]: any;
}
