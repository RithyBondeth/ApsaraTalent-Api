import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios, { AxiosInstance } from 'axios';
import * as QRCode from 'qrcode';
import CryptoJS from 'crypto-js';
import { GenerateIndividualKhqrDTO } from './dtos/generate-individual-khqr.dto';
import { GenerateMerchantKhqrDTO } from './dtos/generate-merchant-khqr.dto';
import { VerifyKhqrDTO } from './dtos/verify-khqr.dto';
import { DecodeKhqrDTO } from './dtos/decode-khqr.dto';
import { GenerateDeepLinkDTO } from './dtos/generate-deeplink.dto';
import { CheckPaymentStatusDTO } from './dtos/check-payment-status.dto';
import { CheckPaymentBulkStatusDTO } from './dtos/check-payment-bulk-status.dto';
import { BAKONG_CONSTANTS } from './constants/bakong.constant';
import {
  BakongQRGenerationException,
  BakongApiConnectionException,
  BakongPaymentNotFoundException,
  BakongConfigurationException,
  BakongQRValidationException,
} from './exceptions/bakong.exceptions';
import {
  Payment,
  PaymentType,
  PaymentStatus,
} from '@app/common/database/entities/payment/payment.entity';
import {
  PaymentTransaction,
  TransactionStatus,
  TransactionType,
  Currency,
} from '@app/common/database/entities/payment/payment-transaction.entity';

