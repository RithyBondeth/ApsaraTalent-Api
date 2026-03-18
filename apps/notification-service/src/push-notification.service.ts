import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, any> | null;
  /** Sender's avatar URL — shown as the notification icon */
  senderAvatar?: string | null;
};

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: admin.app.App | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const raw = this.configService.get<string>('firebase.serviceAccount');
    if (!raw) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT not set. Push notifications are disabled.',
      );
      return;
    }

    let serviceAccount: admin.ServiceAccount;
    try {
      serviceAccount = JSON.parse(raw);
    } catch (error) {
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf8');
        serviceAccount = JSON.parse(decoded);
      } catch (innerError) {
        this.logger.error(
          'Invalid FIREBASE_SERVICE_ACCOUNT (must be JSON or base64 JSON).',
        );
        return;
      }
    }

    try {
      const projectId =
        (serviceAccount as any).project_id || (serviceAccount as any).projectId;
      const clientEmail =
        (serviceAccount as any).client_email ||
        (serviceAccount as any).clientEmail;
      this.firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
      });
      this.logger.log(
        `Firebase Admin initialized for project ${projectId} with ${clientEmail}`,
      );
    } catch (error: any) {
      if (admin.apps.length > 0) {
        this.firebaseApp = admin.app();
        return;
      }
      this.logger.error(
        `Failed to initialize Firebase: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  private normalizeData(data?: Record<string, any> | null) {
    if (!data) return undefined;
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value == null) continue;
      normalized[key] =
        typeof value === 'string' ? value : JSON.stringify(value);
    }
    return normalized;
  }

  async sendToToken(token: string, payload: PushPayload) {
    if (!token) {
      return { success: false, skipped: true, reason: 'missing token' };
    }
    if (!this.firebaseApp) {
      return {
        success: false,
        skipped: true,
        reason: 'firebase not configured',
      };
    }

    try {
      const normalizedData = this.normalizeData(payload.data);

      // Use sender avatar as the notification icon when available,
      // falling back to the app's default icon.
      const icon = payload.senderAvatar || undefined;

      // tag: group all messages from the same sender into one notification slot.
      // New messages from the same sender replace the previous one instead of stacking.
      const senderId = normalizedData?.senderId;
      const tag = senderId ? `chat-${senderId}` : undefined;

      // Deep-link URL — opens the correct chat thread when the user clicks the notification.
      const link = normalizedData?.url || '/notification';

      const message: admin.messaging.Message = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          ...(icon && { imageUrl: icon }),
        },
        data: normalizedData,
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            ...(icon && { icon }),
            badge: '/icon.svg',
            vibrate: [200, 100, 200],
            // Replace older notification from the same sender instead of stacking
            ...(tag && { tag }),
            renotify: true,
            // Keep on screen until user interacts (doesn't auto-dismiss)
            requireInteraction: true,
            data: { ...normalizedData, url: link },
          },
          fcmOptions: {
            // Opens this URL when the user clicks the notification
            link,
          },
        },
      };

      const response = await admin.messaging(this.firebaseApp).send(message);
      return { success: true, response };
    } catch (error: any) {
      this.logger.error(
        `Push notification failed: ${error?.message || 'Unknown error'}`,
      );
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }
}
