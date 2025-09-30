
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Wrench, LogOut, MessageSquare, BarChart3, ExternalLink } from "lucide-react";

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

  // Determine if user is plumber or customer
  const isPlumber = user && user.company;

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
                
                {isPlumber && (
                  <>
                    <Link href="/crm" className={`text-muted-foreground hover:text-foreground transition-colors ${location === '/crm' ? 'text-foreground font-medium' : ''}`}>
                      CRM
                    </Link>
                    <Link href="/analytics" className={`flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors ${location === '/analytics' ? 'text-foreground font-medium' : ''}`}>
                      <BarChart3 className="w-4 h-4" />
                      <span>Analytics</span>
                    </Link>
                  </>
                )}
                
                <Link href="/chats" className={`flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors ${location?.startsWith('/chats') ? 'text-foreground font-medium' : ''}`} data-testid="nav-messages">
                  <MessageSquare className="w-4 h-4" />
                  <span>Messages</span>
                  {chats.length > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {chats.length}
                    </Badge>
                  )}
                </Link>
                
                {!isPlumber && (
                  <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/customer/login">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Get Help
                    </Link>
                  </Button>
                )}
                
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
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90" data-testid="button-emergency">
                  <Link href="/customer/login">
                    Emergency Help
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
