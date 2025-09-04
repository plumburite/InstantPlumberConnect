import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Star, Phone, MessageSquare, Wrench, Shield, Users } from "lucide-react";

export default function HomePage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
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
            <Button onClick={handleLogin} size="lg" data-testid="button-login">
              Log In
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Connect with Local Plumbers Instantly
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Get instant video calls with certified plumbers in your area. 
            Manage customers, send SMS notifications, and run your plumbing business efficiently.
          </p>
          <Button onClick={handleLogin} size="lg" className="text-lg px-8 py-3" data-testid="button-get-started">
            Get Started
          </Button>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-6 w-6 text-blue-600" />
                Video Calls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Connect with customers via instant video calls. See the problem firsthand and provide expert advice remotely.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-blue-600" />
                SMS Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Send appointment reminders, service updates, and follow-up messages to customers via SMS.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" />
                Customer Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Complete CRM system to manage customers, services, inventory, invoices, and business operations.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Why Choose Instant Plumber Connect?
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                Location-Based Matching
              </h4>
              <p className="text-gray-600">
                Automatically find and connect with available plumbers in your service area.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                Real-Time Availability
              </h4>
              <p className="text-gray-600">
                Set your availability status and receive instant notifications for new service requests.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Secure & Reliable
              </h4>
              <p className="text-gray-600">
                Built with security in mind, featuring encrypted video calls and secure data handling.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Star className="h-5 w-5 text-green-600" />
                Professional Tools
              </h4>
              <p className="text-gray-600">
                Complete business management suite with invoicing, inventory tracking, and customer records.
              </p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Plumbing Business?
          </h3>
          <p className="text-lg text-gray-600 mb-6">
            Join professional plumbers who are already using our platform to grow their business.
          </p>
          <Button onClick={handleLogin} size="lg" className="text-lg px-8 py-3" data-testid="button-join-now">
            Join Now
          </Button>
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