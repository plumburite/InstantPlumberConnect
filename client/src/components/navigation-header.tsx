import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Wrench, LogOut, MessageSquare } from "lucide-react";

export default function NavigationHeader() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  // Fetch user's chats for badge count
  const { data: chats = [] } = useQuery({
    queryKey: ['/api/chats'],
    enabled: !!user,
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <Wrench className="text-primary text-2xl" />
            <span className="text-xl font-bold text-primary">PlumberConnect</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/dashboard" className={`text-muted-foreground hover:text-foreground transition-colors ${location === '/dashboard' ? 'text-foreground font-medium' : ''}`}>
                  Dashboard
                </Link>
                <Link href="/crm" className={`text-muted-foreground hover:text-foreground transition-colors ${location === '/crm' ? 'text-foreground font-medium' : ''}`}>
                  CRM
                </Link>
                <Link href="/chats" className={`flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors ${location?.startsWith('/chats') ? 'text-foreground font-medium' : ''}`} data-testid="nav-messages">
                  <MessageSquare className="w-4 h-4" />
                  <span>Messages</span>
                  {chats.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {chats.length}
                    </Badge>
                  )}
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                  For Plumbers
                </Link>
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="button-emergency"
                >
                  Emergency Help
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
