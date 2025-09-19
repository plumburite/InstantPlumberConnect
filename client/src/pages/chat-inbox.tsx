import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Chat = {
  id: string;
  customerId: string;
  plumberId: string;
  status: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Populated fields
  customerName?: string;
  plumberName?: string;
  lastMessage?: string;
};

export default function ChatInbox() {
  const { user } = useAuth();

  // Fetch user's chats
  const { data: chats = [], isLoading, error } = useQuery<Chat[]>({
    queryKey: ['/api/chats'],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Chat Access Required</h2>
            <p className="text-muted-foreground">
              Please log in to access your conversations.
            </p>
            <Link href="/auth">
              <button className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                Go to Login
              </button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="heading-inbox">Messages</h1>
            <p className="text-muted-foreground">Your active conversations</p>
          </div>
          <Badge variant="secondary" data-testid="badge-chat-count">
            {chats.length} conversation{chats.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-3 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2" data-testid="error-heading">Error Loading Chats</h2>
              <p className="text-muted-foreground" data-testid="error-message">
                Failed to load your conversations. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : chats.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2" data-testid="empty-heading">No Conversations Yet</h2>
              <p className="text-muted-foreground" data-testid="empty-message">
                {user.company ? (
                  "When customers match with you, your conversations will appear here."
                ) : (
                  "When you get matched with a plumber, your conversations will appear here."
                )}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {chats.map((chat) => {
              // Determine the other person's name based on current user
              const isPlumber = !!user.company;
              const otherPersonName = isPlumber 
                ? chat.customerName || 'Customer'
                : chat.plumberName || 'Plumber';
              
              const initials = otherPersonName.split(' ')
                .map(name => name.charAt(0).toUpperCase())
                .join('');
              
              const chatPath = isPlumber ? `/chats/${chat.id}` : `/customer/chats/${chat.id}`;

              return (
                <Link key={chat.id} href={chatPath}>
                  <Card className="transition-colors hover:bg-muted/50 cursor-pointer" data-testid={`chat-card-${chat.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {initials || <User className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm truncate" data-testid={`text-participant-${chat.id}`}>
                              {otherPersonName}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant={chat.status === 'active' ? 'default' : 'secondary'}
                                className="text-xs"
                                data-testid={`badge-status-${chat.id}`}
                              >
                                {chat.status}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-sm text-muted-foreground truncate" data-testid={`text-last-message-${chat.id}`}>
                              {chat.lastMessage || "No messages yet"}
                            </p>
                            
                            {chat.lastMessageAt && (
                              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span data-testid={`text-time-${chat.id}`}>
                                  {formatDistanceToNow(new Date(chat.lastMessageAt), { addSuffix: true })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}