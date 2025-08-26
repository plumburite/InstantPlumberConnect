import { useState } from "react";
import NavigationHeader from "@/components/navigation-header";
import HeroSection from "@/components/hero-section";
import VideoChat from "@/components/video-chat";

export default function HomePage() {
  const [currentView, setCurrentView] = useState<'hero' | 'video-chat'>('hero');

  const handleVideoChat = () => {
    setCurrentView('video-chat');
  };

  const handleEndCall = () => {
    setCurrentView('hero');
  };

  return (
    <div className="min-h-screen">
      <NavigationHeader />
      <main className="relative">
        {currentView === 'hero' && (
          <HeroSection onVideoChat={handleVideoChat} />
        )}
        {currentView === 'video-chat' && (
          <VideoChat onEndCall={handleEndCall} />
        )}
      </main>
    </div>
  );
}
