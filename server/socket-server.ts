import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { storage } from './storage';
import { insertCallSchema } from '@shared/schema';
import { twilioService } from './twilio-service';

interface ConnectedUser {
  userId?: string;
  userType: 'customer' | 'plumber';
  socketId: string;
  location?: {
    lat: number;
    lng: number;
  };
}

interface CallSession {
  id: string;
  customerId: string;
  plumberId?: string;
  customerSocketId: string;
  plumberSocketId?: string;
  status: 'searching' | 'ringing' | 'active' | 'ended';
  location: {
    lat: number;
    lng: number;
  };
  customerInfo: {
    name: string;
    issue: string;
  };
  startTime: Date;
}

export class SocketServer {
  private io: SocketIOServer;
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private activeCalls: Map<string, CallSession> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: ["http://localhost:5000", "https://*.replit.dev", "https://*.replit.app"],
        methods: ["GET", "POST"],
        credentials: true
      },
      path: '/socket.io/'
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      // Client connected

      // Handle user connection identification
      socket.on('identify', (data: { userType: 'customer' | 'plumber'; userId?: string; location?: { lat: number; lng: number } }) => {
        this.connectedUsers.set(socket.id, {
          userId: data.userId,
          userType: data.userType,
          socketId: socket.id,
          location: data.location,
        });

        // User identified

        // If plumber, join plumber room
        if (data.userType === 'plumber' && data.userId) {
          socket.join(`plumber_${data.userId}`);
          
          // Update plumber location in database if provided
          if (data.location && storage.updatePlumberLocation) {
            storage.updatePlumberLocation(data.userId, data.location.lat, data.location.lng);
          }
        }
      });

      // Handle customer initiating a call
      socket.on('initiate_call', async (data: {
        customerName: string;
        customerPhone: string;
        issueDescription: string;
        location: { lat: number; lng: number };
      }) => {
        try {
          // Customer initiating call

          // Create call session
          const callSession: CallSession = {
            id: `call_${Date.now()}_${socket.id}`,
            customerId: socket.id,
            customerSocketId: socket.id,
            status: 'searching',
            location: data.location,
            customerInfo: {
              name: data.customerName,
              issue: data.issueDescription,
            },
            startTime: new Date(),
          };

          this.activeCalls.set(callSession.id, callSession);

          // Create call record in database
          if (storage.createCallWithLocation) {
            await storage.createCallWithLocation({
              customerName: data.customerName,
              customerPhone: data.customerPhone,
              customerLocation: `${data.location.lat}, ${data.location.lng}`,
              issueDescription: data.issueDescription,
            }, data.location.lat, data.location.lng);
          }

          // Find nearby available plumbers
          let nearbyPlumbers = [];
          if (storage.getNearbyPlumbers) {
            nearbyPlumbers = await storage.getNearbyPlumbers(
              data.location.lat, 
              data.location.lng, 
              50000 // 50km radius
            );
          } else {
            // Fallback to all available plumbers
            nearbyPlumbers = await storage.getAvailablePlumbers();
          }

          console.log(`🔍 Found ${nearbyPlumbers.length} available plumbers`);

          if (nearbyPlumbers.length === 0) {
            socket.emit('call_failed', { reason: 'No plumbers available in your area' });
            this.activeCalls.delete(callSession.id);
            return;
          }

          // Notify customer that we're searching
          socket.emit('call_searching', { callId: callSession.id });

          // Send call notification to nearby plumbers
          nearbyPlumbers.forEach(async (plumber) => {
            // Send socket notification
            this.io.to(`plumber_${plumber.id}`).emit('incoming_call', {
              callId: callSession.id,
              customerName: data.customerName,
              issueDescription: data.issueDescription,
              location: data.location,
              distance: this.calculateDistance(data.location.lat, data.location.lng, 0, 0), // Would use plumber location
            });

            // Send SMS notification if phone number is available
            if (plumber.phoneNumber && twilioService.isReady()) {
              await twilioService.sendPlumberCallNotification(
                plumber.phoneNumber,
                `${plumber.firstName} ${plumber.lastName}`,
                data.customerName,
                data.issueDescription
              );
            }
          });

          // Set timeout for call expiry
          setTimeout(() => {
            const call = this.activeCalls.get(callSession.id);
            if (call && call.status === 'searching') {
              socket.emit('call_timeout', { reason: 'No plumber responded in time' });
              this.activeCalls.delete(callSession.id);
            }
          }, 30000); // 30 second timeout

        } catch (error) {
          console.error('Error initiating call:', error);
          socket.emit('call_failed', { reason: 'Failed to initiate call' });
        }
      });

      // Handle plumber accepting a call
      socket.on('accept_call', async (data: { callId: string; plumberId: string }) => {
        try {
          const call = this.activeCalls.get(data.callId);
          if (!call || call.status !== 'searching') {
            socket.emit('call_accept_failed', { reason: 'Call no longer available' });
            return;
          }

          console.log(`✅ Plumber ${data.plumberId} accepted call ${data.callId}`);

          // Update call session
          call.plumberId = data.plumberId;
          call.plumberSocketId = socket.id;
          call.status = 'ringing';

          // Update call in database
          if (storage.updateCall) {
            await storage.updateCall(data.callId, {
              plumberId: data.plumberId,
              status: 'active',
            });
          }

          // Get plumber info
          const plumber = await storage.getPlumber(data.plumberId);
          
          // Notify customer that plumber accepted
          this.io.to(call.customerSocketId).emit('call_accepted', {
            callId: data.callId,
            plumber: plumber,
            plumberSocketId: socket.id,
            customerSocketId: call.customerSocketId,
          });

          // Notify plumber of successful accept
          socket.emit('call_accept_success', {
            callId: data.callId,
            customerInfo: call.customerInfo,
            customerSocketId: call.customerSocketId,
            plumberSocketId: socket.id,
          });

          // Notify other plumbers that call was taken
          const nearbyPlumbers = await storage.getAvailablePlumbers();
          nearbyPlumbers.forEach((plumber) => {
            if (plumber.id !== data.plumberId) {
              this.io.to(`plumber_${plumber.id}`).emit('call_taken', { callId: data.callId });
            }
          });

        } catch (error) {
          console.error('Error accepting call:', error);
          socket.emit('call_accept_failed', { reason: 'Failed to accept call' });
        }
      });

      // WebRTC Signaling
      socket.on('webrtc_offer', (data: { callId: string; offer: RTCSessionDescriptionInit; to: string }) => {
        // WebRTC offer received
        socket.to(data.to).emit('webrtc_offer', {
          callId: data.callId,
          offer: data.offer,
          from: socket.id,
        });
      });

      socket.on('webrtc_answer', (data: { callId: string; answer: RTCSessionDescriptionInit; to: string }) => {
        // WebRTC answer received
        socket.to(data.to).emit('webrtc_answer', {
          callId: data.callId,
          answer: data.answer,
          from: socket.id,
        });
      });

      socket.on('webrtc_ice_candidate', (data: { callId: string; candidate: RTCIceCandidateInit; to: string }) => {
        socket.to(data.to).emit('webrtc_ice_candidate', {
          callId: data.callId,
          candidate: data.candidate,
          from: socket.id,
        });
      });

      // Handle call end
      socket.on('end_call', async (data: { callId: string }) => {
        try {
          const call = this.activeCalls.get(data.callId);
          if (!call) return;

          // Call ended

          // Update call status
          call.status = 'ended';

          // Update database
          if (storage.updateCall) {
            await storage.updateCall(data.callId, {
              status: 'completed',
              endTime: new Date(),
            });
          }

          // Notify both parties
          if (call.customerSocketId) {
            this.io.to(call.customerSocketId).emit('call_ended', { callId: data.callId });
          }
          if (call.plumberSocketId) {
            this.io.to(call.plumberSocketId).emit('call_ended', { callId: data.callId });
          }

          // Clean up
          this.activeCalls.delete(data.callId);

        } catch (error) {
          console.error('Error ending call:', error);
        }
      });

      // Handle plumber availability updates
      socket.on('update_availability', async (data: { isAvailable: boolean; location?: { lat: number; lng: number } }) => {
        const user = this.connectedUsers.get(socket.id);
        if (user && user.userType === 'plumber' && user.userId) {
          try {
            // Update availability in database
            await storage.updatePlumber(user.userId, { isAvailable: data.isAvailable });
            
            // Update location if provided
            if (data.location && storage.updatePlumberLocation) {
              await storage.updatePlumberLocation(user.userId, data.location.lat, data.location.lng);
              user.location = data.location;
            }

            // Plumber availability updated
          } catch (error) {
            console.error('Error updating availability:', error);
          }
        }
      });

      // Handle location updates
      socket.on('update_location', async (data: { lat: number; lng: number }) => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          user.location = data;
          
          // If plumber, update location in database
          if (user.userType === 'plumber' && user.userId && storage.updatePlumberLocation) {
            await storage.updatePlumberLocation(user.userId, data.lat, data.lng);
          }
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        // Client disconnected
        
        // Clean up active calls
        for (const [callId, call] of Array.from(this.activeCalls.entries())) {
          if (call.customerSocketId === socket.id || call.plumberSocketId === socket.id) {
            // End the call
            if (call.customerSocketId && call.customerSocketId !== socket.id) {
              this.io.to(call.customerSocketId).emit('call_ended', { callId, reason: 'Connection lost' });
            }
            if (call.plumberSocketId && call.plumberSocketId !== socket.id) {
              this.io.to(call.plumberSocketId).emit('call_ended', { callId, reason: 'Connection lost' });
            }
            this.activeCalls.delete(callId);
          }
        }

        // Remove from connected users
        this.connectedUsers.delete(socket.id);
      });
    });
  }

  // Helper method to calculate distance between two coordinates
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in kilometers
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Public method to send notifications to all available plumbers
  public notifyAvailablePlumbers(message: string, data?: any) {
    this.connectedUsers.forEach((user, socketId) => {
      if (user.userType === 'plumber' && user.userId) {
        this.io.to(socketId).emit(message, data);
      }
    });
  }

  // Get connected users stats
  public getStats() {
    const customers = Array.from(this.connectedUsers.values()).filter(u => u.userType === 'customer').length;
    const plumbers = Array.from(this.connectedUsers.values()).filter(u => u.userType === 'plumber').length;
    const activeCalls = this.activeCalls.size;
    
    return { customers, plumbers, activeCalls };
  }
}