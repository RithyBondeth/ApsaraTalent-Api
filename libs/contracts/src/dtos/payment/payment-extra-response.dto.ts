export class QrImageResponseDTO {
  image: string;
  format: 'base64' | 'url';
}

export class Md5HashResponseDTO {
  md5Hash: string;
}

/** Raw passthrough response from the Bakong payment-info endpoint. */
export class PaymentInfoResponseDTO {
  [key: string]: any;
}

/** Raw passthrough response from the Bakong KHQR-info endpoint. */
export class KhqrInfoResponseDTO {
  [key: string]: any;
}
