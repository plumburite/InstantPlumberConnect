import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { SocketProvider } from "@/hooks/use-socket";
import { SMSProvider } from "@/hooks/use-sms";
import { NotificationProvider } from "@/hooks/use-notifications";
import { ProtectedRoute } from "./lib/protected-route";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import PlumberLogin from "@/pages/plumber-login";
import CustomerLogin from "@/pages/customer-login";
import PlumberDashboard from "@/pages/plumber-dashboard";
import CrmDashboard from "@/pages/crm-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={HomePage} />
      ) : (
        <>
          <Route path="/" component={PlumberDashboard} />
          <ProtectedRoute path="/dashboard" component={() => <PlumberDashboard />} />
          <ProtectedRoute path="/crm" component={() => <CrmDashboard />} />
        </>
      )}
      <Route path="/auth" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <Route path="/plumber/login" component={PlumberLogin} />
      <Route path="/customer/login" component={CustomerLogin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SocketProvider>
          <SMSProvider>
            <NotificationProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </NotificationProvider>
          </SMSProvider>
        </SocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
