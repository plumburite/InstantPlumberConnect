import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import NavigationHeader from "@/components/navigation-header";
import VideoChat from "@/components/video-chat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Phone, DollarSign, Star, Clock, Bell, BellOff, Video } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PlumberDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeCalls, acceptCall: socketAcceptCall, isConnected } = useSocket();
  const [showNotification, setShowNotification] = useState(false);
  const [showVideoChat, setShowVideoChat] = useState(false);

  // Availability toggle mutation
  const availabilityMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const res = await apiRequest("PATCH", "/api/plumber/availability", { isAvailable });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Availability updated",
        description: `You are now ${user?.isAvailable ? 'offline' : 'online'}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get plumber calls
  const { data: calls } = useQuery({
    queryKey: ["/api/plumber/calls"],
    enabled: !!user,
  });

  // Simulate incoming call notification
  useEffect(() => {
    if (user?.isAvailable) {
      const timer = setTimeout(() => {
        setShowNotification(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user?.isAvailable]);

  const handleAvailabilityToggle = (checked: boolean) => {
    availabilityMutation.mutate(checked);
  };

  // Check if there's an accepted call for this plumber
  useEffect(() => {
    if (activeCalls.size > 0) {
      const callEntries = Array.from(activeCalls.values());
      const acceptedCall = callEntries.find(call => 
        call.status === 'accepted' && call.plumberSocketId
      );
      
      if (acceptedCall && !showVideoChat) {
        console.log('📹 Plumber entering video chat:', acceptedCall);
        setShowVideoChat(true);
      }
    }
  }, [activeCalls, showVideoChat]);

  const acceptCall = () => {
    setShowNotification(false);
    toast({
      title: "Call accepted!",
      description: "Connecting you with the customer...",
    });
  };

  const declineCall = () => {
    setShowNotification(false);
    toast({
      title: "Call declined",
      description: "The call has been passed to another plumber.",
    });
  };

  if (!user) return null;

  // Show video chat if there's an active call
  if (showVideoChat) {
    return <VideoChat onEndCall={() => setShowVideoChat(false)} />;
  }

  const initials = `${user.firstName[0]}${user.lastName[0]}`;
  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Dashboard Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-xl font-bold" data-testid="text-user-initials">
                    {initials}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold" data-testid="text-user-name">{fullName}</h2>
                  <p className="text-muted-foreground" data-testid="text-user-company">{user.company}</p>
                  <div className="flex items-center mt-1">
                    <div className="flex text-accent text-sm">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground ml-2" data-testid="text-user-rating">
                      {user.rating} ({user.totalReviews} reviews)
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Availability Toggle */}
              <div className="text-center">
                <div className="flex items-center space-x-3">
                  <Label htmlFor="availability-toggle" className="text-sm font-medium">
                    Available for calls
                  </Label>
                  <Switch
                    id="availability-toggle"
                    checked={user.isAvailable}
                    onCheckedChange={handleAvailabilityToggle}
                    disabled={availabilityMutation.isPending}
                    data-testid="switch-availability"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  You're currently{" "}
                  <span className={`font-medium ${user.isAvailable ? 'text-accent' : 'text-muted-foreground'}`}>
                    {user.isAvailable ? 'online' : 'offline'}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Incoming Calls */}
        {activeCalls.size > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-red-600">🚨 Incoming Emergency Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(activeCalls.values()).map((call) => (
                  <div key={call.callId} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <h3 className="font-semibold">{call.customerName}</h3>
                      <p className="text-sm text-muted-foreground">{call.issueDescription}</p>
                      <p className="text-xs text-muted-foreground">
                        Location: {call.location?.lat?.toFixed(4)}, {call.location?.lng?.toFixed(4)}
                      </p>
                    </div>
                    <Button 
                      onClick={() => socketAcceptCall(call.callId)}
                      className="bg-green-600 hover:bg-green-700"
                      data-testid={`button-accept-call-${call.callId}`}
                    >
                      Accept Call
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary" data-testid="stat-today-calls">12</p>
                  <p className="text-sm text-muted-foreground">Today's Calls</p>
                </div>
                <Phone className="text-primary text-xl" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-accent" data-testid="stat-earnings">$2,450</p>
                  <p className="text-sm text-muted-foreground">This Week</p>
                </div>
                <DollarSign className="text-accent text-xl" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-secondary" data-testid="stat-rating">{user.rating}</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
                <Star className="text-secondary text-xl" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-muted-foreground" data-testid="stat-response-time">2.3m</p>
                  <p className="text-sm text-muted-foreground">Response Time</p>
                </div>
                <Clock className="text-muted-foreground text-xl" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Calls & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Calls */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg" data-testid="call-history-item">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">JD</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Jane Doe</h4>
                    <p className="text-sm text-muted-foreground">Kitchen sink leak repair</p>
                    <p className="text-xs text-muted-foreground">2 hours ago • $95 earned</p>
                  </div>
                  <div className="flex items-center text-accent">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 border border-border rounded-lg" data-testid="call-history-item">
                  <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">RM</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">Robert Miller</h4>
                    <p className="text-sm text-muted-foreground">Toilet installation help</p>
                    <p className="text-xs text-muted-foreground">5 hours ago • $150 earned</p>
                  </div>
                  <div className="flex items-center text-accent">
                    {[1, 2, 3, 4].map((star) => (
                      <Star key={star} className="w-3 h-3 fill-current" />
                    ))}
                    <Star className="w-3 h-3 text-muted" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Notifications Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {showNotification ? (
                <div className="bg-accent/10 border-2 border-accent rounded-lg p-4 space-y-3" data-testid="incoming-call-notification">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center pulse-ring">
                        <Phone className="text-accent-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-accent">Incoming Call Request</h4>
                        <p className="text-sm">Customer needs help with bathroom leak</p>
                        <p className="text-xs text-muted-foreground">Location: 0.8 miles away</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      onClick={acceptCall}
                      className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                      data-testid="button-accept-call"
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                    <Button 
                      onClick={declineCall}
                      variant="outline"
                      className="flex-1"
                      data-testid="button-decline-call"
                    >
                      Decline
                    </Button>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1">
                    <div className="bg-accent h-1 rounded-full animate-pulse" style={{width: '70%'}} />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Auto-decline in 8 seconds</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground" data-testid="no-notifications">
                  <BellOff className="text-2xl mb-2 mx-auto" />
                  <p className="text-sm">No new notifications</p>
                  {user.isAvailable && (
                    <p className="text-xs mt-2">You're online and ready to receive calls!</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
