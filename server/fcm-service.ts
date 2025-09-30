import admin from 'firebase-admin';
import { storage } from './storage';

// Initialize Firebase Admin SDK
let firebaseAdmin: admin.app.App | null = null;

export function initializeFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;

  try {
    // In production, you would load the service account key from environment variables
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : null;

    if (!serviceAccount) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('Firebase Admin SDK not initialized - missing service account key');
      }
      return null;
    }

    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('Firebase Admin SDK initialized');
    return firebaseAdmin;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    return null;
  }
}

export interface NotificationPayload {
  title: string;
  body: string;
  type: 'new_call' | 'call_accepted' | 'call_ended' | 'general';
  data?: Record<string, string>;
}

export class FCMService {
  private messaging: admin.messaging.Messaging | null = null;

  constructor() {
    const app = initializeFirebaseAdmin();
    if (app) {
      this.messaging = admin.messaging(app);
    }
  }

  async sendNotificationToUser(userId: string, payload: NotificationPayload): Promise<boolean> {
    if (!this.messaging) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('FCM not available - Firebase Admin not initialized');
      }
      return false;
    }

    try {
      // Get user's FCM token from database
      const user = await storage.getPlumber(userId);
      if (!user) {
        console.log(`User ${userId} not found`);
        return false;
      }

      // Check if user has FCM token (method might not exist in MemStorage)
      let fcmToken = null;
      if ('searchPlumbers' in storage) {
        // This is a bit of a hack - we need a better way to get FCM token
        // In a real implementation, we'd add a proper method to the storage interface
        const userWithToken = await storage.getPlumber(userId) as any;
        fcmToken = userWithToken?.fcmToken;
      }

      if (!fcmToken) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`No FCM token found for user ${userId}`);
        }
        return false;
      }

      // Prepare the message
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          type: payload.type,
          ...payload.data,
        },
        webpush: {
          notification: {
            title: payload.title,
            body: payload.body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            requireInteraction: payload.type === 'new_call',
          },
        },
      };

      // Add actions for call notifications
      if (payload.type === 'new_call') {
        message.webpush!.notification!.actions = [
          {
            action: 'accept',
            title: 'Accept Call',
          },
          {
            action: 'decline', 
            title: 'Decline',
          },
        ];
      }

      // Send the message
      const response = await this.messaging.send(message);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Notification sent successfully to ${userId}:`, response);
      }
      return true;

    } catch (error: any) {
      console.error(`Error sending notification to ${userId}:`, error);
      
      // Handle invalid token errors
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        // Remove invalid token from database
        if (storage.updatePlumberFCMToken) {
          await storage.updatePlumberFCMToken(userId, '');
        }
      }
      
      return false;
    }
  }

  async sendNotificationToMultipleUsers(userIds: string[], payload: NotificationPayload): Promise<number> {
    const promises = userIds.map(userId => this.sendNotificationToUser(userId, payload));
    const results = await Promise.allSettled(promises);
    
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;

    console.log(`Sent notifications to ${successCount}/${userIds.length} users`);
    return successCount;
  }

  async notifyAvailablePlumbersOfNewCall(callData: {
    callId: string;
    customerName: string;
    issueDescription: string;
    location: { lat: number; lng: number };
  }): Promise<void> {
    try {
      // Get all available plumbers
      const availablePlumbers = await storage.getAvailablePlumbers();
      
      if (availablePlumbers.length === 0) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('No available plumbers to notify');
        }
        return;
      }

      const payload: NotificationPayload = {
        title: 'New Call Request',
        body: `${callData.customerName} needs help: ${callData.issueDescription}`,
        type: 'new_call',
        data: {
          callId: callData.callId,
          customerName: callData.customerName,
          issueDescription: callData.issueDescription,
          latitude: callData.location.lat.toString(),
          longitude: callData.location.lng.toString(),
        },
      };

      const plumberIds = availablePlumbers.map(p => p.id);
      await this.sendNotificationToMultipleUsers(plumberIds, payload);

    } catch (error) {
      console.error('Error notifying plumbers of new call:', error);
    }
  }

  async notifyCustomerOfAcceptedCall(customerId: string, plumberData: {
    id: string;
    firstName: string;
    lastName: string;
    company: string;
  }): Promise<void> {
    // Note: This would require storing customer FCM tokens as well
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Would notify customer ${customerId} that plumber ${plumberData.firstName} ${plumberData.lastName} accepted the call`);
    }
  }

  async notifyParticipantsOfEndedCall(participantIds: string[], callData: {
    callId: string;
    reason?: string;
  }): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Call Ended',
      body: callData.reason || 'The call has been ended',
      type: 'call_ended',
      data: {
        callId: callData.callId,
        reason: callData.reason || 'ended',
      },
    };

    await this.sendNotificationToMultipleUsers(participantIds, payload);
  }
}

// Create singleton instance
export const fcmService = new FCMService();