import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wrench, Shield, Star, Users } from "lucide-react";
import { Link } from "wouter";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    company: "",
    licenseNumber: "",
    serviceRadius: "25",
  });

  // Redirect if already logged in (after hooks)
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(loginForm);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({
      ...registerForm,
      serviceRadius: parseInt(registerForm.serviceRadius),
    });
  };

  const updateLoginForm = (field: keyof typeof loginForm, value: string) => {
    setLoginForm(prev => ({ ...prev, [field]: value }));
  };

  const updateRegisterForm = (field: keyof typeof registerForm, value: string) => {
    setRegisterForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <Wrench className="text-primary text-2xl" />
              <span className="text-xl font-bold text-primary">PlumberConnect</span>
            </Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Left Column - Auth Forms */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Plumber Access</h1>
              <p className="text-muted-foreground mt-2">
                Join our network of professional plumbers
              </p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome Back</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="your@email.com"
                          value={loginForm.email}
                          onChange={(e) => updateLoginForm("email", e.target.value)}
                          required
                          data-testid="input-login-email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="login-password">Password</Label>
                        <Input
                          id="login-password"
                          type="password"
                          value={loginForm.password}
                          onChange={(e) => updateLoginForm("password", e.target.value)}
                          required
                          data-testid="input-login-password"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={loginMutation.isPending}
                        data-testid="button-login-submit"
                      >
                        {loginMutation.isPending ? "Signing in..." : "Sign In to Dashboard"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Join Our Network</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="first-name">First Name</Label>
                          <Input
                            id="first-name"
                            type="text"
                            value={registerForm.firstName}
                            onChange={(e) => updateRegisterForm("firstName", e.target.value)}
                            required
                            data-testid="input-register-firstname"
                          />
                        </div>
                        <div>
                          <Label htmlFor="last-name">Last Name</Label>
                          <Input
                            id="last-name"
                            type="text"
                            value={registerForm.lastName}
                            onChange={(e) => updateRegisterForm("lastName", e.target.value)}
                            required
                            data-testid="input-register-lastname"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="register-email">Email</Label>
                        <Input
                          id="register-email"
                          type="email"
                          value={registerForm.email}
                          onChange={(e) => updateRegisterForm("email", e.target.value)}
                          required
                          data-testid="input-register-email"
                        />
                      </div>
                      <div>
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          type="text"
                          placeholder="Peterson Plumbing LLC"
                          value={registerForm.company}
                          onChange={(e) => updateRegisterForm("company", e.target.value)}
                          required
                          data-testid="input-register-company"
                        />
                      </div>
                      <div>
                        <Label htmlFor="license">License Number</Label>
                        <Input
                          id="license"
                          type="text"
                          value={registerForm.licenseNumber}
                          onChange={(e) => updateRegisterForm("licenseNumber", e.target.value)}
                          required
                          data-testid="input-register-license"
                        />
                      </div>
                      <div>
                        <Label htmlFor="radius">Service Radius (miles)</Label>
                        <Select 
                          value={registerForm.serviceRadius}
                          onValueChange={(value) => updateRegisterForm("serviceRadius", value)}
                        >
                          <SelectTrigger data-testid="select-register-radius">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 miles</SelectItem>
                            <SelectItem value="25">25 miles</SelectItem>
                            <SelectItem value="50">50 miles</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="register-password">Password</Label>
                        <Input
                          id="register-password"
                          type="password"
                          value={registerForm.password}
                          onChange={(e) => updateRegisterForm("password", e.target.value)}
                          required
                          data-testid="input-register-password"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={registerMutation.isPending}
                        data-testid="button-register-submit"
                      >
                        {registerMutation.isPending ? "Creating Account..." : "Create Plumber Account"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right Column - Hero Section */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-background to-accent/10 items-center justify-center p-8">
          <div className="max-w-md text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-primary rounded-full flex items-center justify-center mb-6">
              <Wrench className="w-10 h-10 text-primary-foreground" />
            </div>
            <h2 className="text-3xl font-bold">Join PlumberConnect</h2>
            <p className="text-lg text-muted-foreground">
              Connect with customers instantly via video chat. No more missed calls or scheduling conflicts.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                  <Shield className="w-4 h-4 text-accent" />
                </div>
                <span className="text-sm">Verified customers only</span>
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
                <span className="text-sm">Join 500+ professional plumbers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
