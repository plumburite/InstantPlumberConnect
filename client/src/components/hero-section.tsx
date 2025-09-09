import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Video, Shield, Clock, Star, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/use-socket";

interface HeroSectionProps {
  onVideoChat: () => void;
}

export default function HeroSection({ onVideoChat }: HeroSectionProps) {
  const [locationGranted, setLocationGranted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    issue: "",
  });
  const { toast } = useToast();
  const { initiateCall, isConnected, activeCalls } = useSocket();

  // Listen for call status changes
  useEffect(() => {
    if (activeCalls.size > 0) {
      const callEntries = Array.from(activeCalls.values());
      const acceptedCall = callEntries.find(call => call.status === 'accepted');
      
      if (acceptedCall && isConnecting) {
        console.log('Call accepted, starting video chat:', acceptedCall);
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

  const showForm = () => {
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

    setShowCallForm(true);
  };

  const startConnection = () => {
    // Validate form
    if (!customerForm.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    if (!customerForm.phone.trim()) {
      toast({
        title: "Phone required",
        description: "Please enter your phone number for SMS notifications.",
        variant: "destructive",
      });
      return;
    }

    if (!customerForm.issue.trim()) {
      toast({
        title: "Issue description required",
        description: "Please describe your plumbing issue.",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    setShowCallForm(false);
    
    initiateCall({
      customerName: customerForm.name,
      customerPhone: customerForm.phone,
      issueDescription: customerForm.issue,
      location: userLocation!,
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
            
            {locationGranted && !isConnecting && !showCallForm && (
              <div className="slide-in" data-testid="connect-section">
                <Button 
                  onClick={showForm}
                  size="lg"
                  className="bg-accent text-accent-foreground px-12 py-4 text-xl font-semibold hover:bg-accent/90 transition-all transform hover:scale-105 shadow-lg"
                  data-testid="button-connect-plumber"
                >
                  <Video className="w-6 h-6 mr-3" />
                  Connect with Plumber Now
                </Button>
              </div>
            )}

            {showCallForm && (
              <Card className="glass-effect max-w-lg mx-auto" data-testid="card-customer-form">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-semibold">Your Details</h3>
                      <p className="text-muted-foreground">We'll connect you with the nearest available plumber</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="customer-name">Your Name</Label>
                      <Input
                        id="customer-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={customerForm.name}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                        data-testid="input-customer-name"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="customer-phone">Phone Number</Label>
                      <Input
                        id="customer-phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                        data-testid="input-customer-phone"
                      />
                      <p className="text-xs text-muted-foreground mt-1">For SMS notifications about your call</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="customer-issue">Describe Your Issue</Label>
                      <Textarea
                        id="customer-issue"
                        placeholder="e.g., Kitchen sink is leaking under the cabinet"
                        value={customerForm.issue}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, issue: e.target.value }))}
                        rows={3}
                        data-testid="textarea-customer-issue"
                      />
                    </div>
                    
                    <div className="flex space-x-3 pt-2">
                      <Button
                        variant="outline"
                        onClick={() => setShowCallForm(false)}
                        className="flex-1"
                        data-testid="button-cancel-form"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={startConnection}
                        className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                        data-testid="button-submit-call"
                      >
                        <Video className="w-4 h-4 mr-2" />
                        Start Call
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
