import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import NavigationHeader from "@/components/navigation-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, Clock, Star, User, Calendar, MessageSquare, 
  ExternalLink, RefreshCw 
} from "lucide-react";
import { Link } from "wouter";

export default function CustomerDashboard() {
  const { user } = useAuth();

  // Mock call history data (replace with real API call)
  const { data: callHistory = [] } = useQuery({
    queryKey: ['/api/customer/calls'],
    queryFn: async () => {
      // This would be a real API call
      return [
        {
          id: '1',
          plumberName: 'John Smith',
          company: 'Smith Plumbing LLC',
          date: '2024-01-15',
          time: '2:30 PM',
          duration: '15 minutes',
          issue: 'Kitchen sink leak',
          status: 'completed',
          rating: 5,
          cost: '$125.00'
        },
        {
          id: '2',
          plumberName: 'Sarah Johnson',
          company: 'Quick Fix Plumbing',
          date: '2024-01-10',
          time: '10:15 AM',
          duration: '22 minutes',
          issue: 'Bathroom toilet running',
          status: 'completed',
          rating: 4,
          cost: '$85.00'
        }
      ];
    },
    enabled: false // Disable for now since endpoint doesn't exist
  });

  const { data: profile } = useQuery({
    queryKey: ['/api/customer/profile'],
    queryFn: async () => {
      // Mock profile data
      return {
        totalCalls: 12,
        totalSpent: '$1,245.00',
        averageRating: 4.8,
        memberSince: '2023-08-15'
      };
    },
    enabled: false // Disable for now since endpoint doesn't exist
  });

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="text-muted-foreground">
              Need plumbing help? Connect with a local professional instantly.
            </p>
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link href="/customer/login">
                <Phone className="w-4 h-4 mr-2" />
                Get Emergency Help
              </Link>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Calls</p>
                    <p className="text-2xl font-bold">{profile?.totalCalls || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-2xl font-bold">{profile?.averageRating || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-2xl font-bold">{profile?.totalSpent || '$0'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="text-sm font-semibold">
                      {profile?.memberSince ? new Date(profile.memberSince).toLocaleDateString() : 'Today'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="history" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="history">Call History</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="help">Help</TabsTrigger>
            </TabsList>

            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Recent Service Calls</span>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {callHistory.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
                        <Phone className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">No service calls yet</h3>
                        <p className="text-muted-foreground">Your call history will appear here</p>
                      </div>
                      <Button asChild>
                        <Link href="/customer/login">Make Your First Call</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {callHistory.map((call) => (
                        <Card key={call.id} className="border-l-4 border-l-green-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-semibold">{call.plumberName}</h4>
                                  <Badge variant="outline">{call.company}</Badge>
                                </div>
                                <p className="text-muted-foreground">{call.issue}</p>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <span>{call.date} at {call.time}</span>
                                  <span>{call.duration}</span>
                                  <span className="font-semibold text-foreground">{call.cost}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < call.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {call.rating}/5 stars
                                  </span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  <MessageSquare className="w-4 h-4 mr-2" />
                                  Contact
                                </Button>
                                <Button variant="outline" size="sm">
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  Receipt
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="w-5 h-5" />
                    <span>Profile Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                      <p className="text-lg">{user?.firstName} {user?.lastName}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                      <p className="text-lg">{user?.phoneNumber || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Member Since</Label>
                      <p className="text-lg">
                        {profile?.memberSince ? new Date(profile.memberSince).toLocaleDateString() : 'Today'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Preferred Contact</Label>
                      <p className="text-lg">Phone</p>
                    </div>
                  </div>
                  <Button variant="outline">Edit Profile</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="help" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>How It Works</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-600">1</span>
                        </div>
                        <div>
                          <h4 className="font-medium">Describe Your Issue</h4>
                          <p className="text-sm text-muted-foreground">Tell us what plumbing problem you're facing</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-600">2</span>
                        </div>
                        <div>
                          <h4 className="font-medium">Connect Instantly</h4>
                          <p className="text-sm text-muted-foreground">We'll find an available plumber in your area</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-600">3</span>
                        </div>
                        <div>
                          <h4 className="font-medium">Video Consultation</h4>
                          <p className="text-sm text-muted-foreground">Get expert advice through secure video chat</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Common Issues</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <h4 className="font-medium">Emergency Services</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Burst pipes</li>
                        <li>• Severe leaks</li>
                        <li>• No hot water</li>
                        <li>• Blocked drains</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium">General Repairs</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Faucet repairs</li>
                        <li>• Toilet issues</li>
                        <li>• Pipe maintenance</li>
                        <li>• Installation advice</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Label({ className, children, ...props }: { className?: string; children: React.ReactNode }) {
  return (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`} {...props}>
      {children}
    </label>
  );
}