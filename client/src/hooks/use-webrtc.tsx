import { useState, useEffect, useRef, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import { useSocket } from './use-socket';

interface UseWebRTCProps {
  callId: string;
  isInitiator: boolean;
  remoteSocketId: string;
}

interface WebRTCState {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peer: SimplePeer.Instance | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useWebRTC({ callId, isInitiator, remoteSocketId }: UseWebRTCProps) {
  const { socket } = useSocket();
  const [state, setState] = useState<WebRTCState>({
    localStream: null,
    remoteStream: null,
    peer: null,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize WebRTC connection
  const initializeConnection = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      setState(prev => ({ ...prev, localStream: stream }));

      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: false,
        stream: stream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
          ]
        }
      });

      // Peer event handlers
      peer.on('signal', (data) => {
        console.log('📡 Sending WebRTC signal:', data.type);
        if (socket) {
          if (data.type === 'offer') {
            socket.emit('webrtc_offer', {
              callId,
              offer: data,
              to: remoteSocketId,
            });
          } else if (data.type === 'answer') {
            socket.emit('webrtc_answer', {
              callId,
              answer: data,
              to: remoteSocketId,
            });
          }
        }
      });

      peer.on('stream', (remoteStream) => {
        console.log('📺 Received remote stream');
        setState(prev => ({ ...prev, remoteStream }));
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      });

      peer.on('connect', () => {
        console.log('🤝 WebRTC connection established');
        setState(prev => ({ ...prev, isConnected: true, isLoading: false }));
      });

      peer.on('error', (err) => {
        console.error('❌ WebRTC error:', err);
        setState(prev => ({ 
          ...prev, 
          error: err.message || 'WebRTC connection failed',
          isLoading: false 
        }));
      });

      peer.on('close', () => {
        console.log('🔌 WebRTC connection closed');
        setState(prev => ({ ...prev, isConnected: false }));
      });

      setState(prev => ({ ...prev, peer, isLoading: false }));

    } catch (error: any) {
      console.error('❌ Failed to initialize WebRTC:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to access camera/microphone',
        isLoading: false 
      }));
    }
  }, [callId, isInitiator, remoteSocketId, socket]);

  // Handle incoming WebRTC signals
  useEffect(() => {
    if (!socket) return;

    const handleOffer = (data: { callId: string; offer: any; from: string }) => {
      if (data.callId === callId && state.peer && !isInitiator) {
        console.log('📡 Received WebRTC offer');
        state.peer.signal(data.offer);
      }
    };

    const handleAnswer = (data: { callId: string; answer: any; from: string }) => {
      if (data.callId === callId && state.peer && isInitiator) {
        console.log('📡 Received WebRTC answer');
        state.peer.signal(data.answer);
      }
    };

    const handleIceCandidate = (data: { callId: string; candidate: any; from: string }) => {
      if (data.callId === callId && state.peer) {
        console.log('📡 Received ICE candidate');
        state.peer.signal(data.candidate);
      }
    };

    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);

    return () => {
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
    };
  }, [socket, callId, state.peer, isInitiator]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => track.stop());
      }
      if (state.peer) {
        state.peer.destroy();
      }
    };
  }, [state.localStream, state.peer]);

  // Control functions
  const toggleMute = useCallback(() => {
    if (state.localStream) {
      const audioTrack = state.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }, [state.localStream]);

  const toggleVideo = useCallback(() => {
    if (state.localStream) {
      const videoTrack = state.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }, [state.localStream]);

  const endCall = useCallback(() => {
    if (state.localStream) {
      state.localStream.getTracks().forEach(track => track.stop());
    }
    if (state.peer) {
      state.peer.destroy();
    }
    setState({
      localStream: null,
      remoteStream: null,
      peer: null,
      isConnected: false,
      isLoading: false,
      error: null,
    });
  }, [state.localStream, state.peer]);

  return {
    ...state,
    localVideoRef,
    remoteVideoRef,
    initializeConnection,
    toggleMute,
    toggleVideo,
    endCall,
  };
}