@Injectable()
export class PaymentServiceService {
  private readonly logger = new Logger(PaymentServiceService.name);
  private readonly httpClient: AxiosInstance;
  private readonly bakongConfig: any;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
  ) {
    this.bakongConfig = this.configService.get<string>('bakong');

    if (!this.bakongConfig?.developerToken) {
      throw new BakongConfigurationException(
        'Bakong developer token is required',
      );
    }

    this.httpClient = axios.create({
      baseURL: this.bakongConfig.apiBaseUrl,
      timeout: this.bakongConfig.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.bakongConfig.developerToken}`,
      },
    });
  }
  async generateIndividualKhqrDTO(
    generateIndividualKhqrDTO: GenerateIndividualKhqrDTO,
  ): Promise<any> {
    try {
      this.logger.log('Generating individual KHQR code', {
        merchantName: generateIndividualKhqrDTO.merchantName,
      });

      const payload = {
        qr_type: 'individual',
        bakong_account_id: generateIndividualKhqrDTO.bakongAccountId,
        merchant_name: generateIndividualKhqrDTO.merchantName,
        merchant_city: generateIndividualKhqrDTO.merchantCity,
        amount: generateIndividualKhqrDTO.amount,
        currency:
          generateIndividualKhqrDTO.currency ||
          BAKONG_CONSTANTS.DEFAULTS.CURRENCY,
        bill_number: generateIndividualKhqrDTO.billNumber,
        mobile_number: generateIndividualKhqrDTO.mobileNumber,
        store_label: generateIndividualKhqrDTO.storeLabel,
        terminal_label: generateIndividualKhqrDTO.terminalLabel,
        is_static: generateIndividualKhqrDTO.isStatic || false,
      };

      // Remove undefined fields
      Object.keys(payload).forEach(
        (key) => payload[key] === undefined && delete payload[key],
      );

      const response = await this.httpClient.post(
        '/v1/generate_individual_khqr',
        payload,
      );

      if (response.data?.response_code === '00') {
        const qrString = response.data.qr_string;
        const md5Hash = this.generateMD5Hash(qrString);
        const qrImage = await this.generateQRImage(qrString);
        const expiresAt = generateIndividualKhqrDTO.expirationMinutes
          ? new Date(
              Date.now() + generateIndividualKhqrDTO.expirationMinutes * 60000,
            )
          : null;

        // Save payment to database
        const payment = this.paymentRepository.create({
          md5Hash,
          qrString,
          qrImage,
          paymentType: PaymentType.INDIVIDUAL,
          status: PaymentStatus.PENDING,
          bakongAccountId: generateIndividualKhqrDTO.bakongAccountId,
          merchantName: generateIndividualKhqrDTO.merchantName,
          merchantCity: generateIndividualKhqrDTO.merchantCity,
          amount: generateIndividualKhqrDTO.amount,
          currency:
            (generateIndividualKhqrDTO.currency as Currency) || Currency.KHR,
          billNumber: generateIndividualKhqrDTO.billNumber,
          mobileNumber: generateIndividualKhqrDTO.mobileNumber,
          storeLabel: generateIndividualKhqrDTO.storeLabel,
          terminalLabel: generateIndividualKhqrDTO.terminalLabel,
          isStatic: generateIndividualKhqrDTO.isStatic || false,
          expiresAt,
        });

        const savedPayment = await this.paymentRepository.save(payment);

        return {
          success: true,
          paymentId: savedPayment.id,
          qrString,
          md5Hash,
          qrImage,
          expiresAt,
          message: BAKONG_CONSTANTS.MESSAGES.SUCCESS.QR_GENERATED,
        };
      } else {
        throw new BakongQRGenerationException(
          response.data?.error_message || 'Failed to generate individual KHQR',
          response.data,
        );
      }
    } catch (error) {
      this.logger.error('Failed to generate individual KHQR', (error as Error).message);
      if (error instanceof BakongQRGenerationException) throw error;
      throw new BakongApiConnectionException(
        (error as Error).message || 'Failed to connect to Bakong API',
      );
    }
  }

  async generateMerchantKhqrDTO(
    generateMerchantKhqrDTO: GenerateMerchantKhqrDTO,
  ): Promise<any> {
    try {
      this.logger.log('Generating merchant KHQR code', {
        merchantName: generateMerchantKhqrDTO.merchantName,
      });

      const payload = {
        qr_type: 'merchant',
        bakong_account_id: generateMerchantKhqrDTO.bakongAccountId,
        merchant_name: generateMerchantKhqrDTO.merchantName,
        merchant_city: generateMerchantKhqrDTO.merchantCity,
        amount: generateMerchantKhqrDTO.amount,
        currency:
          generateMerchantKhqrDTO.currency ||
          BAKONG_CONSTANTS.DEFAULTS.CURRENCY,
        bill_number: generateMerchantKhqrDTO.billNumber,
        mobile_number: generateMerchantKhqrDTO.mobileNumber,
        store_label: generateMerchantKhqrDTO.storeLabel,
        terminal_label: generateMerchantKhqrDTO.terminalLabel,
        merchant_id: generateMerchantKhqrDTO.merchantId,
        acquiring_bank: generateMerchantKhqrDTO.acquiringBank,
      };

      // Remove undefined fields
      Object.keys(payload).forEach(
        (key) => payload[key] === undefined && delete payload[key],
      );

      const response = await this.httpClient.post(
        '/v1/generate_merchant_khqr',
        payload,
      );

      if (response.data?.response_code === '00') {
        const qrString = response.data.qr_string;
        const md5Hash = this.generateMD5Hash(qrString);
        const qrImage = await this.generateQRImage(qrString);

        // Save merchant payment to database
        const payment = this.paymentRepository.create({
          md5Hash,
          qrString,
          qrImage,
          paymentType: PaymentType.MERCHANT,
          status: PaymentStatus.PENDING,
          bakongAccountId: generateMerchantKhqrDTO.bakongAccountId,
          merchantName: generateMerchantKhqrDTO.merchantName,
          merchantCity: generateMerchantKhqrDTO.merchantCity,
          amount: generateMerchantKhqrDTO.amount,
          currency:
            (generateMerchantKhqrDTO.currency as Currency) || Currency.KHR,
          billNumber: generateMerchantKhqrDTO.billNumber,
          mobileNumber: generateMerchantKhqrDTO.mobileNumber,
          storeLabel: generateMerchantKhqrDTO.storeLabel,
          terminalLabel: generateMerchantKhqrDTO.terminalLabel,
          merchantId: generateMerchantKhqrDTO.merchantId,
          acquiringBank: generateMerchantKhqrDTO.acquiringBank,
          isStatic: false, // Merchant QRs are typically dynamic
        });

        const savedPayment = await this.paymentRepository.save(payment);

        return {
          success: true,
          paymentId: savedPayment.id,
          qrString,
          md5Hash,
          qrImage,
          message: BAKONG_CONSTANTS.MESSAGES.SUCCESS.QR_GENERATED,
        };
      } else {
        throw new BakongQRGenerationException(
          response.data?.error_message || 'Failed to generate merchant KHQR',
          response.data,
        );
      }
    } catch (error) {
      this.logger.error('Failed to generate merchant KHQR', (error as Error).message);
      if (error instanceof BakongQRGenerationException) throw error;
      throw new BakongApiConnectionException(
        (error as Error).message || 'Failed to connect to Bakong API',
      );
    }
  }

  async verifyKhqr(verifyKhqrDTO: VerifyKhqrDTO): Promise<any> {
    try {
      this.logger.log('Verifying KHQR code');

      const response = await this.httpClient.post('/v1/verify_khqr', {
        qr_string: verifyKhqrDTO.qrString,
      });

      if (response.data?.response_code === '00') {
        return {
          success: true,
          isValid: true,
          qrData: response.data.qr_data,
          message: BAKONG_CONSTANTS.MESSAGES.SUCCESS.QR_VERIFIED,
        };
      } else {
        return {
          success: false,
          isValid: false,
          message:
            response.data?.error_message ||
            BAKONG_CONSTANTS.MESSAGES.ERROR.INVALID_QR,
        };
      }
    } catch (error) {
      this.logger.error('Failed to verify KHQR', (error as Error).message);
      throw new BakongQRValidationException(
        (error as Error).message || 'Failed to verify KHQR code',
      );
    }
  }

  async decodeKhqr(decodeKhqrDTO: DecodeKhqrDTO): Promise<any> {
    try {
      this.logger.log('Decoding KHQR code');

      const response = await this.httpClient.post('/v1/decode_khqr', {
        qr_string: decodeKhqrDTO.qrString,
      });

      if (response.data?.response_code === '00') {
        return {
          success: true,
          decodedData: {
            merchantName: response.data.merchant_name,
            merchantCity: response.data.merchant_city,
            amount: response.data.amount,
            currency: response.data.currency,
            bakongAccountId: response.data.bakong_account_id,
            billNumber: response.data.bill_number,
            mobileNumber: response.data.mobile_number,
            storeLabel: response.data.store_label,
            terminalLabel: response.data.terminal_label,
          },
          message: BAKONG_CONSTANTS.MESSAGES.SUCCESS.QR_DECODED,
        };
      } else {
        throw new BakongQRValidationException(
          response.data?.error_message || 'Failed to decode KHQR',
        );
      }
    } catch (error) {
      this.logger.error('Failed to decode KHQR', (error as Error).message);
      if (error instanceof BakongQRValidationException) throw error;
      throw new BakongApiConnectionException(
        (error as Error).message || 'Failed to connect to Bakong API',
      );
    }
  }

  async generateDeepLink(
    generateDeepLinkDTO: GenerateDeepLinkDTO,
  ): Promise<any> {
    try {
      this.logger.log('Generating payment deep link');

      const response = await this.httpClient.post('/v1/generate_deeplink', {
        qr_string: generateDeepLinkDTO.qrString,
        callback_url: generateDeepLinkDTO.callback,
        app_name: generateDeepLinkDTO.appName,
        app_icon_url: generateDeepLinkDTO.appIconUrl,
      });

      if (response.data?.response_code === '00') {
        return {
          success: true,
          deepLink: response.data.deep_link,
          shortUrl: response.data.short_url,
          qrString: generateDeepLinkDTO.qrString,
          message: BAKONG_CONSTANTS.MESSAGES.SUCCESS.DEEPLINK_GENERATED,
        };
      } else {
        throw new BakongQRGenerationException(
          response.data?.error_message || 'Failed to generate deep link',
        );
      }
    } catch (error) {
      this.logger.error('Failed to generate deep link', (error as Error).message);
      if (error instanceof BakongQRGenerationException) throw error;
      throw new BakongApiConnectionException(
        (error as Error).message || 'Failed to connect to Bakong API',
      );
    }
  }

  async checkPaymentStatus(
    checkPaymentStatusDTO: CheckPaymentStatusDTO,
  ): Promise<any> {
    try {
      this.logger.log('Checking payment status', {
        md5Hash: checkPaymentStatusDTO.md5Hash.substring(0, 8) + '...',
      });

      // First, check our database for the payment
      const payment = await this.paymentRepository.findOne({
        where: { md5Hash: checkPaymentStatusDTO.md5Hash },
        relations: ['transactions'],
      });

      if (!payment) {
        throw new BakongPaymentNotFoundException(checkPaymentStatusDTO.md5Hash);
      }

      // If payment status is already PAID, return from database
      if (payment.status === PaymentStatus.PAID) {
        const latestTransaction = payment.transactions
          .filter((t) => t.status === TransactionStatus.SUCCESS)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

        return {
          success: true,
          paymentId: payment.id,
          paymentStatus: payment.status,
          transactionId: latestTransaction?.transactionId,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: latestTransaction?.paidAt,
          payerInfo: latestTransaction
            ? {
                name: latestTransaction.payerName,
                phone: latestTransaction.payerPhone,
              }
            : null,
          message: BAKONG_CONSTANTS.MESSAGES.SUCCESS.PAYMENT_FOUND,
        };
      }

      // Check with Bakong API for status updates
      const response = await this.httpClient.post('/v1/check_payment_status', {
        md5_hash: checkPaymentStatusDTO.md5Hash,
      });

      if (response.data?.response_code === '00') {
        const paymentData = response.data.payment_data;

        // Update payment status in database
        if (paymentData.status === 'paid') {
          await this.updatePaymentStatus(payment, paymentData);
        }

        return {
          success: true,
          paymentId: payment.id,
          paymentStatus: paymentData.status,
          transactionId: paymentData.transaction_id,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paidAt: paymentData.paid_at,
          payerInfo: {
            name: paymentData.payer_name,
            phone: paymentData.payer_phone,
          },
          message: BAKONG_CONSTANTS.MESSAGES.SUCCESS.PAYMENT_FOUND,
        };
      } else if (response.data?.response_code === '01') {
        // Update payment status to expired if not found
        if (payment.status === PaymentStatus.PENDING) {
          payment.status = PaymentStatus.EXPIRED;
          await this.paymentRepository.save(payment);
        }

        return {
          success: false,
          paymentId: payment.id,
          paymentStatus: 'not_found',
          message: BAKONG_CONSTANTS.MESSAGES.SUCCESS.PAYMENT_NOT_FOUND,
        };
      } else {
        throw new BakongPaymentNotFoundException(checkPaymentStatusDTO.md5Hash);
      }
    } catch (error) {
      this.logger.error('Failed to check payment status', (error as Error).message);
      if (error instanceof BakongPaymentNotFoundException) throw error;
      throw new BakongApiConnectionException(
        (error as Error).message || 'Failed to connect to Bakong API',
      );
    }
  }

  async checkPaymentBulkStatus(
    checkPaymentBulkStatusDTO: CheckPaymentBulkStatusDTO,
  ): Promise<any> {
    try {
      this.logger.log('Checking bulk payment status', {
        count: checkPaymentBulkStatusDTO.md5Hashes.length,
      });

      const response = await this.httpClient.post(
        '/v1/check_payment_bulk_status',
        {
          md5_hashes: checkPaymentBulkStatusDTO.md5Hashes,
        },
      );

      if (response.data?.response_code === '00') {
        const results = response.data.payments.map((payment: any) => ({
          md5Hash: payment.md5_hash,
          status: payment.status,
          transactionId: payment.transaction_id,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: payment.paid_at,
          payerInfo: payment.payer_name
            ? {
                name: payment.payer_name,
                phone: payment.payer_phone,
              }
            : null,
        }));

        return {
          success: true,
          totalChecked: checkPaymentBulkStatusDTO.md5Hashes.length,
          payments: results,
          summary: {
            paid: results.filter((p) => p.status === 'paid').length,
            pending: results.filter((p) => p.status === 'pending').length,
            expired: results.filter((p) => p.status === 'expired').length,
            failed: results.filter((p) => p.status === 'failed').length,
          },
          message: BAKONG_CONSTANTS.MESSAGES.SUCCESS.BULK_CHECK_COMPLETED,
        };
      } else {
        throw new BakongApiConnectionException(
          response.data?.error_message || 'Failed to check bulk payment status',
        );
      }
    } catch (error) {
      this.logger.error('Failed to check bulk payment status', (error as Error).message);
      throw new BakongApiConnectionException(
        (error as Error).message || 'Failed to connect to Bakong API',
      );
    }
  }

  private generateMD5Hash(qrString: string): string {
    return CryptoJS.MD5(qrString).toString();
  }

  private async updatePaymentStatus(
    payment: Payment,
    paymentData: any,
  ): Promise<void> {
    try {
      // Update payment status
      payment.status = PaymentStatus.PAID;
      await this.paymentRepository.save(payment);

      // Create transaction record
      const transaction = this.transactionRepository.create({
        paymentId: payment.id,
        transactionId: paymentData.transaction_id,
        transactionType: TransactionType.PAYMENT,
        status: TransactionStatus.SUCCESS,
        amount: paymentData.amount,
        currency: paymentData.currency as Currency,
        payerName: paymentData.payer_name,
        payerPhone: paymentData.payer_phone,
        payerBankCode: paymentData.payer_bank_code,
        payerAccountId: paymentData.payer_account_id,
        paidAt: paymentData.paid_at
          ? new Date(paymentData.paid_at)
          : new Date(),
        confirmedAt: new Date(),
        bakongResponse: paymentData,
        referenceNumber: paymentData.reference_number,
        traceNumber: paymentData.trace_number,
      });

      await this.transactionRepository.save(transaction);

      this.logger.log('Payment status updated successfully', {
        paymentId: payment.id,
        transactionId: paymentData.transaction_id,
        status: 'paid',
      });
    } catch (error) {
      this.logger.error('Failed to update payment status', (error as Error).message);
      throw error;
    }
  }

  private async generateQRImage(qrString: string): Promise<string> {
    try {
      const qrImageBase64 = await QRCode.toDataURL(qrString, {
        width: this.bakongConfig.qrImageDefaultWidth,
        margin: BAKONG_CONSTANTS.DEFAULTS.QR_IMAGE_MARGIN,
        color: {
          dark: BAKONG_CONSTANTS.DEFAULTS.QR_DARK_COLOR,
          light: BAKONG_CONSTANTS.DEFAULTS.QR_LIGHT_COLOR,
        },
      });

      return qrImageBase64;
    } catch (error) {
      this.logger.error('Failed to generate QR image', (error as Error).message);
      throw new BakongQRGenerationException(
        (error as Error).message || 'Failed to generate QR code image',
      );
    }
  }
}
