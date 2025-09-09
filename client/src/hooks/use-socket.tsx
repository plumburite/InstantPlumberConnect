import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from 'socket.io-client';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeCalls: Map<string, any>;
  initiateCall: (data: {
    customerName: string;
    customerPhone: string;
    issueDescription: string;
    location: { lat: number; lng: number };
  }) => void;
  acceptCall: (callId: string) => void;
  endCall: (callId: string) => void;
  updateLocation: (lat: number, lng: number) => void;
  updateAvailability: (isAvailable: boolean, location?: { lat: number; lng: number }) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeCalls, setActiveCalls] = useState<Map<string, any>>(new Map());
  const { user } = useAuth();
  const { toast } = useToast();

  // Initialize socket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${window.location.protocol}//${window.location.host}`;
    
    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling'],
    });

    setSocket(newSocket);

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      setIsConnected(true);
      
      // Identify user type and info
      if (user) {
        // Plumber user
        newSocket.emit('identify', {
          userType: 'plumber',
          userId: user.id,
        });
      } else {
        // Customer user
        newSocket.emit('identify', {
          userType: 'customer',
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      setIsConnected(false);
    });

    // Call event handlers
    newSocket.on('call_searching', (data) => {
      toast({
        title: "Finding plumber...",
        description: "We're connecting you with the nearest available plumber.",
      });
    });

    newSocket.on('call_accepted', (data) => {
      console.log('Call accepted by plumber:', data);
      toast({
        title: "Plumber found!",
        description: `${data.plumber.firstName} ${data.plumber.lastName} has accepted your call.`,
      });
      
      setActiveCalls(prev => {
        const updated = new Map(prev);
        updated.set(data.callId, { 
          ...data, 
          status: 'accepted',
          plumberSocketId: data.plumberSocketId,
          customerSocketId: data.customerSocketId,
        });
        return updated;
      });
    });

    newSocket.on('call_failed', (data) => {
      toast({
        title: "Call failed",
        description: data.reason,
        variant: "destructive",
      });
    });

    newSocket.on('call_timeout', (data) => {
      toast({
        title: "Call timeout",
        description: data.reason,
        variant: "destructive",
      });
    });

    newSocket.on('incoming_call', (data) => {
      toast({
        title: "Incoming Call",
        description: `Customer: ${data.customerName} - Issue: ${data.issueDescription}`,
      });

      setActiveCalls(prev => {
        const updated = new Map(prev);
        updated.set(data.callId, { ...data, status: 'incoming' });
        return updated;
      });
    });

    newSocket.on('call_taken', (data) => {
      setActiveCalls(prev => {
        const updated = new Map(prev);
        updated.delete(data.callId);
        return updated;
      });
    });

    newSocket.on('call_ended', (data) => {
      toast({
        title: "Call ended",
        description: data.reason || "The call has been ended.",
      });

      setActiveCalls(prev => {
        const updated = new Map(prev);
        updated.delete(data.callId);
        return updated;
      });
    });

    newSocket.on('call_accept_success', (data) => {
      console.log('Successfully accepted call:', data);
      toast({
        title: "Call accepted",
        description: `You've accepted the call from ${data.customerInfo.name}.`,
      });
      
      setActiveCalls(prev => {
        const updated = new Map(prev);
        updated.set(data.callId, { 
          ...prev.get(data.callId),
          status: 'accepted',
          customerSocketId: data.customerSocketId,
          plumberSocketId: data.plumberSocketId,
        });
        return updated;
      });
    });

    newSocket.on('call_accept_failed', (data) => {
      toast({
        title: "Failed to accept",
        description: data.reason,
        variant: "destructive",
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, toast]);

  const initiateCall = useCallback((data: {
    customerName: string;
    customerPhone: string;
    issueDescription: string;
    location: { lat: number; lng: number };
  }) => {
    if (socket && isConnected) {
      socket.emit('initiate_call', data);
    }
  }, [socket, isConnected]);

  const acceptCall = useCallback((callId: string) => {
    if (socket && isConnected && user) {
      socket.emit('accept_call', {
        callId,
        plumberId: user.id,
      });
    }
  }, [socket, isConnected, user]);

  const endCall = useCallback((callId: string) => {
    if (socket && isConnected) {
      socket.emit('end_call', { callId });
    }
  }, [socket, isConnected]);

  const updateLocation = useCallback((lat: number, lng: number) => {
    if (socket && isConnected) {
      socket.emit('update_location', { lat, lng });
    }
  }, [socket, isConnected]);

  const updateAvailability = useCallback((isAvailable: boolean, location?: { lat: number; lng: number }) => {
    if (socket && isConnected) {
      socket.emit('update_availability', { isAvailable, location });
    }
  }, [socket, isConnected]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        activeCalls,
        initiateCall,
        acceptCall,
        endCall,
        updateLocation,
        updateAvailability,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}