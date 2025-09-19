import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageSquare, 
  MapPin, 
  Phone, 
  Clock, 
  User,
  Search,
  Wrench
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

type Chat = {
  id: string;
  customerId: string;
  plumberId: string;
  status: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Populated fields
  customerName?: string;
  plumberName?: string;
  lastMessage?: string;
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { initiateCall, activeCalls, isConnected } = useSocket();
  const [, setLocation] = useLocation();
  
  const [step, setStep] = useState<'search' | 'waiting'>('search');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
    location: '',
    issue: ''
  });

  // Fetch user's chats
  const { data: recentChats = [] } = useQuery<Chat[]>({
    queryKey: ['/api/chats'],
    enabled: !!user,
  });

  // Listen for call status changes
  useEffect(() => {
    if (activeCalls.size > 0) {
      const callEntries = Array.from(activeCalls.values());
      const acceptedCall = callEntries.find(call => call.status === 'accepted');
      
      if (acceptedCall) {
        toast({
          title: "Plumber found!",
          description: "Connecting you to video chat...",
        });
        // Redirect to video chat or chat system
        setLocation('/video-chat');
      }
    }
  }, [activeCalls, toast, setLocation]);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
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
    }
  };

  const handleRequestCall = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userLocation) {
      toast({
        title: "Location required",
        description: "Please share your location to find nearby plumbers.",
        variant: "destructive",
      });
      requestLocation();
      return;
    }

    if (!formData.issue.trim()) {
      toast({
        title: "Issue description required",
        description: "Please describe your plumbing issue.",
        variant: "destructive",
      });
      return;
    }

    // Initiate call through socket
    initiateCall({
      customerName: `${formData.firstName} ${formData.lastName}`.trim() || 'Customer',
      customerPhone: formData.phoneNumber,
      issueDescription: formData.issue,
      location: userLocation,
    });

    setStep('waiting');
    toast({
      title: "Finding plumber...",
      description: "We're connecting you with the nearest available plumber.",
    });
  };

  const handleBackToSearch = () => {
    setStep('search');
  };

  const updateForm = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
            <p className="text-muted-foreground">Access your dashboard and chat with plumbers.</p>
            <Link href="/customer/login">
              <Button className="mt-4">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <Wrench className="text-primary text-2xl" />
              <span className="text-xl font-bold text-primary">Instant Plumber Connect</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/customer/chats">
                <Button variant="ghost" className="flex items-center space-x-2" data-testid="button-messages">
                  <MessageSquare className="h-4 w-4" />
                  <span>Messages</span>
                  {recentChats.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {recentChats.length}
                    </Badge>
                  )}
                </Button>
              </Link>
              <div className="text-sm text-muted-foreground">
                Welcome, {user.firstName || 'Customer'}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        {step === 'search' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Search Section */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Search className="h-5 w-5" />
                    <span>Find a Plumber</span>
                  </CardTitle>
                  <p className="text-muted-foreground">
                    Get connected with nearby plumbers for instant help
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRequestCall} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => updateForm('firstName', e.target.value)}
                          placeholder="Your first name"
                          required
                          data-testid="input-first-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => updateForm('lastName', e.target.value)}
                          placeholder="Your last name"
                          required
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => updateForm('phoneNumber', e.target.value)}
                        placeholder="Your phone number"
                        required
                        data-testid="input-phone"
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Location</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => updateForm('location', e.target.value)}
                          placeholder="Enter your address"
                          required
                          data-testid="input-location"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={requestLocation}
                          data-testid="button-location"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Use Current
                        </Button>
                      </div>
                      {userLocation && (
                        <p className="text-sm text-green-600 mt-1">
                          ✓ Location access granted
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="issue">Describe Your Issue</Label>
                      <Textarea
                        id="issue"
                        value={formData.issue}
                        onChange={(e) => updateForm('issue', e.target.value)}
                        placeholder="What plumbing issue are you facing?"
                        className="min-h-[100px]"
                        required
                        data-testid="input-issue"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!isConnected}
                      data-testid="button-find-plumber"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Find Available Plumber
                    </Button>

                    {!isConnected && (
                      <p className="text-sm text-amber-600 text-center">
                        Connecting to service...
                      </p>
                    )}
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Recent Chats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Recent Conversations</span>
                    </span>
                    {recentChats.length > 0 && (
                      <Link href="/customer/chats">
                        <Button variant="ghost" size="sm" data-testid="button-view-all-chats">
                          View All
                        </Button>
                      </Link>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentChats.length === 0 ? (
                    <div className="text-center py-4">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">No conversations yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentChats.slice(0, 3).map((chat) => (
                        <Link key={chat.id} href={`/customer/chats/${chat.id}`}>
                          <div
                            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            data-testid={`recent-chat-${chat.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">
                                {chat.plumberName || 'Plumber'}
                              </span>
                              <Badge
                                variant={chat.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {chat.status}
                              </Badge>
                            </div>
                            {chat.lastMessageAt && (
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })}
                                </span>
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Help Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How it Works</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Share your location</p>
                      <p className="text-xs text-muted-foreground">We find plumbers near you</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Get matched instantly</p>
                      <p className="text-xs text-muted-foreground">Connect with available plumbers</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Chat and video call</p>
                      <p className="text-xs text-muted-foreground">Discuss your issue in detail</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          // Waiting state
          <div className="max-w-2xl mx-auto text-center py-12">
            <Card>
              <CardContent className="p-8">
                <div className="animate-pulse mb-6">
                  <Search className="h-16 w-16 mx-auto text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-4" data-testid="heading-searching">Finding Your Plumber...</h2>
                <p className="text-muted-foreground mb-6">
                  We're connecting you with the nearest available plumber. This usually takes less than a minute.
                </p>
                
                <div className="space-y-2 mb-6">
                  <div className="text-sm">
                    <strong>Issue:</strong> {formData.issue}
                  </div>
                  <div className="text-sm">
                    <strong>Location:</strong> {formData.location || 'Using current location'}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={handleBackToSearch}
                  data-testid="button-cancel-search"
                >
                  Cancel Search
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}