import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Video, VideoOff, Phone, Send, Star } from "lucide-react";

interface VideoChatProps {
  onEndCall: () => void;
}

export default function VideoChat({ onEndCall }: VideoChatProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "Mike",
      text: "I can see the leak clearly. This looks like a loose fitting that needs tightening.",
      timestamp: "Just now",
      isPlumber: true,
    },
    {
      id: 2,
      sender: "You",
      text: "Great! Is this something I can fix myself?",
      timestamp: "1 min ago",
      isPlumber: false,
    },
  ]);

  const sendMessage = () => {
    if (!message.trim()) return;
    
    const newMessage = {
      id: messages.length + 1,
      sender: "You",
      text: message,
      timestamp: "Just now",
      isPlumber: false,
    };
    
    setMessages([...messages, newMessage]);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <section className="min-h-screen bg-secondary p-4" data-testid="video-chat-section">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Main Video Container */}
          <div className="lg:col-span-2 relative">
            <div className="video-container aspect-video mb-4 bg-black rounded-xl overflow-hidden relative">
              {/* Mock video background representing split screen */}
              <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white text-center">
                  <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg opacity-70">Mock Video Chat Interface</p>
                  <p className="text-sm opacity-50">WebRTC integration would go here</p>
                </div>
              </div>
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-12 h-12 rounded-full"
                  onClick={() => setIsMuted(!isMuted)}
                  data-testid="button-toggle-mic"
                >
                  {isMuted ? <MicOff className="text-destructive" /> : <Mic className="text-accent" />}
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="w-12 h-12 rounded-full"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  data-testid="button-toggle-video"
                >
                  {!isVideoOn ? <VideoOff className="text-destructive" /> : <Video className="text-accent" />}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="w-12 h-12 rounded-full"
                  onClick={onEndCall}
                  data-testid="button-end-call"
                >
                  <Phone className="text-destructive-foreground" />
                </Button>
              </div>
            </div>
            
            {/* My Video (Small) - Picture in Picture */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-xl overflow-hidden border-2 border-white/20">
              <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-8 h-8 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-sm">You</span>
                  </div>
                  <p className="text-xs opacity-70">Your camera</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Chat & Info Panel */}
          <Card className="flex flex-col h-[600px]" data-testid="chat-panel">
            <CardContent className="p-6 flex flex-col h-full">
              {/* Plumber Info Header */}
              <div className="border-b border-border pb-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground font-semibold">MP</span>
                  </div>
                  <div>
                    <h4 className="font-semibold" data-testid="text-plumber-name">Mike Peterson</h4>
                    <p className="text-sm text-muted-foreground">Licensed Plumber • 12 years exp.</p>
                    <div className="flex items-center mt-1">
                      <div className="flex text-accent">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground ml-2" data-testid="text-plumber-rating">4.9 (127 reviews)</span>
                    </div>
                  </div>
                  <Badge className="ml-auto bg-accent/10 text-accent border-accent">
                    Online
                  </Badge>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 space-y-3 overflow-y-auto mb-4" data-testid="chat-messages">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-3 max-w-[80%] ${
                      msg.isPlumber
                        ? 'bg-muted mr-auto'
                        : 'bg-primary/10 ml-auto'
                    }`}
                  >
                    <p className="text-sm">
                      <strong>{msg.sender}:</strong> {msg.text}
                    </p>
                    <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                  </div>
                ))}
              </div>
              
              {/* Message Input */}
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                  data-testid="input-message"
                />
                <Button 
                  size="icon"
                  onClick={sendMessage}
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
