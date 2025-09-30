
import { useState, useEffect } from "react";
import { useSocket } from "@/hooks/use-socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Wrench, Phone, MapPin, Clock, AlertCircle, Video, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import VideoChat from "@/components/video-chat";

export default function CustomerLogin() {
  const [, setLocation] = useLocation();
  const { socket, isConnected } = useSocket();
  const [step, setStep] = useState<'form' | 'waiting' | 'connected' | 'failed'>('form');
  const [showVideoChat, setShowVideoChat] = useState(false);
  const [callData, setCallData] = useState<any>(null);
  const [location, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    issueDescription: '',
  });

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Identify as customer
    socket.emit('identify', { userType: 'customer', location });

    // Listen for call events
    socket.on('call_searching', (data) => {
      setStep('waiting');
      setCallData(data);
    });

    socket.on('call_accepted', (data) => {
      setStep('connected');
      setCallData(data);
      setShowVideoChat(true);
    });

    socket.on('call_failed', (data) => {
      setStep('failed');
      console.log('Call failed:', data.reason);
    });

    socket.on('call_timeout', (data) => {
      setStep('failed');
      console.log('Call timeout:', data.reason);
    });

    return () => {
      socket.off('call_searching');
      socket.off('call_accepted');
      socket.off('call_failed');
      socket.off('call_timeout');
    };
  }, [socket, isConnected, location]);

  useEffect(() => {
    // Request location on component mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location if permission denied
          setUserLocation({ lat: 40.7128, lng: -74.0060 }); // NYC default
        }
      );
    }
  }, []);

  const handleCallRequest = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location) {
      alert('Location is required to find nearby plumbers');
      return;
    }

    if (!socket || !isConnected) {
      alert('Connection error. Please refresh the page.');
      return;
    }

    socket.emit('initiate_call', {
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      issueDescription: formData.issueDescription,
      location,
    });
  };

  const handleBackToForm = () => {
    setStep('form');
    setCallData(null);
    setShowVideoChat(false);
  };

  if (showVideoChat && callData) {
    return (
      <VideoChat
        isCustomer={true}
        customerSocketId={callData.customerSocketId}
        plumberSocketId={callData.plumberSocketId}
        callId={callData.callId}
        onCallEnd={() => {
          setShowVideoChat(false);
          setStep('form');
          setCallData(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <Wrench className="text-primary text-2xl" />
              <span className="text-xl font-bold text-primary">Instant Plumber Connect</span>
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Left Column - Customer Request Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Get Instant Plumber Help</h1>
              <p className="text-muted-foreground mt-2">
                {step === 'form' 
                  ? 'Connect with a local plumber via video call' 
                  : step === 'waiting'
                  ? 'Searching for available plumbers in your area...'
                  : step === 'connected'
                  ? 'Connected! Your plumber is ready to help.'
                  : 'No plumbers available right now. Please try again.'
                }
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {step === 'form' && <Phone className="w-5 h-5" />}
                  {step === 'waiting' && <Clock className="w-5 h-5 animate-spin" />}
                  {step === 'connected' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {step === 'failed' && <AlertCircle className="w-5 h-5 text-red-500" />}
                  <span>
                    {step === 'form' && 'Request Help'}
                    {step === 'waiting' && 'Finding Plumber...'}
                    {step === 'connected' && 'Connected'}
                    {step === 'failed' && 'No Response'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {step === 'form' && (
                  <form onSubmit={handleCallRequest} className="space-y-4">
                    <div>
                      <Label htmlFor="customerName">Your Name</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                        placeholder="John Smith"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="customerPhone">Phone Number</Label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="issueDescription">Describe Your Issue</Label>
                      <Textarea
                        id="issueDescription"
                        value={formData.issueDescription}
                        onChange={(e) => setFormData(prev => ({ ...prev, issueDescription: e.target.value }))}
                        placeholder="Leaking pipe under kitchen sink..."
                        required
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {location ? 'Location detected' : 'Detecting location...'}
                      </span>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={!location || !isConnected}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Connect with Plumber
                    </Button>
                    
                    <p className="text-sm text-muted-foreground text-center">
                      No registration required • Get help in minutes
                    </p>
                  </form>
                )}

                {step === 'waiting' && (
                  <div className="text-center space-y-4">
                    <div className="animate-pulse">
                      <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                        <Clock className="w-8 h-8 text-primary animate-spin" />
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Connecting you with nearby plumbers...
                    </p>
                    <Badge variant="outline">Expected wait: 30 seconds</Badge>
                    <Button variant="outline" onClick={handleBackToForm} className="w-full">
                      Cancel Request
                    </Button>
                  </div>
                )}

                {step === 'connected' && callData && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Connected to {callData.plumber?.firstName}</h3>
                      <p className="text-muted-foreground">{callData.plumber?.company}</p>
                    </div>
                    <Badge variant="default">Video call starting...</Badge>
                  </div>
                )}

                {step === 'failed' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-muted-foreground">
                      No plumbers are available in your area right now.
                    </p>
                    <div className="space-y-2">
                      <Button onClick={handleBackToForm} className="w-full">
                        Try Again
                      </Button>
                      <Button variant="outline" asChild className="w-full">
                        <Link href="/">Back to Home</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-6">
              <Phone className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold">Emergency Plumber Access</h2>
            <p className="text-lg text-muted-foreground">
              Get instant help from licensed plumbers through secure video calls. Available 24/7 for emergencies.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm">Connect in under 60 seconds</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm">Local plumbers in your area</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Video className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm">Secure video consultation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
