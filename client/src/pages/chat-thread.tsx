import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, User, MessageCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  chatId: string;
  senderId: string;
  senderType: 'customer' | 'plumber';
  content: string;
  messageType: string;
  createdAt: Date;
  // Populated fields
  senderName?: string;
};

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
};

export default function ChatThread() {
  const params = useParams();
  const chatId = params.id;
  const { user } = useAuth();
  const { socket } = useSocket();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch chat details
  const { data: chat, isLoading: chatLoading, error: chatError } = useQuery<Chat>({
    queryKey: ['/api/chats', chatId],
    enabled: !!user && !!chatId,
  });

  // Fetch messages
  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['/api/chats', chatId, 'messages'],
    enabled: !!user && !!chatId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/chats/${chatId}/messages`, {
        content,
        messageType: 'text'
      });
      return await res.json();
    },
    onSuccess: (newMessage) => {
      // Optimistically update the cache
      queryClient.setQueryData(['/api/chats', chatId, 'messages'], (oldMessages: Message[] = []) => [
        ...oldMessages,
        newMessage
      ]);
      
      // Update inbox
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
      
      setNewMessage("");
      scrollToBottom();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Join chat room and listen for messages
  useEffect(() => {
    if (socket && chatId && user) {
      console.log('Joining chat room:', chatId);
      socket.emit('join_chat', { chatId });

      // Listen for new messages
      const handleNewMessage = (data: { chatId: string; message: Message }) => {
        if (data.chatId === chatId) {
          console.log('Received new message:', data.message);
          
          // Update messages cache
          queryClient.setQueryData(['/api/chats', chatId, 'messages'], (oldMessages: Message[] = []) => {
            // Avoid duplicates by checking if message already exists
            if (oldMessages.some(msg => msg.id === data.message.id)) {
              return oldMessages;
            }
            return [...oldMessages, data.message];
          });
          
          // Update inbox
          queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
          
          scrollToBottom();
        }
      };

      socket.on('new_message', handleNewMessage);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.emit('leave_chat', { chatId });
      };
    }
  }, [socket, chatId, user]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(newMessage.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">Please log in to access chat.</p>
            <Link href="/auth">
              <Button className="mt-4">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (chatLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="border-b p-4">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-full max-w-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (chatError || !chat) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2" data-testid="error-heading">Chat Not Found</h2>
            <p className="text-muted-foreground" data-testid="error-message">
              This conversation doesn't exist or you don't have access to it.
            </p>
            <Link href={user.company ? "/chats" : "/customer/chats"}>
              <Button className="mt-4" data-testid="button-back-to-inbox">
                Back to Conversations
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine the other person's name
  const isPlumber = !!user.company;
  const otherPersonName = isPlumber 
    ? chat.customerName || 'Customer'
    : chat.plumberName || 'Plumber';
  
  const inboxPath = isPlumber ? "/chats" : "/customer/chats";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href={inboxPath}>
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            
            <Avatar>
              <AvatarFallback>
                {otherPersonName.split(' ')
                  .map(name => name.charAt(0).toUpperCase())
                  .join('') || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h1 className="text-lg font-semibold" data-testid="heading-chat-with">
                {otherPersonName}
              </h1>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={chat.status === 'active' ? 'default' : 'secondary'}
                  data-testid="badge-chat-status"
                >
                  {chat.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Started {formatDistanceToNow(new Date(chat.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4">
            {messagesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-16 w-full max-w-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2" data-testid="empty-messages-heading">
                  Start the conversation
                </h3>
                <p className="text-muted-foreground" data-testid="empty-messages-message">
                  Send your first message to begin chatting.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isOwnMessage = message.senderId === user.id;
                  const senderName = message.senderName || 
                    (message.senderType === 'customer' ? 'Customer' : 'Plumber');
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex space-x-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${message.id}`}
                    >
                      {!isOwnMessage && (
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-sm">
                            {senderName.split(' ')
                              .map(name => name.charAt(0).toUpperCase())
                              .join('') || <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'order-1' : 'order-2'}`}>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs text-muted-foreground" data-testid={`sender-name-${message.id}`}>
                            {isOwnMessage ? 'You' : senderName}
                          </span>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span data-testid={`message-time-${message.id}`}>
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        
                        <div
                          className={`rounded-lg px-3 py-2 text-sm ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p data-testid={`message-content-${message.id}`}>
                            {message.content}
                          </p>
                        </div>
                      </div>
                      
                      {isOwnMessage && (
                        <Avatar className="w-8 h-8 order-2">
                          <AvatarFallback className="text-sm">
                            {user.firstName?.charAt(0)?.toUpperCase() || 
                             user.lastName?.charAt(0)?.toUpperCase() || 
                             <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Message Input */}
      <div className="border-t bg-card">
        <div className="max-w-4xl mx-auto p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="flex-1 min-h-[60px] resize-none"
              disabled={sendMessageMutation.isPending}
              data-testid="input-message"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="px-4"
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}