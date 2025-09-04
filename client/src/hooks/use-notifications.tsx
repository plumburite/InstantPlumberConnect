import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface NotificationContextType {
  requestPermission: () => Promise<boolean>;
  isSupported: boolean;
  permission: NotificationPermission;
  showNotification: (title: string, options?: NotificationOptions) => void;
  playNotificationSound: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported] = useState('Notification' in window);

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support push notifications.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: "Notifications enabled",
          description: "You'll receive alerts for new plumbing calls.",
        });
        return true;
      } else {
        toast({
          title: "Notifications disabled",
          description: "Enable notifications to receive call alerts.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Notification error",
        description: "Failed to request notification permission.",
        variant: "destructive",
      });
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      // Fallback to toast notification
      toast({
        title: title,
        description: options?.body,
      });
      return;
    }

    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'plumber-call',
      requireInteraction: true,
      ...options,
    });

    // Auto close after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  };

  const playNotificationSound = () => {
    // Create audio element for notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwjBjaN1/LNeSsFJHfG8N2QQAoUXrPq6qhVFApGnt/yv2wjBjaN1fPNeSsFJHfH8N2QQAoUXrPq6qhVFApGnt/yv2wjBjaN1fPNeSsFJHbH8N+QQAoUXbPr6qhVFApGnt/yv2wjBjaN1fPNeSsFJHbH8N+QQAoUXbPr6qhVFApGnt/yv2wjBjWN1fPNeSsFJHbH8N+QQAoUXbPr6qhVFApGnt/yv2wjBjWN1fPNeSsFJHbH8N+QQAoUXbPr6qhVFApGnt/yv2wjBjWN1fPNeSsFJHbH8N+QQAoUXbPr6qhVFApGnt/yv2wjBjWN1fPNeSsFJHbH8N+QQAoUXbPr6qhVFApGnt/yv2wjBjWN1fPNeSsFJHbH8N+QQAoUXbPr6qhVFApGnt/yv2wjBjWN1fPNeSsFJHbH8N+QQAoUXbPr6qhVFApGnt/yv2wjBjWN1fPNeSsFJHbH8N+QQAoUXbPr6qhVFA==');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Silently fail if audio can't play
    });
  };

  return (
    <NotificationContext.Provider
      value={{
        requestPermission,
        isSupported,
        permission,
        showNotification,
        playNotificationSound,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}