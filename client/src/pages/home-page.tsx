import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Clock, Star, Phone, MessageSquare, Wrench, Shield, Users, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
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
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Connect with Local Plumbers Instantly
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Whether you need plumbing help or you're a plumber looking for customers, 
            we connect you instantly through video calls.
          </p>
        </div>

        {/* Two-Column Options */}
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Customer Option */}
          <Card className="relative overflow-hidden border-2 hover:border-blue-300 transition-all duration-300 transform hover:scale-105">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-center">I Need a Plumber</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center mb-6">
                Get instant help from licensed plumbers in your area through video calls.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-700">Available 24/7 for emergencies</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-700">Local plumbers in your area</span>
                </div>
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-700">Video chat for better diagnosis</span>
                </div>
              </div>

              <Link href="/customer/login">
                <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700" size="lg">
                  Get Help Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <p className="text-sm text-gray-500 text-center">
                No registration required • Get help in minutes
              </p>
            </CardContent>
          </Card>

          {/* Plumber Option */}
          <Card className="relative overflow-hidden border-2 hover:border-green-300 transition-all duration-300 transform hover:scale-105">
            <CardHeader className="pb-4">
              <div className="w-16 h-16 mx-auto bg-green-600 rounded-full flex items-center justify-center mb-4">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-center">I'm a Plumber</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center mb-6">
                Join our network and connect with customers who need your expertise.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">SMS verification for security</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Star className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">Build your reputation with ratings</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Users className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">Complete CRM system included</span>
                </div>
              </div>

              <Link href="/plumber/login">
                <Button className="w-full mt-6 bg-green-600 hover:bg-green-700" size="lg">
                  Join Network
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <p className="text-sm text-gray-500 text-center">
                Quick SMS verification • Start earning today
              </p>
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