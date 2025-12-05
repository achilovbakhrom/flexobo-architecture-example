import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { IPushService, PushNotificationPayload } from '../../ports/push-service.port';
import {
  IDeviceTokenRepository,
  DEVICE_TOKEN_REPOSITORY,
} from '../../ports/device-token.repository';

@Injectable()
export class FCMPushService implements IPushService, OnModuleInit {
  private readonly logger = new Logger(FCMPushService.name);
  private app: admin.app.App | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: IDeviceTokenRepository
  ) {}

  async onModuleInit(): Promise<void> {
    const projectId = this.configService.get<string>('FCM_PROJECT_ID');
    const privateKey = this.configService.get<string>('FCM_PRIVATE_KEY');
    const clientEmail = this.configService.get<string>('FCM_CLIENT_EMAIL');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn(
        'FCM credentials not configured. Push notifications will be disabled.'
      );
      return;
    }

    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail,
        }),
      });
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase Admin SDK: ${error}`);
    }
  }

  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    if (!this.app) {
      this.logger.warn('FCM not initialized, skipping push notifications');
      return;
    }

    // Batch query - single DB call instead of N calls
    const tokens = await this.deviceTokenRepository.findByUserIds(userIds);
    const tokenStrings = tokens.map((t) => t.token);

    if (tokenStrings.length === 0) {
      this.logger.debug('No device tokens found for any user');
      return;
    }

    await this.sendToTokens(tokenStrings, payload);
  }

  async sendToAll(payload: PushNotificationPayload): Promise<void> {
    if (!this.app) {
      this.logger.warn('FCM not initialized, skipping broadcast');
      return;
    }

    // Paginate to avoid loading all tokens into memory
    const batchSize = 500; // FCM limit per request
    let offset = 0;
    let totalSent = 0;

    while (true) {
      const tokens = await this.deviceTokenRepository.findPaginated(offset, batchSize);

      if (tokens.length === 0) {
        break;
      }

      await this.sendToTokens(tokens.map((t) => t.token), payload);
      totalSent += tokens.length;
      offset += batchSize;

      // If we got fewer than batchSize, we've reached the end
      if (tokens.length < batchSize) {
        break;
      }
    }

    if (totalSent === 0) {
      this.logger.debug('No device tokens found for broadcast');
    } else {
      this.logger.log(`Broadcast sent to ${totalSent} device tokens`);
    }
  }

  async sendToTokens(
    tokens: string[],
    payload: PushNotificationPayload
  ): Promise<void> {
    if (!this.app || tokens.length === 0) {
      return;
    }

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl,
      },
      data: payload.data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          icon: '/icon-192x192.png',
        },
      },
    };

    try {
      const response = await admin.messaging(this.app).sendEachForMulticast(message);

      this.logger.log(
        `Push notification sent: ${response.successCount} successful, ${response.failureCount} failed`
      );

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];

        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const error = resp.error;
            if (
              error?.code === 'messaging/invalid-registration-token' ||
              error?.code === 'messaging/registration-token-not-registered'
            ) {
              failedTokens.push(tokens[idx]);
            }
          }
        });

        // Remove invalid tokens
        for (const token of failedTokens) {
          try {
            await this.deviceTokenRepository.deleteByToken(token);
            this.logger.debug(`Removed invalid token: ${token.substring(0, 20)}...`);
          } catch (error) {
            this.logger.error(`Failed to remove invalid token: ${error}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to send push notifications: ${error}`);
    }
  }
}
