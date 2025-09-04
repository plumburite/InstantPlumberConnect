import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Shield, Star, Users } from "lucide-react";
import { Link } from "wouter";

export default function PlumberLogin() {
  const { sendCodeMutation, verifyCodeMutation, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [formData, setFormData] = useState({
    phoneNumber: '',
    firstName: '',
    lastName: '',
    company: '',
    licenseNumber: '',
    serviceRadius: '25',
    code: ''
  });

  // Redirect if already logged in
  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    sendCodeMutation.mutate({
      phoneNumber: formData.phoneNumber,
      firstName: formData.firstName,
      lastName: formData.lastName
    }, {
      onSuccess: () => setStep('code')
    });
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCodeMutation.mutate({
      phoneNumber: formData.phoneNumber,
      code: formData.code
    });
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
              <Wrench className="text-primary text-2xl" />
              <span className="text-xl font-bold text-primary">Instant Plumber Connect</span>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/customer/login" className="text-muted-foreground hover:text-foreground transition-colors">
                Customer Login
              </Link>
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Left Column - Plumber Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Plumber Login</h1>
              <p className="text-muted-foreground mt-2">
                {step === 'phone' 
                  ? 'Access your plumber dashboard' 
                  : 'Verify your phone number to login'
                }
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  {step === 'phone' ? 'Login / Register' : 'Enter Verification Code'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {step === 'phone' ? (
                  <form onSubmit={handleSendCode} className="space-y-4">
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
                          placeholder="Smith"
                          required
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="company">Company Name</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => updateForm("company", e.target.value)}
                        placeholder="Smith Plumbing LLC"
                        required
                        data-testid="input-company"
                      />
                    </div>

                    <div>
                      <Label htmlFor="license">License Number</Label>
                      <Input
                        id="license"
                        value={formData.licenseNumber}
                        onChange={(e) => updateForm("licenseNumber", e.target.value)}
                        placeholder="PL-12345"
                        required
                        data-testid="input-license"
                      />
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
                      <Label htmlFor="radius">Service Radius</Label>
                      <Select 
                        value={formData.serviceRadius}
                        onValueChange={(value) => updateForm("serviceRadius", value)}
                      >
                        <SelectTrigger data-testid="select-radius">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 miles</SelectItem>
                          <SelectItem value="25">25 miles</SelectItem>
                          <SelectItem value="50">50 miles</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={sendCodeMutation.isPending}
                      data-testid="button-send-code"
                    >
                      {sendCodeMutation.isPending ? 'Sending Code...' : 'Send Verification Code'}
                    </Button>

                    <p className="text-sm text-muted-foreground text-center">
                      Existing plumbers: Just enter your phone number to login
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyCode} className="space-y-4">
                    <div>
                      <Label htmlFor="code">Verification Code</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => updateForm("code", e.target.value)}
                        placeholder="123456"
                        maxLength={6}
                        required
                        data-testid="input-verification-code"
                      />
                      <p className="text-sm text-gray-600 mt-1">
                        Enter the 6-digit code sent to {formData.phoneNumber}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setStep('phone')}
                        className="flex-1"
                        data-testid="button-back"
                      >
                        Back
                      </Button>
                      <Button 
                        type="submit" 
                        className="flex-1"
                        disabled={verifyCodeMutation.isPending || formData.code.length !== 6}
                        data-testid="button-verify-code"
                      >
                        {verifyCodeMutation.isPending ? 'Verifying...' : 'Login to Dashboard'}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-background to-accent/10 items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-primary rounded-full flex items-center justify-center mb-6">
              <Wrench className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold">Professional Plumber Access</h2>
            <p className="text-lg text-muted-foreground">
              Access your dashboard, manage customer calls, and grow your plumbing business.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-accent" />
                </div>
                <span className="text-sm">SMS verification for security</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm">Build your reputation with ratings</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-accent" />
                </div>
                <span className="text-sm">Manage customers and calls</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}