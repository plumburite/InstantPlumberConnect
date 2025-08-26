import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Video, Shield, Clock, Star, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/use-socket";

interface HeroSectionProps {
  onVideoChat: () => void;
}

export default function HeroSection({ onVideoChat }: HeroSectionProps) {
  const [locationGranted, setLocationGranted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const { toast } = useToast();
  const { initiateCall, isConnected, activeCalls } = useSocket();

  // Listen for call status changes
  useEffect(() => {
    if (activeCalls.size > 0) {
      const callEntries = Array.from(activeCalls.values());
      const acceptedCall = callEntries.find(call => call.status === 'accepted');
      
      if (acceptedCall && isConnecting) {
        console.log('📹 Call accepted, starting video chat:', acceptedCall);
        setIsConnecting(false);
        onVideoChat();
      }
    }
  }, [activeCalls, isConnecting, onVideoChat]);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLocationGranted(true);
          toast({
            title: "Location granted",
            description: "We can now find plumbers near you!",
          });
        },
        (error) => {
          toast({
            title: "Location required",
            description: "Location access is needed to find nearby plumbers.",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
    }
  };

  const startConnection = () => {
    if (!userLocation) {
      toast({
        title: "Location required",
        description: "Please share your location to find nearby plumbers.",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: "Connection error",
        description: "Unable to connect to the service. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    initiateCall({
      customerName: "Guest Customer",
      issueDescription: "Emergency plumbing assistance needed",
      location: userLocation,
    });
  };

  return (
    <section className="relative min-h-screen flex items-center">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
      <div className="absolute inset-0 bg-background/10" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Emergency Plumber <br/>
            <span className="text-primary">In Minutes</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Connect instantly with local licensed plumbers via video chat. Get help now, no appointments needed.
          </p>
          
          <div className="space-y-8">
            {!locationGranted && (
              <Card className="glass-effect max-w-md mx-auto" data-testid="card-location-request">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="text-2xl text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">Find Nearby Plumbers</h3>
                    <p className="text-muted-foreground">We need your location to connect you with the closest available plumber</p>
                    <Button 
                      onClick={requestLocation} 
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      data-testid="button-share-location"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Share My Location
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {locationGranted && !isConnecting && (
              <div className="slide-in" data-testid="connect-section">
                <Button 
                  onClick={startConnection}
                  size="lg"
                  className="bg-accent text-accent-foreground px-12 py-4 text-xl font-semibold hover:bg-accent/90 transition-all transform hover:scale-105 shadow-lg"
                  data-testid="button-connect-plumber"
                >
                  <Video className="w-6 h-6 mr-3" />
                  Connect with Plumber Now
                </Button>
              </div>
            )}
            
            {isConnecting && (
              <Card className="glass-effect max-w-md mx-auto" data-testid="card-finding-plumber">
                <CardContent className="pt-6">
                  <div className="text-center space-y-4">
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 bg-accent rounded-full pulse-ring"></div>
                      <div className="relative w-20 h-20 bg-accent rounded-full flex items-center justify-center">
                        <Search className="text-2xl text-accent-foreground animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold">Finding Available Plumber...</h3>
                    <p className="text-muted-foreground">Connecting you with the nearest professional</p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-accent h-2 rounded-full animate-pulse" style={{width: '60%'}} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Trust Indicators */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center" data-testid="trust-licensed">
              <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="text-accent text-xl" />
              </div>
              <h4 className="font-semibold mb-2">Licensed & Insured</h4>
              <p className="text-muted-foreground text-sm">All plumbers verified and background checked</p>
            </div>
            <div className="text-center" data-testid="trust-available">
              <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Clock className="text-primary text-xl" />
              </div>
              <h4 className="font-semibold mb-2">24/7 Available</h4>
              <p className="text-muted-foreground text-sm">Emergency help any time of day or night</p>
            </div>
            <div className="text-center" data-testid="trust-rated">
              <div className="w-12 h-12 mx-auto bg-accent/10 rounded-full flex items-center justify-center mb-4">
                <Star className="text-accent text-xl" />
              </div>
              <h4 className="font-semibold mb-2">Highly Rated</h4>
              <p className="text-muted-foreground text-sm">Average 4.8/5 star customer rating</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
