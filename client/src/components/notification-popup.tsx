import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Clock, MapPin, User, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CallNotification {
  id: string;
  callId: string;
  customerName: string;
  issueDescription: string;
  location: {
    lat: number;
    lng: number;
  };
  distance?: string;
  timestamp: Date;
}

interface NotificationPopupProps {
  notification: CallNotification | null;
  onAccept: (callId: string) => void;
  onDecline: (callId: string) => void;
  onDismiss: () => void;
}

export function NotificationPopup({ notification, onAccept, onDecline, onDismiss }: NotificationPopupProps) {
  const [timeLeft, setTimeLeft] = useState(30); // 30 second timer

  useEffect(() => {
    if (!notification) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [notification, onDismiss]);

  useEffect(() => {
    if (notification) {
      setTimeLeft(30); // Reset timer when new notification appears
    }
  }, [notification]);

  if (!notification) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: -50 }}
        className="fixed top-4 right-4 z-50 w-96"
      >
        <Card className="border-2 border-orange-500 shadow-2xl bg-white dark:bg-gray-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-full">
                  <Phone className="h-5 w-5 text-orange-600 animate-pulse" />
                </div>
                <CardTitle className="text-lg font-bold text-orange-600">
                  New Plumbing Call!
                </CardTitle>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {timeLeft}s
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Customer Info */}
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-500" />
              <span className="font-semibold">{notification.customerName}</span>
            </div>

            {/* Issue Description */}
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">Issue:</p>
                <p className="text-sm text-muted-foreground">{notification.issueDescription}</p>
              </div>
            </div>

            {/* Location */}
            {notification.distance && (
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-green-500" />
                <span className="text-sm">{notification.distance} away</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button
                onClick={() => onAccept(notification.callId)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-accept-call"
              >
                <Phone className="h-4 w-4 mr-2" />
                Accept Call
              </Button>
              <Button
                onClick={() => onDecline(notification.callId)}
                variant="outline"
                className="flex-1"
                data-testid="button-decline-call"
              >
                Decline
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-orange-500 h-2 rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / 30) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}