import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Clock, Star, Phone, MessageSquare, Wrench, Shield, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { sendCodeMutation, verifyCodeMutation } = useAuth();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [formData, setFormData] = useState({
    phoneNumber: '',
    firstName: '',
    lastName: '',
    code: ''
  });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Instant Plumber Connect</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Section */}
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Connect with Local Plumbers Instantly
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Get instant video calls with certified plumbers in your area. 
              Manage customers, send SMS notifications, and run your plumbing business efficiently.
            </p>

            {/* Features Grid */}
            <div className="grid gap-6 mb-8">
              <div className="flex items-start gap-3">
                <Phone className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Video Calls</h3>
                  <p className="text-gray-600">Connect with customers via instant video calls</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">SMS Notifications</h3>
                  <p className="text-gray-600">Send appointment reminders and service updates</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-6 w-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900">Customer Management</h3>
                  <p className="text-gray-600">Complete CRM system for your business</p>
                </div>
              </div>
            </div>
          </div>

          {/* SMS Login Form */}
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">
                {step === 'phone' ? 'Get Started' : 'Enter Verification Code'}
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
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        placeholder="John"
                        data-testid="input-first-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        placeholder="Smith"
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
                      onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      placeholder="+1 (555) 123-4567"
                      required
                      data-testid="input-phone-number"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={sendCodeMutation.isPending || !formData.phoneNumber}
                    data-testid="button-send-code"
                  >
                    {sendCodeMutation.isPending ? 'Sending...' : 'Send Verification Code'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div>
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
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
                      {verifyCodeMutation.isPending ? 'Verifying...' : 'Verify & Login'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="mt-16 bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Why Choose Instant Plumber Connect?
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Location-Based</h4>
              <p className="text-gray-600">Find available plumbers in your service area</p>
            </div>
            <div className="text-center">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Real-Time</h4>
              <p className="text-gray-600">Instant notifications for new service requests</p>
            </div>
            <div className="text-center">
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Secure</h4>
              <p className="text-gray-600">SMS authentication and encrypted communications</p>
            </div>
            <div className="text-center">
              <Star className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">Professional</h4>
              <p className="text-gray-600">Complete business management suite</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 Instant Plumber Connect. Professional plumbing services made simple.
          </p>
        </div>
      </footer>
    </div>
  );
}