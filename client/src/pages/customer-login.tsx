import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, MessageSquare, Clock, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function CustomerLogin() {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    location: '',
    issue: '',
    code: ''
  });

  const handleRequestCall = (e: React.FormEvent) => {
    e.preventDefault();
    // This would connect to the call system
    console.log("Customer requesting call:", formData);
    setStep('code');
  };

  const handleVerifyCall = (e: React.FormEvent) => {
    e.preventDefault();
    // This would verify and connect to plumber
    console.log("Connecting customer to plumber with code:", formData.code);
  };

  const updateForm = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <Phone className="text-primary text-2xl" />
              <span className="text-xl font-bold text-primary">Instant Plumber Connect</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/plumber/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Plumber Login
              </Link>
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                ← Back to Home
              </Link>
            </div>
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
                {step === 'phone' 
                  ? 'Connect with a local plumber via video call' 
                  : 'Connecting you with available plumbers...'
                }
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  {step === 'phone' ? 'Request Video Call' : 'Waiting for Plumber'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {step === 'phone' ? (
                  <form onSubmit={handleRequestCall} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => updateForm("firstName", e.target.value)}
                          placeholder="John"
                          required
                          data-testid="input-first-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => updateForm("lastName", e.target.value)}
                          placeholder="Doe"
                          required
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => updateForm("phoneNumber", e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        required
                        data-testid="input-phone-number"
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Your Location</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => updateForm("location", e.target.value)}
                        placeholder="123 Main St, City, State"
                        required
                        data-testid="input-location"
                      />
                    </div>

                    <div>
                      <Label htmlFor="issue">Describe the Issue</Label>
                      <textarea
                        id="issue"
                        className="w-full min-h-[100px] px-3 py-2 border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
                        value={formData.issue}
                        onChange={(e) => updateForm("issue", e.target.value)}
                        placeholder="Leaky faucet in kitchen sink, dripping constantly..."
                        required
                        data-testid="textarea-issue"
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      data-testid="button-request-call"
                    >
                      Connect Me with a Plumber
                    </Button>

                    <p className="text-sm text-muted-foreground text-center">
                      No registration required • Get help in minutes
                    </p>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <h3 className="font-semibold mb-2">Finding Available Plumbers...</h3>
                      <p className="text-sm text-muted-foreground">
                        We're connecting you with qualified plumbers in your area
                      </p>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/50">
                      <h4 className="font-medium mb-2">Your Request:</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                        <p><strong>Phone:</strong> {formData.phoneNumber}</p>
                        <p><strong>Location:</strong> {formData.location}</p>
                        <p><strong>Issue:</strong> {formData.issue}</p>
                      </div>
                    </div>

                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setStep('phone')}
                      className="w-full"
                      data-testid="button-back"
                    >
                      Back to Edit Request
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Customer Benefits */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-50 to-green-50 items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-6">
              <Phone className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold">Instant Plumber Access</h2>
            <p className="text-lg text-muted-foreground">
              Get connected with licensed, local plumbers through video calls. No waiting, no hassle.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm">Available 24/7 for emergencies</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm">Local plumbers in your area</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-sm">Video chat for better diagnosis</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}